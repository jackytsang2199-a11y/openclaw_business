"""Builds deployment prompts for the Claude Agent SDK session.

The CLAUDE.md playbook is designed for an AI operator. This module converts it
into a concrete, job-specific prompt that Claude follows step-by-step.
"""

from pathlib import Path

# Tier → scripts mapping (from tier-config.yaml / spec Section 6)
TIER_SCRIPTS = {
    1: ["00-swap-setup.sh", "01-system-update.sh", "02-install-node.sh",
        "03-install-docker.sh", "04-install-openclaw.sh",
        "09-security-hardening.sh", "10-configure-env.sh"],
    2: ["00-swap-setup.sh", "01-system-update.sh", "02-install-node.sh",
        "03-install-docker.sh", "04-install-openclaw.sh",
        "05-setup-qdrant.sh", "06-setup-mem0.sh", "07-setup-searxng.sh",
        "08-setup-watchdogs.sh", "09-security-hardening.sh", "10-configure-env.sh"],
    3: ["00-swap-setup.sh", "01-system-update.sh", "02-install-node.sh",
        "03-install-docker.sh", "04-install-openclaw.sh",
        "05-setup-qdrant.sh", "06-setup-mem0.sh", "07-setup-searxng.sh",
        "08-setup-watchdogs.sh", "09-security-hardening.sh", "10-configure-env.sh",
        "11-setup-chromium.sh", "12-setup-acpx.sh", "13-setup-clawteam.sh"],
}

# QA scripts per tier
TIER_QA = {
    1: ["01-health-check.sh", "04-telegram-test.sh", "05-full-integration.sh"],
    2: ["01-health-check.sh", "02-port-check.sh", "03-api-check.sh",
        "04-telegram-test.sh", "05-full-integration.sh"],
    3: ["01-health-check.sh", "02-port-check.sh", "03-api-check.sh",
        "04-telegram-test.sh", "05-full-integration.sh"],
}

SYSTEM_PROMPT = """\
You are the NexGen VPS Installer — an autonomous deployment agent.

You are deploying an OpenClaw AI assistant stack on a customer's VPS.
You have Bash tool access. You run SSH commands to execute scripts on the remote VPS.
You interpret output, debug failures, and make decisions.

## Rules
1. Follow the deployment steps IN ORDER. Do not skip steps.
2. After each script, check the exit code. If non-zero, read the output to diagnose.
3. On script failure: retry ONCE. If it fails twice, report the failure with diagnosis.
4. After each phase, run the gate check. Do NOT proceed if it fails.
5. If a gate check fails, read the QA output carefully and attempt to fix the issue.
   Common fixes are in the Troubleshooting section below.
6. After all scripts + QA pass, output EXACTLY: `DEPLOYMENT_SUCCESS`
7. If you cannot recover from a failure after 2 attempts, output EXACTLY:
   `DEPLOYMENT_FAILED: <one-line reason>`
8. NEVER modify the install scripts themselves. Only run them and debug at the OS level.
9. All SSH commands use: ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -i {ssh_key} deploy@{server_ip}
10. For SCP: scp -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -i {ssh_key} -r <src> deploy@{server_ip}:<dest>

## Troubleshooting Reference
| Issue | Symptom | Fix |
|-------|---------|-----|
| cloud-init sshd restart fails | Failed to restart sshd.service | Ubuntu 24.04 uses `ssh` not `sshd` |
| OpenClaw gateway.bind crash | Immediate exit on startup | Use "loopback" not "localhost" |
| OpenClaw empty allowFrom | Crash on startup | Must have at least one ID in allowFrom |
| OpenClaw entry point | Cannot find module dist/entry.js | v2026.3.23+ uses dist/index.js |
| SearXNG JSON 403 | curl returns 403 for format=json | Edit settings.yml: add json to search.formats, set server.limiter: false |
| Snap chromium headless | Exit code 21, SingletonLock errors | Install Google Chrome .deb instead |
| Chrome port conflict | Service exits immediately | Kill stale chrome processes: killall google-chrome |
| Claude Code CLI 404 | npm install @anthropic/claude-code | Package is @anthropic-ai/claude-code |
| Watchdog service name | gateway-watchdog.service not found | Service is openclaw-watchdog.service |
| ((PASS++)) in bash | Script exits with code 1 | Use PASS=$((PASS+1)) with set -e |
| apt upgrade conffile prompt | Hangs on sshd_config prompt | Use sudo DEBIAN_FRONTEND=noninteractive + --force-confold |
| Host key changed | SSH refuses connection | ssh-keygen -R <IP> or use -o UserKnownHostsFile=/dev/null |
| deploy user missing | SSH as deploy@ fails, Permission denied | Run Step 0 bootstrap — connect as root, create deploy user with useradd |
| Contabo cloud-init fails | deploy user not created, cloud-init status: error | Expected on recycled VPS — Step 0 handles this automatically |
"""


