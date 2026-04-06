"""Format API data into human-readable strings for CLI and Telegram output."""

from __future__ import annotations

TIER_NAMES: dict[int, str] = {1: "Starter", 2: "Pro", 3: "Elite"}
TIER_BUDGETS: dict[int, float] = {1: 40.0, 2: 70.0, 3: 100.0}


def format_tier_name(tier: int) -> str:
    """Return the display name for a service tier.

    Args:
        tier: Numeric tier identifier (1-3 for known tiers).

    Returns:
        Human-readable tier name, or 'Tier N' for unknown tiers.
    """
    return TIER_NAMES.get(tier, f"Tier {tier}")


def format_job(job: dict) -> str:
    """Format a deployment job dict into a readable multi-line string.

    Args:
        job: Job record from the CF Worker API.

    Returns:
        Formatted job summary.
    """
    job_id = job.get("id", "?")
    tier = job.get("tier", "?")
    tier_name = format_tier_name(tier) if isinstance(tier, int) else str(tier)
    status = job.get("status", "?")
    bot = job.get("bot_username", "N/A")
    email = job.get("email", "N/A")
    job_type = job.get("job_type", "deploy")
    created = job.get("created_at", "")[:19]
    return (
        f"Job #{job_id} ({job_type})\n"
        f"  Tier: {tier_name} | Status: {status}\n"
        f"  Bot: @{bot} | Email: {email}\n"
        f"  Created: {created}"
    )


def format_vps_list(vps_list: list[dict], title: str = "VPS Instances") -> str:
    """Format a list of VPS instances into a readable table.

    Args:
        vps_list: List of VPS records from the CF Worker API.
        title: Section heading for the output.

    Returns:
        Formatted VPS listing, or an '(empty)' message if the list is empty.
    """
    if not vps_list:
        return f"{title}: (empty)"
    lines = [f"{title}:"]
    for v in vps_list:
        vps_id = v.get("vps_id", "?")
        ip = v.get("contabo_ip", "no IP")
        status = v.get("status", "?")
        cid = v.get("customer_id") or "unassigned"
        cancel = v.get("cancel_deadline", "")
        reinstalls = v.get("reinstall_count", 0)
        line = f"  {vps_id} | {ip} | {status} | customer={cid}"
        if cancel:
            line += f" | deadline={cancel[:10]}"
        if reinstalls:
            line += f" | reinstalls={reinstalls}"
        lines.append(line)
    return "\n".join(lines)


def format_usage(usage: dict) -> str:
    """Format a customer usage/budget record into a readable summary.

    Args:
        usage: Usage record from the CF Worker API containing spend,
            budget, and status fields.

    Returns:
        Formatted usage summary including spend percentage and block status.
    """
    cid = usage.get("customer_id", "?")
    tier = usage.get("tier", "?")
    tier_name = format_tier_name(tier) if isinstance(tier, int) else str(tier)
    spend: float = usage.get("current_spend_hkd", 0) or 0
    budget: float = usage.get("monthly_budget_hkd", 0) or 0
    reqs: int = usage.get("total_requests", 0) or 0
    pct = f"{spend / budget * 100:.1f}%" if budget else "N/A"
    blocked = "BLOCKED" if usage.get("blocked_at") else "ok"
    return (
        f"Customer {cid} ({tier_name})\n"
        f"  Spend: HK${spend:.1f} / HK${budget:.0f} ({pct}) | {reqs} requests | {blocked}"
    )
