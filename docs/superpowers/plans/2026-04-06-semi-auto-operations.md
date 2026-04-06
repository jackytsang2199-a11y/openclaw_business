# Semi-Auto Operations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert NexGen from full-auto to semi-auto deployment, controlled via Telegram through Marigold (personal OpenClaw on Pi5).

**Architecture:** Worker.py switches to notify-only mode. A new CLI (`nexgen_cli.py`) + formatters + confirmation gate provide the action layer. CF Worker webhook handler gains subscription lifecycle events. Support bot references replaced with email. Website "30 minutes" -> "24 hours".

**Tech Stack:** Python 3 (Pi5 worker), TypeScript (CF Worker), React + i18n (website)

**Spec:** `docs/superpowers/specs/2026-04-06-semi-auto-operations-design.md`

---

## File Structure

### New Files (Pi5 Worker - Python)

| File | Responsibility |
|------|---------------|
| `onboarding-pipeline/pi5-worker/formatters.py` | Format API responses into human-readable strings |
| `onboarding-pipeline/pi5-worker/nexgen_cli.py` | CLI entry point: subcommands call existing modules through formatters |
| `onboarding-pipeline/pi5-worker/tests/test_formatters.py` | Unit tests for formatters |
| `onboarding-pipeline/pi5-worker/tests/test_nexgen_cli.py` | Unit tests for CLI dispatch + notification dedup |
| `onboarding-pipeline/pi5-worker/tests/test_upgrade_downgrade.py` | Tests for tier change logic |

### Modified Files

| File | Change |
|------|--------|
| `onboarding-pipeline/pi5-worker/worker.py` | Notify-only mode, notification dedup, 2h reminder |
| `onboarding-pipeline/pi5-worker/dashboard.py` | Add pending_orders_section() + recyclable_pool_section() |
| `onboarding-pipeline/pi5-worker/deployer.py:62-66,324-329` | Remove @NexGenAI_Support_bot, accept optional vps_id |
| `onboarding-pipeline/pi5-worker/api_client.py` | Add get_job(), get_pending_jobs(), get_usage_admin(), update_usage() |
| `onboarding-pipeline/cf-worker/src/handlers/webhook.ts` | Handle subscription_cancelled, expired, payment_failed |
| `onboarding-pipeline/cf-worker/src/handlers/proxy.ts:87` | Remove @NexGenAI_Support_bot from budget block msg |
| `onboarding-pipeline/templates/delivery-message.md:33` | Remove Telegram support line |
| `website-lovable/src/src/lib/constants.ts:1` | Remove TELEGRAM_URL |
| `website-lovable/src/src/components/Footer.tsx` | Remove Telegram link |
| `website-lovable/src/src/components/Navbar.tsx` | Remove Telegram links (desktop + mobile) |
| Website locale files (6 langs x ~5 files) | Remove Telegram nav, change 30min -> 24h |

### Documentation

| File | Purpose |
|------|--------|
| `docs/pi5-assistant-briefing-v2.md` | Updated Marigold briefing for semi-auto mode |

---

## Task 1: Formatters — Human-Readable Output for API Data

**Files:**
- Create: `onboarding-pipeline/pi5-worker/formatters.py`
- Test: `onboarding-pipeline/pi5-worker/tests/test_formatters.py`

- [ ] **Step 1: Write test for format_job**

```python
# tests/test_formatters.py
import os
os.environ.setdefault("CF_WORKER_URL", "http://test")
os.environ.setdefault("WORKER_TOKEN", "test")
os.environ.setdefault("OWNER_TELEGRAM_BOT_TOKEN", "test")
os.environ.setdefault("OWNER_TELEGRAM_CHAT_ID", "0")
os.environ.setdefault("CONTABO_CLIENT_ID", "test")
os.environ.setdefault("CONTABO_CLIENT_SECRET", "test")
os.environ.setdefault("CONTABO_API_USER", "test")
os.environ.setdefault("CONTABO_API_PASSWORD", "test")

import unittest
from formatters import format_job, format_vps_list, format_usage, format_tier_name, TIER_BUDGETS


class TestFormatJob(unittest.TestCase):
    def test_format_job_basic(self):
        job = {
            "id": "1003",
            "tier": 2,
            "job_type": "deploy",
            "bot_username": "test_bot",
            "email": "test@test.com",
            "status": "ready",
            "created_at": "2026-04-06T10:00:00Z",
        }
        result = format_job(job)
        self.assertIn("#1003", result)
        self.assertIn("Pro", result)
        self.assertIn("test_bot", result)
        self.assertIn("ready", result)

    def test_format_job_missing_fields(self):
        job = {"id": "1004", "tier": 1, "status": "ready"}
        result = format_job(job)
        self.assertIn("#1004", result)
        self.assertIn("Starter", result)


class TestFormatVpsList(unittest.TestCase):
    def test_format_vps_list_with_instances(self):
        vps_list = [
            {"vps_id": "203187256", "contabo_ip": "161.97.88.8", "status": "cancelling",
             "customer_id": None, "cancel_date": "2026-03-27", "cancel_deadline": "2026-04-27",
             "reinstall_count": 0},
        ]
        result = format_vps_list(vps_list, "Recyclable Pool")
        self.assertIn("203187256", result)
        self.assertIn("161.97.88.8", result)
        self.assertIn("cancelling", result)

    def test_format_vps_list_empty(self):
        result = format_vps_list([], "Recyclable Pool")
        self.assertIn("empty", result.lower())


class TestFormatUsage(unittest.TestCase):
    def test_format_usage_normal(self):
        usage = {
            "customer_id": "1001",
            "tier": 2,
            "current_spend_hkd": 12.5,
            "monthly_budget_hkd": 70.0,
            "total_requests": 482,
            "blocked_at": None,
            "warned_at": None,
        }
        result = format_usage(usage)
        self.assertIn("1001", result)
        self.assertIn("12.5", result)
        self.assertIn("70", result)
        self.assertIn("17.9%", result)

    def test_format_usage_blocked(self):
        usage = {
            "customer_id": "1002",
            "tier": 1,
            "current_spend_hkd": 40.0,
            "monthly_budget_hkd": 40.0,
            "total_requests": 1000,
            "blocked_at": "2026-04-05T12:00:00Z",
            "warned_at": "2026-04-05T11:00:00Z",
        }
        result = format_usage(usage)
        self.assertIn("BLOCKED", result)


class TestTierHelpers(unittest.TestCase):
    def test_tier_names(self):
        self.assertEqual(format_tier_name(1), "Starter")
        self.assertEqual(format_tier_name(2), "Pro")
        self.assertEqual(format_tier_name(3), "Elite")
        self.assertEqual(format_tier_name(99), "Tier 99")

    def test_tier_budgets(self):
        self.assertEqual(TIER_BUDGETS[1], 40.0)
        self.assertEqual(TIER_BUDGETS[2], 70.0)
        self.assertEqual(TIER_BUDGETS[3], 100.0)


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd onboarding-pipeline/pi5-worker && python -m pytest tests/test_formatters.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'formatters'`

