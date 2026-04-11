"""NexGen semi-auto CLI. Called by Marigold skill or directly via SSH.

Usage:
    python nexgen_cli.py status
    python nexgen_cli.py jobs
    python nexgen_cli.py pool
    python nexgen_cli.py customer <id>
    python nexgen_cli.py deploy <job_id> --vps <vps_id>
    python nexgen_cli.py cancel <customer_id>
    python nexgen_cli.py upgrade <customer_id> <new_tier>
    python nexgen_cli.py downgrade <customer_id> <new_tier>
    python nexgen_cli.py block <customer_id>
    python nexgen_cli.py unblock <customer_id>
    python nexgen_cli.py reset_budget <customer_id>
"""

import sys
from pathlib import Path

import config
from api_client import ApiClient
from notifier import Notifier
from vps_lifecycle import VpsLifecycle
from formatters import format_job, format_vps_list, format_usage, format_tier_name, TIER_BUDGETS


def handle_status(api: ApiClient) -> str:
    import dashboard
    return dashboard.generate()


def handle_jobs(api: ApiClient) -> str:
    jobs = api.get_pending_jobs()
    if not jobs:
        return "No pending jobs."
    lines = [f"Pending jobs ({len(jobs)}):"]
    for j in jobs:
        lines.append(format_job(j))
    return "\n\n".join(lines)


def handle_pool(api: ApiClient) -> str:
    recyclable = api.get_recyclable_vps()
    pool = [recyclable] if recyclable else []
    cancelling = api.get_vps_by_status("cancelling")
    active = api.get_vps_by_status("active")
    parts = []
    parts.append(format_vps_list(pool, "Recyclable (next to recycle)"))
    parts.append(format_vps_list(active, "Active VPS"))
    parts.append(format_vps_list(cancelling, "Cancelling (full pool)"))
    return "\n\n".join(parts)


def handle_customer(api: ApiClient, customer_id: str) -> str:
    confirm_key = getattr(config, "CONFIRM_API_KEY", "")
    if not confirm_key:
        return "Error: CONFIRM_API_KEY not set in .env"
    usage = api.get_usage_single(customer_id, confirm_key)
    if not usage:
        return f"Customer {customer_id} not found."
    return format_usage(usage)


def validate_tier_change(current_tier: int, new_tier: int) -> tuple:
    """Validate a tier upgrade/downgrade. Returns (ok, message)."""
    if new_tier not in TIER_BUDGETS:
        return False, f"Invalid tier: {new_tier}. Valid: 1, 2, 3"
    if current_tier == new_tier:
        return False, f"Already on tier {current_tier}"
    old_budget = TIER_BUDGETS.get(current_tier, 0)
    new_budget = TIER_BUDGETS[new_tier]
    direction = "Upgrade" if new_tier > current_tier else "Downgrade"
    return True, (
        f"{direction}: {format_tier_name(current_tier)} -> {format_tier_name(new_tier)}\n"
        f"Budget: HK${old_budget:.0f} -> HK${new_budget:.0f}\n"
        f"Reminder: adjust Lemon Squeezy subscription manually"
    )


def handle_deploy(api: ApiClient, notifier: Notifier, job_id: str, vps_id: str) -> str:
    job = api.get_job(job_id)
    if not job:
        return f"Job {job_id} not found."
    # Accept both 'ready' (human-triggered directly) and 'provisioning'
    # (worker.py already polled /api/jobs/next which atomically flips the
    # status to 'provisioning', but no actual work has started until
    # deployer.deploy() runs below).
    valid_starts = {"ready", "provisioning"}
    if job.get("status") not in valid_starts:
        return f"Job {job_id} status is '{job.get('status')}', expected ready or provisioning."

    from deployer import Deployer
    deployer = Deployer(api, notifier, config.OPENCLAW_INSTALL_DIR)

    if vps_id:
        vps_list = api.get_vps_by_status("cancelling") + api.get_vps_by_status("active")
        matched = [v for v in vps_list if v.get("vps_id") == vps_id]
        if not matched:
            return f"VPS {vps_id} not found in D1."
        job["_override_vps_id"] = vps_id
        job["_override_vps_ip"] = matched[0].get("contabo_ip", "")

    success = deployer.deploy(job)
    return f"Deploy #{job_id}: {'SUCCESS' if success else 'FAILED'}"


def handle_upgrade(api: ApiClient, customer_id: str, new_tier: int) -> str:
    confirm_key = getattr(config, "CONFIRM_API_KEY", "")
    usage = api.get_usage_single(customer_id, confirm_key)
    if not usage:
        return f"Customer {customer_id} not found."
    current_tier = usage.get("tier", 0)
    ok, msg = validate_tier_change(current_tier, new_tier)
    if not ok:
        return f"Cannot upgrade: {msg}"
    new_budget = TIER_BUDGETS[new_tier]
    api.update_usage(customer_id, confirm_key, monthly_budget_hkd=new_budget, tier=new_tier)
    return f"Upgraded {customer_id}: {msg}"


