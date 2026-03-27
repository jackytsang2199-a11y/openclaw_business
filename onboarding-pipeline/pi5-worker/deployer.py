"""Orchestrates full customer deployment using Claude Agent SDK.

Architecture:
  - VPS provisioning: subprocess (deterministic Contabo API call)
  - Script installation + QA + debugging: Claude Agent SDK (AI operator)
  - Webhook + notifications: direct API calls (deterministic)

The Agent SDK session gets Bash tool access and follows the CLAUDE.md playbook
as a structured prompt. It can interpret QA output, debug failures, and make
adaptive decisions — this is the "AI is the operator" architecture.
"""

import subprocess
import os
import anyio
from pathlib import Path
from typing import Optional

from api_client import ApiClient
from notifier import Notifier
from playbook import (
    build_deployment_prompt,
    get_system_prompt,
    TIER_SCRIPTS,
    TIER_QA,
)
import config


class Deployer:
    def __init__(
        self,
        api: ApiClient,
        notifier: Notifier,
        install_dir: Path = None,
    ):
        self.api = api
        self.notifier = notifier
        self.install_dir = install_dir or config.OPENCLAW_INSTALL_DIR
        self.ssh_key = str(config.SSH_KEY_PATH)

    def deploy(self, job: dict) -> bool:
        """Run full deployment pipeline. Returns True on success.

        Called from the sync worker loop — uses anyio.run() internally for
        the async Agent SDK session.
        """
        job_id = job["id"]
        tier = job["tier"]
        telegram_user_id = job.get("telegram_user_id", "")

        try:
            # Step 1: Get bot from job data (customer-created)
            bot = self._get_bot_from_job(job)
            if not bot:
                self.api.update_job(job_id, "failed", error_log="No bot_token in job data")
                self.notifier.notify_failed(job_id, "No bot_token in job data")
                return False

            # Send waiting message to customer
            Notifier.send_customer_message(
                bot["token"],
                telegram_user_id,
                "Setting up your AI assistant, please wait approximately 15 minutes... "
                "If you have any questions, contact @NexGenAI_Support_bot or support@3nexgen.com"
            )

            # Step 2: Provision VPS (sync — deterministic API call)
            server_ip = self._provision_vps(job_id, tier)
            if not server_ip:
                self._handle_failure(job_id, bot, telegram_user_id, "VPS provisioning failed")
                return False

            self.api.update_job(job_id, "installing", server_ip=server_ip)

            # Step 3: Run Agent SDK deployment session (async)
            success = anyio.run(
                self._run_agent_deployment,
                job_id, tier, server_ip, bot["token"], telegram_user_id,
            )

            if not success:
                self._handle_failure(job_id, bot, telegram_user_id, "Agent deployment failed — check logs")
                return False

            # Step 4: Set webhook and deliver (sync — deterministic)
            self.api.update_job(job_id, "qa")
            webhook_url = f"https://{server_ip}:18789/webhook"
            Notifier.set_webhook(bot["token"], webhook_url)

            Notifier.send_customer_message(
                bot["token"],
                telegram_user_id,
                "Your AI assistant is ready! Start chatting now."
            )

            self.api.update_job(job_id, "complete")
            self.notifier.notify_complete(job_id)
            return True

        except Exception as e:
            import traceback
            error_msg = str(e)[:500]
            print(f"[deployer] {job_id}: EXCEPTION: {error_msg}")
            traceback.print_exc()
            self.api.update_job(job_id, "failed", error_log=error_msg)
            self.notifier.notify_failed(job_id, error_msg)
            return False

    def _get_bot_from_job(self, job: dict) -> Optional[dict]:
        """Read bot token and username from job data (customer-created bot)."""
        bot_token = job.get("bot_token")
        bot_username = job.get("bot_username")
        if not bot_token:
            return None
        return {"token": bot_token, "username": bot_username or "unknown"}

    async def _run_agent_deployment(
        self,
        job_id: str,
        tier: int,
        server_ip: str,
        bot_token: str,
        telegram_user_id: str,
    ) -> bool:
        """Launch Claude Agent SDK session to execute the CLAUDE.md playbook.

        Returns True if the agent outputs DEPLOYMENT_SUCCESS, False otherwise.
        """
        from claude_code_sdk import query, ClaudeCodeOptions, ResultMessage

        # Build client.env content (never written to disk until the agent does it)
        client_env = (
            f"CLIENT_ID={job_id}\n"
            f"TIER={tier}\n"
            f"DEEPSEEK_API_KEY={config.DEEPSEEK_API_KEY}\n"
            f"OPENAI_API_KEY={config.OPENAI_API_KEY}\n"
            f"TELEGRAM_BOT_TOKEN={bot_token}\n"
            f"TELEGRAM_ALLOWED_USERS={telegram_user_id}\n"
        )

        prompt = build_deployment_prompt(
            job_id=job_id,
            tier=tier,
            server_ip=server_ip,
            ssh_key_path=self.ssh_key,
            install_dir=str(self.install_dir),
            client_env_content=client_env,
        )

        system_prompt = get_system_prompt(self.ssh_key, server_ip)
        result_text = ""
        agent_error = None

        # Auth health check: verify Claude Max OAuth token exists (zero-cost filesystem check)
        if not config.CLAUDE_AUTH_DIR.exists():
            print(f"[agent] {job_id}: ABORT — ~/.claude/ not found. Run 'claude login' on Pi5.")
            self.notifier.send(f"{job_id}: Claude auth missing! Run 'claude login' on Pi5.")
            return False

        try:
            async for message in query(
                prompt=prompt,
                options=ClaudeCodeOptions(
                    allowed_tools=["Bash", "Read"],
                    cwd=str(self.install_dir),
                    permission_mode="bypassPermissions",
                    system_prompt=system_prompt,
                    model="sonnet",
                    max_turns=config.AGENT_MAX_TURNS,
                ),
            ):
                if isinstance(message, ResultMessage):
                    result_text = message.result or ""
                    print(f"[agent] Session complete. Cost: ${message.total_cost_usd or 0:.4f}")

        except Exception as e:
            agent_error = str(e)
            print(f"[agent] Agent SDK error: {agent_error}")

        # Parse result
        if "DEPLOYMENT_SUCCESS" in result_text:
            print(f"[agent] {job_id}: DEPLOYMENT_SUCCESS")
            return True

        failure_reason = "Agent did not produce DEPLOYMENT_SUCCESS"
        if "DEPLOYMENT_FAILED:" in result_text:
            failure_reason = result_text.split("DEPLOYMENT_FAILED:", 1)[1].strip()[:300]
        elif agent_error:
            failure_reason = f"Agent SDK error: {agent_error[:300]}"

        print(f"[agent] {job_id}: FAILED — {failure_reason}")
        return False

    def _provision_vps(self, job_id: str, tier: int) -> Optional[str]:
        """Recycle-first VPS provisioning. Returns server IP or None."""
        from vps_lifecycle import VpsLifecycle
        lifecycle = VpsLifecycle(self.api, self.notifier)

        # --- Recycling branch: check pool first ---
        recycled_ip = lifecycle.try_recycle(job_id, tier)
        if recycled_ip:
            print(f"[deploy] {job_id}: Recycled existing VPS -> {recycled_ip}")
            return recycled_ip

        # --- Fresh provisioning: no recyclable VPS available ---
        provision_dir = self.install_dir / "provision"
        provider = os.environ.get("PROVISION_PROVIDER", "contabo")
        create_script = f"{provider}-create.sh"

        result = subprocess.run(
            ["bash", str(provision_dir / create_script), job_id, str(tier)],
            capture_output=True, text=True, timeout=1200,
            cwd=str(self.install_dir),
        )
        if result.returncode != 0:
            print(f"[deploy] {create_script} failed: {result.stderr}")
            return None

        result = subprocess.run(
            ["bash", str(provision_dir / "wait-for-ssh.sh"), job_id],
            capture_output=True, text=True, timeout=300,
            cwd=str(self.install_dir),
        )
        if result.returncode != 0:
            print(f"[deploy] wait-for-ssh failed: {result.stderr}")
            return None

        info_file = self.install_dir / "clients" / job_id / "server-info.env"
        info = {}
        for line in info_file.read_text().splitlines():
            if "=" in line:
                k, v = line.split("=", 1)
                info[k.strip()] = v.strip()

        server_ip = info.get("SERVER_IP")
        server_id = info.get("SERVER_ID")
        contract_id = info.get("CONTRACT_ID")

        if not server_ip or not server_id:
            if server_id:
                try:
                    self.api.create_vps_instance({
                        "vps_id": server_id,
                        "contabo_contract_id": contract_id,
                        "contabo_ip": "",
                        "customer_id": job_id,
                        "status": "failed",
                        "tier": tier,
                        "reinstall_count": 0,
                        "billing_start": __import__("datetime").datetime.utcnow().isoformat() + "Z",
                    })
                except Exception:
                    pass
            return None

        # Register new VPS in D1 tracking table
        try:
            self.api.create_vps_instance({
                "vps_id": server_id,
                "contabo_contract_id": contract_id,
                "contabo_ip": server_ip,
                "customer_id": job_id,
                "status": "provisioning",
                "tier": tier,
                "reinstall_count": 0,
                "billing_start": __import__("datetime").datetime.utcnow().isoformat() + "Z",
            })
        except Exception as e:
            print(f"[deploy] WARNING: failed to register VPS in D1: {e}")

        return server_ip

    def _handle_failure(self, job_id: str, bot: dict, telegram_user_id: str, error: str) -> None:
        """Handle deployment failure: notify customer + owner."""
        try:
            Notifier.send_customer_message(
                bot["token"],
                telegram_user_id,
                "We encountered an issue setting up your AI assistant. "
                "Our team has been notified and will resolve this shortly. "
                "Contact @NexGenAI_Support_bot for updates."
            )
        except Exception:
            pass

        self.api.update_job(job_id, "failed", error_log=error)
        self.notifier.notify_failed(job_id, error)