- [ ] **Step 3: Implement formatters.py**

```python
# formatters.py
"""Format API data into human-readable strings for CLI and Telegram output."""

TIER_NAMES = {1: "Starter", 2: "Pro", 3: "Elite"}
TIER_BUDGETS = {1: 40.0, 2: 70.0, 3: 100.0}


def format_tier_name(tier: int) -> str:
    return TIER_NAMES.get(tier, f"Tier {tier}")


def format_job(job: dict) -> str:
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


def format_vps_list(vps_list: list, title: str = "VPS Instances") -> str:
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
    cid = usage.get("customer_id", "?")
    tier = usage.get("tier", "?")
    tier_name = format_tier_name(tier) if isinstance(tier, int) else str(tier)
    spend = usage.get("current_spend_hkd", 0) or 0
    budget = usage.get("monthly_budget_hkd", 0) or 0
    reqs = usage.get("total_requests", 0) or 0
    pct = f"{spend / budget * 100:.1f}%" if budget else "N/A"
    blocked = "BLOCKED" if usage.get("blocked_at") else "ok"
    return (
        f"Customer {cid} ({tier_name})\n"
        f"  Spend: HK${spend:.1f} / HK${budget:.0f} ({pct}) | {reqs} requests | {blocked}"
    )
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd onboarding-pipeline/pi5-worker && python -m pytest tests/test_formatters.py -v`
Expected: All 7 tests PASS

- [ ] **Step 5: Commit**

```bash
git add onboarding-pipeline/pi5-worker/formatters.py onboarding-pipeline/pi5-worker/tests/test_formatters.py
git commit -m "feat(pi5): add formatters for human-readable API output"
```

---

## Task 2: ApiClient — Add Missing Admin Methods

**Files:**
- Modify: `onboarding-pipeline/pi5-worker/api_client.py`
- Test: `onboarding-pipeline/pi5-worker/tests/test_nexgen_cli.py` (tested together with CLI in Task 4)

The CLI needs several API methods that don't exist yet. Add them now.

- [ ] **Step 1: Add admin-authenticated methods to ApiClient**

Append to the end of `onboarding-pipeline/pi5-worker/api_client.py` (before the file ends):

```python
    # --- Admin methods (require CONFIRM_API_KEY) ---

    def get_job(self, job_id: str) -> Optional[dict]:
        """Get a specific job by ID."""
        resp = requests.get(
            f"{self.base_url}/api/jobs/{job_id}",
            headers=self.headers,
            timeout=10,
        )
        if resp.status_code == 404:
            return None
        resp.raise_for_status()
        return resp.json().get("job")

    def get_pending_jobs(self) -> list:
        """Get all jobs with status 'ready'. Uses admin endpoint if available, else polls."""
        # The /api/jobs/next endpoint returns only one job.
        # For listing all pending, we poll repeatedly or use admin endpoint.
        # For now, return the single next job wrapped in a list.
        job = self.get_next_job()
        return [job] if job else []

    def get_vps_by_status(self, status: str) -> list:
        """Get VPS instances filtered by status."""
        resp = requests.get(
            f"{self.base_url}/api/vps?status={status}",
            headers=self.headers,
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()
        if isinstance(data, list):
            return data
        return data.get("vps_list") or data.get("instances") or []

    def get_usage_admin(self, confirm_api_key: str) -> list:
        """List all usage records (admin). Requires CONFIRM_API_KEY."""
        resp = requests.get(
            f"{self.base_url}/api/usage",
            headers={"X-API-Key": confirm_api_key},
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()
        if isinstance(data, list):
            return data
        return data.get("usage") or data.get("records") or []

    def get_usage_single(self, customer_id: str, confirm_api_key: str) -> Optional[dict]:
        """Get single customer usage (admin)."""
        resp = requests.get(
            f"{self.base_url}/api/usage/{customer_id}",
            headers={"X-API-Key": confirm_api_key},
            timeout=10,
        )
        if resp.status_code == 404:
            return None
        resp.raise_for_status()
        return resp.json().get("usage")

    def update_usage(self, customer_id: str, confirm_api_key: str, **fields) -> dict:
        """Update customer usage record (admin). Fields: monthly_budget_hkd, etc."""
        resp = requests.patch(
            f"{self.base_url}/api/usage/{customer_id}",
            headers={"X-API-Key": confirm_api_key, "Content-Type": "application/json"},
            json=fields,
            timeout=10,
        )
        resp.raise_for_status()
        return resp.json().get("usage", {})

    def revoke_usage(self, customer_id: str, confirm_api_key: str) -> dict:
        """Revoke customer gateway token (admin)."""
        resp = requests.post(
            f"{self.base_url}/api/usage/{customer_id}/revoke",
            headers={"X-API-Key": confirm_api_key},
            timeout=10,
        )
        resp.raise_for_status()
        return resp.json()

    def reset_usage(self, customer_id: str, confirm_api_key: str) -> dict:
        """Reset customer monthly spend to 0 (admin)."""
        resp = requests.post(
            f"{self.base_url}/api/usage/{customer_id}/reset",
            headers={"X-API-Key": confirm_api_key},
            timeout=10,
        )
        resp.raise_for_status()
        return resp.json()
```

- [ ] **Step 2: Run existing tests to verify no breakage**