def handle_downgrade(api: ApiClient, customer_id: str, new_tier: int) -> str:
    confirm_key = getattr(config, "CONFIRM_API_KEY", "")
    usage = api.get_usage_single(customer_id, confirm_key)
    if not usage:
        return f"Customer {customer_id} not found."
    current_tier = usage.get("tier", 0)
    ok, msg = validate_tier_change(current_tier, new_tier)
    if not ok:
        return f"Cannot downgrade: {msg}"
    new_budget = TIER_BUDGETS[new_tier]
    api.update_usage(customer_id, confirm_key, monthly_budget_hkd=new_budget, tier=new_tier)
    return f"Downgraded {customer_id}: {msg}\nNote: plugins stay installed, budget cap controls usage."


def handle_block(api: ApiClient, customer_id: str) -> str:
    confirm_key = getattr(config, "CONFIRM_API_KEY", "")
    api.update_usage(customer_id, confirm_key, monthly_budget_hkd=0)
    return f"BLOCKED {customer_id}: budget set to 0, all API requests will return 429"


def handle_unblock(api: ApiClient, customer_id: str) -> str:
    confirm_key = getattr(config, "CONFIRM_API_KEY", "")
    usage = api.get_usage_single(customer_id, confirm_key)
    if not usage:
        return f"Customer {customer_id} not found."
    tier = usage.get("tier", 1)
    budget = TIER_BUDGETS.get(tier, 40.0)
    api.update_usage(customer_id, confirm_key, monthly_budget_hkd=budget)
    api.reset_usage(customer_id, confirm_key)
    return f"Unblocked {customer_id}: budget restored to HK${budget:.0f}, spend reset to 0"


def handle_reset_budget(api: ApiClient, customer_id: str) -> str:
    confirm_key = getattr(config, "CONFIRM_API_KEY", "")
    api.reset_usage(customer_id, confirm_key)
    return f"Reset spend for {customer_id} to HK$0"


def handle_cancel(api: ApiClient, notifier: Notifier, customer_id: str) -> str:
    """Cancel a customer: find their VPS, wipe data, cancel at Contabo, revoke token."""
    # Find customer's active VPS
    active_vps = api.get_vps_by_status("active")
    customer_vps = [v for v in active_vps if v.get("customer_id") == customer_id]
    if not customer_vps:
        return f"No active VPS found for customer {customer_id}."

    vps = customer_vps[0]
    vps_id = vps["vps_id"]
    ip = vps.get("contabo_ip", "unknown")

    # Build a cancel job dict for vps_lifecycle.handle_cancel()
    cancel_job = {
        "id": f"cancel_{customer_id}",
        "vps_id": vps_id,
        "contabo_contract_id": vps.get("contabo_contract_id", vps_id),
    }

    # Execute cancellation via lifecycle
    lifecycle = VpsLifecycle(api, notifier)
    lifecycle.handle_cancel(cancel_job)

    # Revoke gateway token (block API access immediately)
    confirm_key = getattr(config, "CONFIRM_API_KEY", "")
    try:
        api.revoke_usage(customer_id, confirm_key)
    except Exception as e:
        return (
            f"Customer {customer_id} VPS {vps_id} ({ip}) cancelled at Contabo, "
            f"but token revoke failed: {e}. Revoke manually."
        )

    return (
        f"Customer {customer_id} cancelled:\n"
        f"  VPS {vps_id} ({ip}) — data wiped, Contabo cancel submitted\n"
        f"  Gateway token revoked (API access blocked)\n"
        f"  VPS enters recyclable pool until Contabo deadline"
    )


def main():
    if len(sys.argv) < 2:
        print("Usage: nexgen_cli.py <command> [args]")
        print("Commands: status, jobs, pool, customer, deploy, cancel,")
        print("          upgrade, downgrade, block, unblock, reset_budget")
        sys.exit(1)

    cmd = sys.argv[1]
    api = ApiClient(config.CF_WORKER_URL, config.WORKER_TOKEN)
    notifier = Notifier(config.OWNER_TELEGRAM_BOT_TOKEN, config.OWNER_TELEGRAM_CHAT_ID)

    if cmd == "status":
        print(handle_status(api))
    elif cmd == "jobs":
        print(handle_jobs(api))
    elif cmd == "pool":
        print(handle_pool(api))
    elif cmd == "customer" and len(sys.argv) >= 3:
        print(handle_customer(api, sys.argv[2]))
    elif cmd == "deploy" and len(sys.argv) >= 3:
        job_id = sys.argv[2]
        vps_id = ""
        if "--vps" in sys.argv:
            idx = sys.argv.index("--vps")
            vps_id = sys.argv[idx + 1] if idx + 1 < len(sys.argv) else ""
        print(handle_deploy(api, notifier, job_id, vps_id))
    elif cmd == "cancel" and len(sys.argv) >= 3:
        print(handle_cancel(api, notifier, sys.argv[2]))
    elif cmd == "upgrade" and len(sys.argv) >= 4:
        print(handle_upgrade(api, sys.argv[2], int(sys.argv[3])))
    elif cmd == "downgrade" and len(sys.argv) >= 4:
        print(handle_downgrade(api, sys.argv[2], int(sys.argv[3])))
    elif cmd == "block" and len(sys.argv) >= 3:
        print(handle_block(api, sys.argv[2]))
    elif cmd == "unblock" and len(sys.argv) >= 3:
        print(handle_unblock(api, sys.argv[2]))
    elif cmd == "reset_budget" and len(sys.argv) >= 3:
        print(handle_reset_budget(api, sys.argv[2]))
    else:
        print(f"Unknown command or missing args: {cmd}")
        sys.exit(1)


if __name__ == "__main__":
    main()
