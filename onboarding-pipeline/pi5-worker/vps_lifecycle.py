"""VPS lifecycle management: recycling pool, cancel, revoke.

Implements the 3-layer VPS billing strategy from:
  docs/superpowers/specs/2026-03-27-contabo-vps-billing-strategy-design.md

Key principle: API calls first, D1 updates only on success — no rollback needed.
"""

import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import config
from api_client import ApiClient
from notifier import Notifier


class VpsLifecycle:
    def __init__(self, api: ApiClient, notifier: Notifier):
        self.api = api
        self.notifier = notifier
        self.provision_dir = config.OPENCLAW_INSTALL_DIR / "provision"

    def try_recycle(self, job_id: str, tier: int) -> Optional[str]:
        """Check for recyclable VPS and recycle it. Returns server IP or None."""
        recyclable = self.api.get_recyclable_vps()
        if not recyclable:
            return None

        vps_id = recyclable["vps_id"]
        contract_id = recyclable.get("contabo_contract_id", vps_id)
        ip = recyclable["contabo_ip"]
        old_reinstall_count = recyclable.get("reinstall_count", 0)

        print(f"[recycle] {job_id}: Found recyclable VPS {vps_id} ({ip})")

        # Step 1: Verify cancellation is revoked (must be done manually in Contabo panel)
        result = subprocess.run(
            ["bash", str(self.provision_dir / "contabo-revoke.sh"), vps_id],
            capture_output=True, text=True, timeout=60,
            cwd=str(config.OPENCLAW_INSTALL_DIR),
        )
        if result.returncode != 0:
            print(f"[recycle] {job_id}: Revoke check failed: {result.stderr}")
            self.notifier.send(
                f"{job_id}: VPS {vps_id} still has pending cancellation.\n"
                f"Revoke manually: https://my.contabo.com/compute\n"
                f"Then re-run deploy."
            )
            return None

        # Step 2: OS reinstall (Contabo API)
        result = subprocess.run(
            ["bash", str(self.provision_dir / "contabo-reinstall.sh"), vps_id],
            capture_output=True, text=True, timeout=900,
            cwd=str(config.OPENCLAW_INSTALL_DIR),
        )
        if result.returncode != 0:
            print(f"[recycle] {job_id}: Reinstall failed: {result.stderr}")
            self.notifier.send(
                f"{job_id}: VPS {vps_id} reinstall failed after revoke — "
                f"VPS is un-cancelled but needs manual OS reinstall"
            )
            return None

        # Step 3: Update D1 (only after both API calls succeed)
        self.api.update_vps_instance(
            vps_id,
            status="active",
            customer_id=job_id,
            tier=tier,
            reinstall_count=old_reinstall_count + 1,
            cancel_date=None,
            cancel_deadline=None,
        )

        self.notifier.send(f"{job_id}: Recycled VPS {vps_id} ({ip})")
        return ip

    def handle_cancel(self, job: dict) -> None:
        """Handle a cancel job: wipe customer data -> cancel VPS -> update D1."""
        job_id = job["id"]
        vps_id = job.get("vps_id")
        contract_id = job.get("contabo_contract_id", vps_id)

        if not vps_id:
            print(f"[cancel] {job_id}: No vps_id in job — cannot cancel")
            self.api.update_job(job_id, "failed", error_log="No vps_id in cancel job")
            return

        print(f"[cancel] {job_id}: Processing cancellation for VPS {vps_id}")

        # Step 1: Wipe customer data (OS reinstall)
        result = subprocess.run(
            ["bash", str(self.provision_dir / "contabo-reinstall.sh"), vps_id],
            capture_output=True, text=True, timeout=900,
            cwd=str(config.OPENCLAW_INSTALL_DIR),
        )
        if result.returncode != 0:
            print(f"[cancel] {job_id}: Wipe (reinstall) failed: {result.stderr}")
            self.notifier.send(
                f"{job_id}: VPS {vps_id} wipe failed — "
                f"proceeding with cancellation, manual wipe needed"
            )

        # Step 2: Submit cancellation (Contabo API first)
        result = subprocess.run(
            ["bash", str(self.provision_dir / "contabo-cancel.sh"), vps_id],
            capture_output=True, text=True, timeout=60,
            cwd=str(config.OPENCLAW_INSTALL_DIR),
        )
        if result.returncode != 0:
            print(f"[cancel] {job_id}: Contabo cancel failed: {result.stderr}")
            self.api.update_job(
                job_id, "failed",
                error_log=f"Contabo cancel API failed: {result.stderr[:200]}"
            )
            self.notifier.send(
                f"{job_id}: VPS {vps_id} cancel failed — "
                f"manual cancellation needed in Contabo panel"
            )
            return

        cancel_deadline = result.stdout.strip().split("\n")[-1]

        # Step 3: Update D1 (only after Contabo API success)
        now = datetime.now(timezone.utc).isoformat()
        self.api.update_vps_instance(
            vps_id,
            status="cancelling",
            customer_id=None,
            cancel_date=now,
            cancel_deadline=cancel_deadline,
        )

        self.api.update_job(job_id, "complete")
        self.notifier.send(
            f"{job_id}: VPS {vps_id} cancelled. "
            f"Recyclable until {cancel_deadline}."
        )