def build_deployment_prompt(
    job_id: str,
    tier: int,
    server_ip: str,
    ssh_key_path: str,
    install_dir: str,
    client_env_content: str,
) -> str:
    """Build the concrete deployment prompt for this job."""

    scripts = TIER_SCRIPTS.get(tier, TIER_SCRIPTS[2])
    qa_scripts = TIER_QA.get(tier, TIER_QA[2])

    # Split into phases
    phase1 = [s for s in scripts if s[:2] in ("00", "01", "02", "03")]
    phase2 = [s for s in scripts if s[:2] in ("04", "05", "06", "07", "08")]
    phase3 = [s for s in scripts if s[:2] in ("09", "10", "11", "12", "13")]

    ssh = f"ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -i {ssh_key_path} deploy@{server_ip}"
    scp = f"scp -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -i {ssh_key_path} -r"

    ssh_root = f"ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -i {ssh_key_path} root@{server_ip}"

    prompt = f"""Deploy OpenClaw for customer {job_id} (Tier {tier}) on VPS {server_ip}.

## SSH Access
```
{ssh}
```

## Step 0: Bootstrap deploy user (required for recycled VPS)

Contabo reinstall does NOT reliably create the `deploy` user via cloud-init.
This step ensures the user exists before any scripts run. Connect as root first:

```bash
{ssh_root} "id deploy 2>/dev/null && echo 'USER_EXISTS' || echo 'USER_MISSING'"
```

If the output contains `USER_MISSING`, create the deploy user:
```bash
{ssh_root} "useradd -m -s /bin/bash deploy && echo 'deploy ALL=(ALL) NOPASSWD:ALL' > /etc/sudoers.d/deploy && chmod 440 /etc/sudoers.d/deploy && mkdir -p /home/deploy/.ssh && chmod 700 /home/deploy/.ssh && cp /root/.ssh/authorized_keys /home/deploy/.ssh/authorized_keys && chmod 600 /home/deploy/.ssh/authorized_keys && chown -R deploy:deploy /home/deploy/.ssh && echo 'DEPLOY_USER_CREATED'"
```

If the output contains `USER_EXISTS`, skip user creation.

Verify deploy SSH works:
```bash
{ssh} "whoami"
```
Must output `deploy`. If it fails, debug the SSH key setup above.

## Step 1: Upload scripts and QA to VPS

```bash
{ssh} "mkdir -p ~/scripts ~/qa"
{scp} {install_dir}/scripts/. deploy@{server_ip}:~/scripts/
{scp} {install_dir}/qa/. deploy@{server_ip}:~/qa/
```

## Step 2: Create and upload client.env

Write this content to a temp file and SCP it:
```
{client_env_content}
```

```bash
cat > /tmp/client-{job_id}.env << 'ENVEOF'
{client_env_content}
ENVEOF
{scp} /tmp/client-{job_id}.env deploy@{server_ip}:~/client.env
rm /tmp/client-{job_id}.env
```

## Step 3: Run install scripts in phases

### Phase 1: Base System
Scripts: {', '.join(phase1)}

Run each script:
```bash
{ssh} "sudo bash ~/scripts/SCRIPT_NAME"
```

**GATE CHECK after Phase 1:**
```bash
{ssh} "node --version && docker --version && swapon --show | grep -q /swapfile"
```
All three must succeed. If any fails, diagnose and fix before proceeding.
"""

    if phase2:
        gate2 = (
            f'{ssh} "systemctl --user is-active openclaw"'
            if tier == 1 else
            f'{ssh} "bash ~/qa/01-health-check.sh && bash ~/qa/02-port-check.sh && bash ~/qa/03-api-check.sh"'
        )
        prompt += f"""
### Phase 2: Core Services
Scripts: {', '.join(phase2)}

Run each script as above.

**GATE CHECK after Phase 2:**
```bash
{gate2}
```
{"Tier 1: only OpenClaw needs to be running." if tier == 1 else "All health/port/API checks must pass."}
"""

    if phase3:
        prompt += f"""
### Phase 3: Extras + Config
Scripts: {', '.join(phase3)}

Run each script as above.

**GATE CHECK after Phase 3:**
```bash
{ssh} "bash ~/qa/04-telegram-test.sh && bash ~/qa/05-full-integration.sh"
```
All checks must PASS.
"""

    prompt += f"""
## Step 4: Final QA

Run all tier-appropriate QA scripts:
{chr(10).join(f'- `{ssh} "bash ~/qa/{q}"`' for q in qa_scripts)}

Read the output of each script. All checks must show PASS.
If any FAIL, read the error output, diagnose using the Troubleshooting reference,
attempt to fix, and re-run the QA script.

## Completion

When ALL scripts and QA pass, output: `DEPLOYMENT_SUCCESS`
If unrecoverable failure, output: `DEPLOYMENT_FAILED: <reason>`
"""

    return prompt


def get_system_prompt(ssh_key_path: str, server_ip: str) -> str:
    """Return the system prompt with SSH details filled in."""
    return SYSTEM_PROMPT.replace("{ssh_key}", ssh_key_path).replace("{server_ip}", server_ip)