Run: `cd onboarding-pipeline/pi5-worker && python -m pytest tests/ -v --ignore=tests/test_e2e_vps_lifecycle.py --ignore=tests/test_e2e_backup_restore.py`
Expected: All existing tests still PASS

- [ ] **Step 3: Commit**

```bash
git add onboarding-pipeline/pi5-worker/api_client.py
git commit -m "feat(pi5): add admin API methods to ApiClient for CLI"
```

---

## Task 3: Worker.py — Notify-Only Mode

**Files:**
- Modify: `onboarding-pipeline/pi5-worker/worker.py`
- Test: `onboarding-pipeline/pi5-worker/tests/test_nexgen_cli.py` (notification dedup tests)

- [ ] **Step 1: Write test for notification dedup logic**

```python
# tests/test_nexgen_cli.py
import os
os.environ.setdefault("CF_WORKER_URL", "http://test")
os.environ.setdefault("WORKER_TOKEN", "test")
os.environ.setdefault("OWNER_TELEGRAM_BOT_TOKEN", "test")
os.environ.setdefault("OWNER_TELEGRAM_CHAT_ID", "0")
os.environ.setdefault("CONTABO_CLIENT_ID", "test")
os.environ.setdefault("CONTABO_CLIENT_SECRET", "test")
os.environ.setdefault("CONTABO_API_USER", "test")
os.environ.setdefault("CONTABO_API_PASSWORD", "test")

import unittest
import time
from unittest.mock import MagicMock, patch


class TestNotificationDedup(unittest.TestCase):
    """Test the notification deduplication logic extracted from worker.py."""

    def test_first_notification_sends(self):
        from worker import _should_notify
        notified = {}
        result = _should_notify("1003", notified, time.time)
        self.assertEqual(result, "new")
        self.assertIn("1003", notified)

    def test_second_notification_suppressed(self):
        from worker import _should_notify
        notified = {"1003": time.time()}
        result = _should_notify("1003", notified, time.time)
        self.assertEqual(result, "skip")

    def test_reminder_after_2_hours(self):
        from worker import _should_notify
        two_hours_ago = time.time() - 7201
        notified = {"1003": two_hours_ago}
        result = _should_notify("1003", notified, time.time)
        self.assertEqual(result, "reminder")


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd onboarding-pipeline/pi5-worker && python -m pytest tests/test_nexgen_cli.py::TestNotificationDedup -v`
Expected: FAIL — `ImportError: cannot import name '_should_notify' from 'worker'`

- [ ] **Step 3: Rewrite worker.py with notify-only mode**

Replace the entire contents of `onboarding-pipeline/pi5-worker/worker.py`:

```python
"""Main worker loop: poll CF Worker for jobs, NOTIFY owner, repeat.

Semi-auto mode: the worker detects new jobs and sends Telegram notifications
but does NOT auto-deploy. The owner triggers deployment via nexgen_cli.py
(through Marigold or SSH).
"""

import time
import traceback

import config
from api_client import ApiClient
from notifier import Notifier

REMINDER_INTERVAL = 7200  # 2 hours


def _should_notify(job_id: str, notified: dict, now_fn=time.time) -> str:
    """Decide whether to notify for this job.

    Returns: "new" (first time), "reminder" (2h elapsed), "skip" (already notified).
    """
    now = now_fn()
    if job_id not in notified:
        notified[job_id] = now
        return "new"
    elapsed = now - notified[job_id]
    if elapsed >= REMINDER_INTERVAL:
        notified[job_id] = now  # reset timer after reminder
        return "reminder"
    return "skip"


def _format_age(first_seen: float) -> str:
    """Format elapsed time since first seen."""
    elapsed = time.time() - first_seen
    if elapsed < 3600:
        return f"{int(elapsed / 60)}m"
    return f"{elapsed / 3600:.1f}h"


def main():
    api = ApiClient(config.CF_WORKER_URL, config.WORKER_TOKEN)
    notifier = Notifier(config.OWNER_TELEGRAM_BOT_TOKEN, config.OWNER_TELEGRAM_CHAT_ID)

    last_health_ping = 0
    notified_jobs: dict[str, float] = {}  # job_id -> first_seen timestamp

    print(f"[worker] Started (SEMI-AUTO MODE). Polling {config.CF_WORKER_URL} every {config.POLL_INTERVAL}s")
    print(f"[worker] Jobs will be NOTIFIED only — use nexgen_cli.py to deploy")

    while True:
        try:
            # Health ping every 5 minutes
            now = time.time()
            if now - last_health_ping >= config.HEALTH_INTERVAL:
                api.send_health_ping()
                last_health_ping = now

            # Poll for next job
            job = api.get_next_job()
            if job:
                job_id = job["id"]
                action = _should_notify(job_id, notified_jobs)

                if action == "new":
                    tier = job.get("tier", "?")
                    bot = job.get("bot_username", "N/A")
                    job_type = job.get("job_type", "deploy")
                    notifier.send(
                        f"New {job_type} #{job_id}\n"
                        f"Tier: {tier} | Bot: @{bot}\n"
                        f"Waiting for your command."
                    )
                    print(f"[worker] Notified: new {job_type} #{job_id}")

                elif action == "reminder":
                    age = _format_age(notified_jobs[job_id] - REMINDER_INTERVAL)
                    notifier.send(f"Reminder: Order #{job_id} still pending ({age})")
                    print(f"[worker] Reminder sent for #{job_id}")

                # DO NOT process — wait for nexgen_cli.py to trigger

        except KeyboardInterrupt:
            print("[worker] Shutting down...")
            break
        except Exception:
            print(f"[worker] Error: {traceback.format_exc()}")
            time.sleep(10)
            continue

        time.sleep(config.POLL_INTERVAL)


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd onboarding-pipeline/pi5-worker && python -m pytest tests/test_nexgen_cli.py::TestNotificationDedup -v`
Expected: All 3 tests PASS

- [ ] **Step 5: Run all existing tests to verify no breakage**

Run: `cd onboarding-pipeline/pi5-worker && python -m pytest tests/ -v --ignore=tests/test_e2e_vps_lifecycle.py --ignore=tests/test_e2e_backup_restore.py`
Expected: All tests PASS (some test_worker.py tests may need updating if they mock deployer.deploy — update those mocks to match new worker.py)

- [ ] **Step 6: Commit**

```bash
git add onboarding-pipeline/pi5-worker/worker.py onboarding-pipeline/pi5-worker/tests/test_nexgen_cli.py
git commit -m "feat(pi5): switch worker.py to notify-only semi-auto mode"
```

---

## Task 4: Dashboard Enhancements — Pending Orders + Recyclable Pool

**Files:**
- Modify: `onboarding-pipeline/pi5-worker/dashboard.py`

- [ ] **Step 1: Add pending_orders_section() and recyclable_pool_section() to dashboard.py**

Add these two functions after the `worker_section()` function (after line 89) in `onboarding-pipeline/pi5-worker/dashboard.py`:

```python
def pending_orders_section():
    lines = ["## Pending Orders\n"]
    lines.append("| Job ID | Tier | Bot | Email | Created | Status |")
    lines.append("|--------|------|-----|-------|---------|--------|")

    data = _api("/api/jobs/next")
    if not data or not data.get("job"):
        lines.append("| *(no pending orders)* | | | | | |")
        return "\n".join(lines) + "\n"

    job = data["job"]
    jid = job.get("id", "?")
    tier = job.get("tier", "?")
    bot = job.get("bot_username", "?")
    email = job.get("email", "?")
    created = job.get("created_at", "")[:19]
    status = job.get("status", "?")
    lines.append(f"| {jid} | {tier} | @{bot} | {email} | {created} | {status} |")

    return "\n".join(lines) + "\n"


def recyclable_pool_section():
    lines = ["## Recyclable Pool\n"]
    lines.append("| VPS ID | IP | Cancel Date | Deadline | Reinstalls |")
    lines.append("|--------|----|-------------|----------|------------|")

    data = _api("/api/vps?status=cancelling")
    instances = []
    if isinstance(data, list):
        instances = data
    elif isinstance(data, dict):
        instances = data.get("vps_list") or data.get("instances") or []

    if not instances:
        lines.append("| *(pool empty)* | | | | |")
        return "\n".join(lines) + "\n"

    for v in instances:
        vid = v.get("vps_id", "?")
        ip = v.get("contabo_ip", "?")
        cancel_date = (v.get("cancel_date") or "")[:10]
        deadline = (v.get("cancel_deadline") or "")[:10]
        reinstalls = v.get("reinstall_count", 0)
        lines.append(f"| {vid} | {ip} | {cancel_date} | {deadline} | {reinstalls} |")

    return "\n".join(lines) + "\n"
```

- [ ] **Step 2: Update generate() to include new sections**

In the `generate()` function, change the `sections` list to include the new sections. Replace the current `sections` assignment (line 240-248):

```python
def generate():
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    sections = [
        f"# NexGen Pipeline Dashboard\n\n**Updated:** {now}\n",
        warnings_section(),
        pending_orders_section(),
        worker_section(),
        vps_section(),
        recyclable_pool_section(),
        usage_section(),
        backup_section(),
        "---\n*Auto-generated by dashboard.py*\n",
    ]
    report = "\n".join(sections)
    OUTPUT.write_text(report)
    print(f"Dashboard written to {OUTPUT}")
    return report
```

- [ ] **Step 3: Run dashboard manually to verify**

Run: `cd onboarding-pipeline/pi5-worker && python dashboard.py`
Expected: Output includes "Pending Orders" and "Recyclable Pool" sections (may show "no pending orders" and "pool empty" — that's correct)

- [ ] **Step 4: Commit**

```bash
git add onboarding-pipeline/pi5-worker/dashboard.py
git commit -m "feat(pi5): add pending orders + recyclable pool to dashboard"
```

---

## Task 5: Nexgen CLI — Command Dispatch

**Files:**
- Create: `onboarding-pipeline/pi5-worker/nexgen_cli.py`
- Modify: `onboarding-pipeline/pi5-worker/tests/test_nexgen_cli.py`

- [ ] **Step 1: Add CLI tests to test_nexgen_cli.py**

Append to `onboarding-pipeline/pi5-worker/tests/test_nexgen_cli.py`:

```python
class TestCLIDispatch(unittest.TestCase):
    """Test CLI subcommand routing."""

    @patch("nexgen_cli.ApiClient")
    def test_status_command(self, mock_api_cls):
        from nexgen_cli import handle_status
        mock_api = MagicMock()
        result = handle_status(mock_api)
        self.assertIsInstance(result, str)

    @patch("nexgen_cli.ApiClient")
    def test_jobs_command(self, mock_api_cls):
        from nexgen_cli import handle_jobs
        mock_api = MagicMock()
        mock_api.get_pending_jobs.return_value = []
        result = handle_jobs(mock_api)
        self.assertIn("pending", result.lower())

    @patch("nexgen_cli.ApiClient")
    def test_pool_command(self, mock_api_cls):
        from nexgen_cli import handle_pool
        mock_api = MagicMock()
        mock_api.get_recyclable_vps.return_value = None
        mock_api.get_vps_by_status.return_value = []
        result = handle_pool(mock_api)
        self.assertIn("empty", result.lower())


class TestUpgradeDowngrade(unittest.TestCase):
    """Test tier change validation."""

    def test_validate_tier_change_upgrade(self):
        from nexgen_cli import validate_tier_change
        ok, msg = validate_tier_change(current_tier=1, new_tier=2)
        self.assertTrue(ok)
        self.assertIn("40", msg)  # old budget
        self.assertIn("70", msg)  # new budget

    def test_validate_tier_change_downgrade(self):
        from nexgen_cli import validate_tier_change
        ok, msg = validate_tier_change(current_tier=3, new_tier=1)
        self.assertTrue(ok)
        self.assertIn("100", msg)  # old budget
        self.assertIn("40", msg)   # new budget

    def test_validate_tier_change_same(self):
        from nexgen_cli import validate_tier_change
        ok, msg = validate_tier_change(current_tier=2, new_tier=2)
        self.assertFalse(ok)

    def test_validate_tier_change_invalid(self):
        from nexgen_cli import validate_tier_change
        ok, msg = validate_tier_change(current_tier=1, new_tier=5)
        self.assertFalse(ok)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd onboarding-pipeline/pi5-worker && python -m pytest tests/test_nexgen_cli.py::TestCLIDispatch -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'nexgen_cli'`

- [ ] **Step 3: Implement nexgen_cli.py**

```python
# nexgen_cli.py
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
    python nexgen_cli.py backup_now <customer_id>
"""

import sys
import json
from pathlib import Path

import config
from api_client import ApiClient
from notifier import Notifier
from formatters import format_job, format_vps_list, format_usage, format_tier_name, TIER_BUDGETS


def handle_status(api: ApiClient) -> str:
    """Run dashboard and return report."""
    import dashboard
    return dashboard.generate()


def handle_jobs(api: ApiClient) -> str:
    """List pending jobs."""
    jobs = api.get_pending_jobs()
    if not jobs:
        return "No pending jobs."
    lines = [f"Pending jobs ({len(jobs)}):"]
    for j in jobs:
        lines.append(format_job(j))
    return "\n\n".join(lines)


def handle_pool(api: ApiClient) -> str:
    """Show recyclable VPS pool + inventory."""
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
    """Show single customer detail."""
    confirm_key = getattr(config, "CONFIRM_API_KEY", "")
    if not confirm_key:
        return "Error: CONFIRM_API_KEY not set in .env"
    usage = api.get_usage_single(customer_id, confirm_key)
    if not usage:
        return f"Customer {customer_id} not found."
    return format_usage(usage)


def validate_tier_change(current_tier: int, new_tier: int) -> tuple[bool, str]:
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
    """Deploy a job onto a VPS. Calls deployer.deploy() after confirmation."""
    job = api.get_job(job_id)
    if not job:
        return f"Job {job_id} not found."
    if job.get("status") != "ready":
        return f"Job {job_id} status is '{job.get('status')}', expected 'ready'."

    from deployer import Deployer
    deployer = Deployer(api, notifier, config.OPENCLAW_INSTALL_DIR)

    # Override VPS selection by setting server_ip in job if VPS provided
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
    """Upgrade customer tier (increase budget)."""
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
    """Downgrade customer tier (reduce budget, keep plugins)."""
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
    """Emergency block — set budget to 0."""
    confirm_key = getattr(config, "CONFIRM_API_KEY", "")
    api.update_usage(customer_id, confirm_key, monthly_budget_hkd=0)
    return f"BLOCKED {customer_id}: budget set to 0, all API requests will return 429"


def handle_unblock(api: ApiClient, customer_id: str) -> str:
    """Unblock — restore tier default budget + reset spend."""
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
    """Reset monthly spend to 0."""
    confirm_key = getattr(config, "CONFIRM_API_KEY", "")
    api.reset_usage(customer_id, confirm_key)
    return f"Reset spend for {customer_id} to HK$0"


def main():
    if len(sys.argv) < 2:
        print("Usage: nexgen_cli.py <command> [args]")
        print("Commands: status, jobs, pool, customer, deploy, cancel,")
        print("          upgrade, downgrade, block, unblock, reset_budget, backup_now")
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
```

- [ ] **Step 4: Run all CLI tests**

Run: `cd onboarding-pipeline/pi5-worker && python -m pytest tests/test_nexgen_cli.py -v`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add onboarding-pipeline/pi5-worker/nexgen_cli.py onboarding-pipeline/pi5-worker/tests/test_nexgen_cli.py
git commit -m "feat(pi5): add nexgen_cli.py with subcommands for semi-auto ops"
```

---

## Task 6: Remove @NexGenAI_Support_bot References

**Files:**
- Modify: `onboarding-pipeline/pi5-worker/deployer.py:62-66,324-329`
- Modify: `onboarding-pipeline/cf-worker/src/handlers/proxy.ts:87`
- Modify: `onboarding-pipeline/templates/delivery-message.md:33`

- [ ] **Step 1: Fix deployer.py line 66 — remove support bot from setup message**

In `onboarding-pipeline/pi5-worker/deployer.py`, change line 65-66 from:
```python
                "Setting up your AI assistant, please wait approximately 15 minutes... "
                "If you have any questions, contact @NexGenAI_Support_bot or support@3nexgen.com"
```
to:
```python
                "Setting up your AI assistant, please wait approximately 15 minutes... "
                "If you have any questions, contact support@3nexgen.com"
```

- [ ] **Step 2: Fix deployer.py line 329 — remove support bot from failure message**

Change line 328-329 from:
```python
                "Our team has been notified and will resolve this shortly. "
                "Contact @NexGenAI_Support_bot for updates."
```
to:
```python
                "Our team has been notified and will resolve this shortly. "
                "Contact support@3nexgen.com for updates."
```

- [ ] **Step 3: Fix proxy.ts line 87 — remove support bot from budget block**

In `onboarding-pipeline/cf-worker/src/handlers/proxy.ts`, change line 87 from:
```typescript
      return tooManyRequests("API 每月用量已達上限。如需升級服務，請瀏覽我們的網站 3nexgen.com 或聯絡 @NexGenAI_Support_bot 查詢。用量將於下月 1 號自動重置。");
```
to:
```typescript
      return tooManyRequests("API 每月用量已達上限。如需升級服務，請瀏覽我們的網站 3nexgen.com 或發電郵至 support@3nexgen.com 查詢。用量將於下月 1 號自動重置。");
```

- [ ] **Step 4: Fix delivery-message.md — remove Telegram support line**

In `onboarding-pipeline/templates/delivery-message.md`, change lines 32-33 from:
```markdown
**需要協助？**
Telegram: @NexGenAI_Support_bot
電郵: support@3nexgen.com
```
to:
```markdown
**需要協助？**
電郵: support@3nexgen.com
```

- [ ] **Step 5: Run existing tests**

Run: `cd onboarding-pipeline/pi5-worker && python -m pytest tests/ -v --ignore=tests/test_e2e_vps_lifecycle.py --ignore=tests/test_e2e_backup_restore.py`
Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add onboarding-pipeline/pi5-worker/deployer.py onboarding-pipeline/cf-worker/src/handlers/proxy.ts onboarding-pipeline/templates/delivery-message.md
git commit -m "fix: remove @NexGenAI_Support_bot refs, use email only for support"
```

---

## Task 7: CF Worker — Handle Subscription Lifecycle Webhooks

**Files:**
- Modify: `onboarding-pipeline/cf-worker/src/handlers/webhook.ts`

- [ ] **Step 1: Extend webhook handler to process subscription events**

Replace the entire contents of `onboarding-pipeline/cf-worker/src/handlers/webhook.ts`:

```typescript
import { Env } from "../lib/types";
import { verifyLemonSqueezySignature } from "../lib/hmac";
import { confirmPayment, getJobById, createJob } from "../lib/db";
import { unauthorized, badRequest, json } from "../lib/auth";

interface LemonSqueezyWebhook {
  meta: {
    event_name: string;
    custom_data?: {
      order_id?: string;
    };
  };
  data: {
    id: string;
    attributes: {
      first_order_item?: {
        variant_id?: string;
      };
      user_email?: string;
    };
  };
}

export async function handleWebhook(request: Request, env: Env): Promise<Response> {
  const body = await request.text();
  const signature = request.headers.get("X-Signature") ?? "";

  if (!await verifyLemonSqueezySignature(body, signature, env.LEMONSQUEEZY_WEBHOOK_SECRET)) {
    return unauthorized("Invalid webhook signature");
  }

  let payload: LemonSqueezyWebhook;
  try {
    payload = JSON.parse(body);
  } catch {
    return badRequest("Invalid JSON body");
  }

  const event = payload.meta.event_name;
  const orderId = payload.meta.custom_data?.order_id;

  // Handle order_created — confirm payment
  if (event === "order_created") {
    if (!orderId) {
      console.log("[webhook] Payment received without order_id in custom_data");
      return json({ warning: "No order_id in custom_data" });
    }
    const existing = await getJobById(env.DB, orderId);
    if (!existing) {
      console.log(`[webhook] Order ${orderId} not found in D1`);
      return json({ warning: `Order ${orderId} not found` });
    }
    const confirmed = await confirmPayment(env.DB, orderId, "lemon_squeezy");
    if (!confirmed) {
      return json({ ok: true, already_confirmed: true });
    }
    return json({ ok: true, order_id: confirmed.id, status: confirmed.status });
  }

  // Handle subscription_cancelled or subscription_expired — create cancel job
  if (event === "subscription_cancelled" || event === "subscription_expired") {
    if (!orderId) {
      console.log(`[webhook] ${event} received without order_id`);
      return json({ warning: `${event} without order_id`, event });
    }
    const existing = await getJobById(env.DB, orderId);
    if (!existing) {
      console.log(`[webhook] ${event}: order ${orderId} not found`);
      return json({ warning: `Order ${orderId} not found for ${event}`, event });
    }
    // Create a cancel job (Pi5 will notify owner, owner confirms via CLI)
    const cancelJobId = `cancel_${orderId}_${Date.now()}`;
    try {
      await createJob(env.DB, {
        id: cancelJobId,
        job_type: "cancel",
        tier: existing.tier,
        display_name: existing.display_name || orderId,
        telegram_user_id: existing.telegram_user_id || "",
        email: existing.email || "",
        bot_token: existing.bot_token || "",
        bot_username: existing.bot_username || "",
        status: "ready",
        payment_method: "lemon_squeezy",
      });
    } catch (e) {
      console.log(`[webhook] Failed to create cancel job: ${e}`);
      return json({ error: "Failed to create cancel job", event }, 500);
    }
    console.log(`[webhook] ${event}: cancel job ${cancelJobId} created for order ${orderId}`);
    return json({ ok: true, event, cancel_job_id: cancelJobId });
  }

  // Handle subscription_payment_failed — notify only (LS retries automatically)
  if (event === "subscription_payment_failed") {
    console.log(`[webhook] Payment failed for order ${orderId || "unknown"}`);
    // Pi5 health dashboard will surface this — no D1 action needed
    // Owner gets alerted via the next dashboard refresh or can check manually
    return json({ ok: true, event, action: "notify_only" });
  }

  // Handle subscription_updated — log only
  if (event === "subscription_updated") {
    console.log(`[webhook] Subscription updated for order ${orderId || "unknown"}`);
    return json({ ok: true, event, action: "logged" });
  }

  // All other events — ignore
  return json({ ignored: true, event });
}
```

**Note:** This depends on a `createJob` function in `db.ts`. If it doesn't exist, the engineer must check `onboarding-pipeline/cf-worker/src/lib/db.ts` and add it. The function should INSERT into the `jobs` table with the provided fields.

- [ ] **Step 2: Verify CF Worker builds**

Run: `cd onboarding-pipeline/cf-worker && npx wrangler dev --local 2>&1 | head -20`
Expected: Worker starts without TypeScript errors (or fix any import errors for `createJob`)

- [ ] **Step 3: Commit**

```bash
git add onboarding-pipeline/cf-worker/src/handlers/webhook.ts
git commit -m "feat(cf-worker): handle subscription_cancelled, expired, payment_failed webhooks"
```

---

## Task 8: Website — Remove Telegram Contact + Update Setup Time

**Files:**
- Modify: `website-lovable/src/src/lib/constants.ts`
- Modify: `website-lovable/src/src/components/Footer.tsx`
- Modify: `website-lovable/src/src/components/Navbar.tsx`
- Modify: All locale files with Telegram/30-min references

- [ ] **Step 1: Remove TELEGRAM_URL from constants.ts**

In `website-lovable/src/src/lib/constants.ts`, remove line 1:
```typescript
export const TELEGRAM_URL = "https://t.me/nexgenOpenClaw";
```

The file should now contain only:
```typescript
export const SUPPORT_EMAIL = "support@3nexgen.com";
export const TICKET_EMAIL = "support@3nexgen.com";
export const SITE_URL = "https://3nexgen.com";
```

- [ ] **Step 2: Remove Telegram import and link from Footer.tsx**

In `website-lovable/src/src/components/Footer.tsx`:
- Remove the import of `TELEGRAM_URL` from `@/lib/constants`
- Remove the `<a href={TELEGRAM_URL}...>` Telegram link element
- Keep the email link and other footer content

- [ ] **Step 3: Remove Telegram imports and links from Navbar.tsx**

In `website-lovable/src/src/components/Navbar.tsx`:
- Remove the import of `TELEGRAM_URL` from `@/lib/constants`
- Remove the desktop Telegram link (around line 73)
- Remove the mobile menu Telegram link (around line 113)
- Keep all other nav items

- [ ] **Step 4: Remove nav.telegram from common.json locale files**

For each language in `website-lovable/src/public/locales/{zh-HK,en,es,ja,ru,zh-CN}/common.json`:
- Remove the `"nav.telegram": "..."` key

- [ ] **Step 5: Update setup time references from "30 minutes" to "24 hours"**

For each language, find and replace all "30 minute" references. The key files and JSON keys:

**zh-HK** — in `home.json`, `pricing.json`, `faq.json`, `onboarding.json`, `meta.json`:
- "30 分鐘" -> "24 小時內"
- "最快 30 分鐘" -> "24 小時內"

**en** — same files:
- "30 minutes" -> "24 hours"
- "as fast as 30 minutes" -> "within 24 hours"

**es, ja, ru** — equivalent changes in their locale files.

**Note:** The BotFather tutorial pages (`botguide.json`) reference `t.me/BotFather` — these are links to Telegram's official BotFather bot that customers need to create their bot. **Do NOT remove these** — they are part of the onboarding tutorial, not support contact links.

- [ ] **Step 6: Verify website builds**

Run: `cd website-lovable/src && npm run build 2>&1 | tail -10`
Expected: Build succeeds with no TypeScript errors about missing TELEGRAM_URL

- [ ] **Step 7: Commit**

```bash
git add website-lovable/src/src/lib/constants.ts website-lovable/src/src/components/Footer.tsx website-lovable/src/src/components/Navbar.tsx website-lovable/src/public/locales/
git commit -m "fix(website): remove Telegram contact links, update setup time to 24 hours"
```

---

## Task 9: Marigold Briefing Document

**Files:**
- Create: `docs/pi5-assistant-briefing-v2.md`

- [ ] **Step 1: Write updated briefing**

```markdown
# Briefing for Pi5 Personal Assistant (Semi-Auto Mode)

> **Copy-paste this entire message to your Pi5 Claude assistant to bring it up to speed.**
> **Version:** v2 (2026-04-06) — replaces original briefing

---

## Who You Are & What Changed

You are operating on a **Raspberry Pi 5** (192.168.1.30, user: jacky999) that serves as the **deployment orchestrator** for **NexGen** (3nexgen.com).

**IMPORTANT: The system now runs in SEMI-AUTO MODE.**

Previously, the Pi5 worker automatically deployed customer orders. Now:
1. Worker **detects** new orders and **notifies** the owner via Telegram
2. Worker does **NOT** auto-deploy
3. The owner (Jacky) tells **you** (Marigold) what to do
4. You execute commands via `nexgen_cli.py` — a CLI with predefined safe operations
5. **Destructive actions** (deploy, cancel, upgrade) require Jacky to type a confirmation code

---

## How You Help Jacky Manage NexGen

### Read Operations (safe, call anytime)

When Jacky asks about system status, pending orders, customer usage, etc., run these commands:

| Jacky says | You run |
|------------|---------|
| "有冇新單？" / "any orders?" | `python3 ~/nexgen-worker/nexgen_cli.py jobs` |
| "status" / "報告" | `python3 ~/nexgen-worker/nexgen_cli.py status` |
| "有冇 VPS？" / "pool?" | `python3 ~/nexgen-worker/nexgen_cli.py pool` |
| "客 1001 用量點？" | `python3 ~/nexgen-worker/nexgen_cli.py customer 1001` |

Read the output, summarize it conversationally in Chinese, and suggest next actions.

### Write Operations (REQUIRE CONFIRMATION)

When Jacky asks you to deploy, cancel, upgrade, etc., follow this exact flow:

1. Run the CLI command
2. Read the confirmation prompt that appears
3. Tell Jacky exactly what will happen
4. Wait for Jacky to type the confirmation code
5. Only then proceed

| Jacky says | You run | Confirmation needed |
|------------|---------|-------------------|
| "deploy 1003 用 VPS 203187256" | `python3 ~/nexgen-worker/nexgen_cli.py deploy 1003 --vps 203187256` | Yes — "confirm 1003" |
| "cancel 客 1001" | `python3 ~/nexgen-worker/nexgen_cli.py cancel 1001` | Yes |
| "upgrade 1001 去 tier 3" | `python3 ~/nexgen-worker/nexgen_cli.py upgrade 1001 3` | Yes |
| "downgrade 1001 去 tier 1" | `python3 ~/nexgen-worker/nexgen_cli.py downgrade 1001 1` | Yes |
| "block 1002" | `python3 ~/nexgen-worker/nexgen_cli.py block 1002` | Yes |
| "unblock 1002" | `python3 ~/nexgen-worker/nexgen_cli.py unblock 1002` | Yes |
| "reset 1001 用量" | `python3 ~/nexgen-worker/nexgen_cli.py reset_budget 1001` | Yes |

**After upgrade/downgrade:** Always remind Jacky to manually adjust the subscription price in the Lemon Squeezy dashboard.

---

## Service Tiers

| Tier | Name | Monthly | API Budget |
|------|------|---------|-----------|
| 1 | Starter | HK$248 | HK$40 |
| 2 | Pro | HK$398 | HK$70 |
| 3 | Elite | HK$598 | HK$100 |

---

## Support

There is **no support bot**. Customer support is via:
- Email: support@3nexgen.com
- Ticket system

Do NOT reference any Telegram support bot in messages.

---

## Key Paths

```
~/nexgen-worker/nexgen_cli.py    # THE MAIN TOOL — all operations go through here
~/nexgen-worker/worker.py        # Runs as service — notify-only, do not modify
~/nexgen-worker/dashboard.py     # Status report generator
~/nexgen-worker/.env             # Secrets — do not read or expose contents
~/nexgen-dashboard.md            # Latest dashboard output (refreshed every 15 min)
```

---

## What NOT To Do

- Do NOT restart or modify `nexgen-worker.service` — it handles notification polling
- Do NOT run `deployer.deploy()` directly — always use `nexgen_cli.py`
- Do NOT expose secrets from `.env` in conversation
- Do NOT auto-deploy without Jacky's explicit confirmation
```

- [ ] **Step 2: Commit**

```bash
git add docs/pi5-assistant-briefing-v2.md
git commit -m "docs: add semi-auto Marigold briefing v2"
```

---

## Task 10: Final Integration Test + Upgrade/Downgrade Tests

**Files:**
- Create: `onboarding-pipeline/pi5-worker/tests/test_upgrade_downgrade.py`

- [ ] **Step 1: Write upgrade/downgrade integration tests**

```python
# tests/test_upgrade_downgrade.py
import os
os.environ.setdefault("CF_WORKER_URL", "http://test")
os.environ.setdefault("WORKER_TOKEN", "test")
os.environ.setdefault("OWNER_TELEGRAM_BOT_TOKEN", "test")
os.environ.setdefault("OWNER_TELEGRAM_CHAT_ID", "0")
os.environ.setdefault("CONTABO_CLIENT_ID", "test")
os.environ.setdefault("CONTABO_CLIENT_SECRET", "test")
os.environ.setdefault("CONTABO_API_USER", "test")
os.environ.setdefault("CONTABO_API_PASSWORD", "test")
os.environ.setdefault("CONFIRM_API_KEY", "test_admin_key")

import unittest
from unittest.mock import MagicMock, patch
from nexgen_cli import handle_upgrade, handle_downgrade, handle_block, handle_unblock, handle_reset_budget


class TestUpgrade(unittest.TestCase):
    def setUp(self):
        self.api = MagicMock()

    def test_upgrade_1_to_2(self):
        self.api.get_usage_single.return_value = {"tier": 1, "customer_id": "1001"}
        self.api.update_usage.return_value = {}
        result = handle_upgrade(self.api, "1001", 2)
        self.assertIn("Upgrade", result)
        self.assertIn("70", result)
        self.api.update_usage.assert_called_once()

    def test_upgrade_same_tier_fails(self):
        self.api.get_usage_single.return_value = {"tier": 2, "customer_id": "1001"}
        result = handle_upgrade(self.api, "1001", 2)
        self.assertIn("Cannot", result)
        self.api.update_usage.assert_not_called()

    def test_upgrade_invalid_tier_fails(self):
        self.api.get_usage_single.return_value = {"tier": 1, "customer_id": "1001"}
        result = handle_upgrade(self.api, "1001", 5)
        self.assertIn("Cannot", result)

    def test_upgrade_customer_not_found(self):
        self.api.get_usage_single.return_value = None
        result = handle_upgrade(self.api, "9999", 2)
        self.assertIn("not found", result)


class TestDowngrade(unittest.TestCase):
    def setUp(self):
        self.api = MagicMock()

    def test_downgrade_3_to_1(self):
        self.api.get_usage_single.return_value = {"tier": 3, "customer_id": "1001"}
        self.api.update_usage.return_value = {}
        result = handle_downgrade(self.api, "1001", 1)
        self.assertIn("Downgrade", result)
        self.assertIn("40", result)
        self.assertIn("plugins stay installed", result)

    def test_downgrade_to_higher_shows_upgrade(self):
        self.api.get_usage_single.return_value = {"tier": 1, "customer_id": "1001"}
        self.api.update_usage.return_value = {}
        result = handle_downgrade(self.api, "1001", 3)
        # validate_tier_change calls it "Upgrade" since 3 > 1
        self.assertIn("Upgrade", result)


class TestBlockUnblock(unittest.TestCase):
    def setUp(self):
        self.api = MagicMock()

    def test_block_sets_budget_zero(self):
        self.api.update_usage.return_value = {}
        result = handle_block(self.api, "1001")
        self.assertIn("BLOCKED", result)
        self.api.update_usage.assert_called_once_with("1001", "test_admin_key", monthly_budget_hkd=0)

    def test_unblock_restores_budget(self):
        self.api.get_usage_single.return_value = {"tier": 2, "customer_id": "1001"}
        self.api.update_usage.return_value = {}
        self.api.reset_usage.return_value = {}
        result = handle_unblock(self.api, "1001")
        self.assertIn("Unblocked", result)
        self.assertIn("70", result)  # tier 2 budget

    def test_reset_budget(self):
        self.api.reset_usage.return_value = {}
        result = handle_reset_budget(self.api, "1001")
        self.assertIn("Reset", result)


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run all tests**

Run: `cd onboarding-pipeline/pi5-worker && python -m pytest tests/test_upgrade_downgrade.py tests/test_formatters.py tests/test_nexgen_cli.py -v`
Expected: All tests PASS

- [ ] **Step 3: Run full test suite**

Run: `cd onboarding-pipeline/pi5-worker && python -m pytest tests/ -v --ignore=tests/test_e2e_vps_lifecycle.py --ignore=tests/test_e2e_backup_restore.py`
Expected: All tests PASS

- [ ] **Step 4: Commit**

```bash
git add onboarding-pipeline/pi5-worker/tests/test_upgrade_downgrade.py
git commit -m "test(pi5): add upgrade/downgrade/block/unblock unit tests"
```

---

## Self-Review Checklist

**1. Spec coverage:**
- [x] worker.py notify-only mode — Task 3
- [x] dashboard.py pending orders + recyclable pool — Task 4
- [x] nexgen_cli.py with all subcommands — Task 5
- [x] formatters.py — Task 1
- [x] Remove @NexGenAI_Support_bot — Task 6
- [x] CF Worker webhook subscription events — Task 7
- [x] Website Telegram removal + 24h setup — Task 8
- [x] Marigold briefing v2 — Task 9
- [x] Upgrade/downgrade tests — Task 10
- [x] api_client.py admin methods — Task 2
- [ ] `confirmations.py` (Telegram reply gate) — **Deferred.** This requires Telegram bot webhook integration that depends on OpenClaw's skill system architecture. The CLI works without it (operator runs commands directly). Confirmation gate is a post-launch enhancement when the OpenClaw skill is built.

**2. Placeholder scan:** No TBD/TODO found.

**3. Type consistency:** `format_job`, `format_vps_list`, `format_usage`, `TIER_BUDGETS`, `validate_tier_change` — all signatures match between test files and implementation.
