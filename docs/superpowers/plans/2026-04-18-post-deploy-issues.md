# Post-Deploy Issues Fix Plan (Issues 15–17 + Briefing Audit)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the three remaining post-deploy issues discovered during the Run 1 E2E test (dashboard business view, customer email notification, customer bot Telegram notification) plus complete the Marigold briefing audit.

**Architecture:** Four independent sub-plans, each producing working, testable software. Issues do not share state and can be executed in any order or parallelised across worktrees.

**Tech Stack:** Python 3.11 (Pi5 worker), TypeScript Cloudflare Workers, React + Vite + i18next (website), pytest + vitest, Telegram Bot API, Resend (transactional email).

---

## Scope & Independence

| Part | Scope | Depends on |
|------|-------|-----------|
| A | Issue 15 — dashboard business view rewrite | none |
| B | Issue 16 — customer email + order-number display | Resend account |
| C | Issue 17 — customer bot webhook + notification reliability | none |
| D | Edit 2 — Marigold briefing audit | none |

Each part can be committed and shipped independently. They touch different files. Pick any order.

---

## Pre-work: Shared Setup

### Task 0: Confirm working directory + baseline tests

**Files:**
- Read: `onboarding-pipeline/pi5-worker/tests/` (confirm baseline)
- Read: `onboarding-pipeline/cf-worker/test/` (confirm baseline)

- [ ] **Step 1: Verify Pi5 worker tests pass from scratch**

Run: `cd onboarding-pipeline/pi5-worker && python -m pytest -q`
Expected: all pass (baseline ~84/84)

- [ ] **Step 2: Verify CF Worker tests pass**

Run: `cd onboarding-pipeline/cf-worker && npx vitest run`
Expected: all pass (baseline ~72/72)

- [ ] **Step 3: Confirm branch state**

Run: `git status`
Expected: working tree matches the current E2E progress state. If dirty with unrelated changes, stash first.

---

# PART A — Issue 15: Dashboard Business View Redesign

**Problem:** `onboarding-pipeline/pi5-worker/dashboard.py` currently renders ops-oriented sections (Gateway/Watchdog/Qdrant/SearXNG health, Pi5 disk/mem) that are noise for the business operator. Missing: customer roster, MRR, VPS expiry with dates, token allocation vs usage, cost overview.

**Approach:** Rewrite dashboard to consume business data from CF Worker endpoints that already exist (`/api/usage`, `/api/vps`, `/api/jobs`) plus add an MRR computation layer. Remove all per-service health probes and the Pi5 Worker section.

**Target sections in new dashboard:**
1. Business Summary (active customers, MRR HKD, total API cost, margin)
2. Customer Overview (job_id, tier, bot username, email, status, created_at)
3. VPS Expiry & Billing (vps_id, customer, status, billing_start, days until cancel_deadline)
4. Token Allocation vs Usage (customer, tier, budget, spend, percent, requests, blocked)
5. Pending Orders (unchanged from current)
6. Recyclable Pool (unchanged)
7. Backups (unchanged — but only show most recent per customer)
8. Warnings (filter to business-relevant only: VPS expiring, customer blocked, backup stale)

### Task A1: Snapshot test infrastructure for dashboard

**Files:**
- Create: `onboarding-pipeline/pi5-worker/tests/test_dashboard.py`

- [ ] **Step 1: Write failing snapshot test for the new business summary**

```python
"""Tests for dashboard business view."""
from unittest.mock import patch, MagicMock
import pytest

import dashboard


FAKE_USAGE = [
    {"customer_id": "1001", "tier": 1, "current_spend_hkd": 12.5, "monthly_budget_hkd": 40,
     "total_requests": 320, "blocked_at": None},
    {"customer_id": "1002", "tier": 2, "current_spend_hkd": 45.0, "monthly_budget_hkd": 70,
     "total_requests": 1100, "blocked_at": None},
    {"customer_id": "1003", "tier": 3, "current_spend_hkd": 101.0, "monthly_budget_hkd": 100,
     "total_requests": 2500, "blocked_at": "2026-04-18T00:00:00Z"},
]

FAKE_VPS = [
    {"vps_id": "203187256", "contabo_ip": "161.97.88.8", "customer_id": "1002",
     "status": "active", "tier": 2, "billing_start": "2026-04-12T00:00:00Z",
     "cancel_deadline": None},
]

FAKE_JOBS = [
    {"id": "1001", "tier": 1, "bot_username": "c1bot", "email": "a@b.com",
     "status": "complete", "created_at": "2026-03-01T00:00:00Z"},
    {"id": "1002", "tier": 2, "bot_username": "c2bot", "email": "c@d.com",
     "status": "complete", "created_at": "2026-04-11T00:00:00Z"},
    {"id": "1003", "tier": 3, "bot_username": "c3bot", "email": "e@f.com",
     "status": "complete", "created_at": "2026-04-15T00:00:00Z"},
]


def test_business_summary_computes_mrr_per_tier():
    # Tier 1: 248, Tier 2: 398, Tier 3: 598 (monthly list price)
    out = dashboard.business_summary_section(jobs=FAKE_JOBS, usage=FAKE_USAGE)
    assert "Active Customers" in out
    assert "3" in out  # 3 complete jobs = 3 active
    assert "HK$1,244" in out  # 248 + 398 + 598 = 1244
    assert "Total API Cost" in out
    assert "$158" in out or "$158.50" in out  # 12.5 + 45.0 + 101.0 = 158.5
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd onboarding-pipeline/pi5-worker && python -m pytest tests/test_dashboard.py::test_business_summary_computes_mrr_per_tier -v`
Expected: FAIL with `AttributeError: module 'dashboard' has no attribute 'business_summary_section'`

### Task A2: Implement `business_summary_section`

**Files:**
- Modify: `onboarding-pipeline/pi5-worker/dashboard.py`

- [ ] **Step 1: Add tier price constants + new section function**

Add near the top of `dashboard.py` (after imports):

```python
# Monthly list prices per tier in HKD (matches website pricing page)
TIER_MONTHLY_HKD = {1: 248, 2: 398, 3: 598}


def business_summary_section(jobs=None, usage=None):
    """High-level business metrics: active customers, MRR, total API cost, margin."""
    jobs = jobs if jobs is not None else (_api("/api/jobs?status=complete") or {}).get("jobs", [])
    usage = usage if usage is not None else (_api("/api/usage", admin=True) or {}).get("usage", [])

    active = [j for j in jobs if j.get("status") == "complete"]
    mrr = sum(TIER_MONTHLY_HKD.get(j.get("tier"), 0) for j in active)
    api_cost = sum((u.get("current_spend_hkd") or 0) for u in usage)
    margin = mrr - api_cost

    return (
        "## Business Summary\n\n"
        "| Metric | Value |\n"
        "|--------|-------|\n"
        f"| Active Customers | **{len(active)}** |\n"
        f"| MRR (HKD) | **HK${mrr:,}** |\n"
        f"| Total API Cost (this month) | ${api_cost:,.2f} |\n"
        f"| Gross Margin | HK${margin:,.2f} |\n"
    )
```

- [ ] **Step 2: Run test**

Run: `python -m pytest tests/test_dashboard.py::test_business_summary_computes_mrr_per_tier -v`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add onboarding-pipeline/pi5-worker/dashboard.py onboarding-pipeline/pi5-worker/tests/test_dashboard.py
git commit -m "feat(dashboard): add business_summary_section with MRR and margin"
```

### Task A3: Customer Overview section (replaces current vps_section)

**Files:**
- Modify: `onboarding-pipeline/pi5-worker/dashboard.py`
- Modify: `onboarding-pipeline/pi5-worker/tests/test_dashboard.py`

- [ ] **Step 1: Write failing test**

Append to `tests/test_dashboard.py`:

```python
def test_customer_overview_section_lists_completed_jobs():
    out = dashboard.customer_overview_section(jobs=FAKE_JOBS)
    for jid in ["1001", "1002", "1003"]:
        assert jid in out
    assert "@c2bot" in out
    assert "c@d.com" in out
    # ensure we do NOT show ops noise
    assert "Gateway" not in out
    assert "Qdrant" not in out
```

- [ ] **Step 2: Run test — expect fail**

Run: `python -m pytest tests/test_dashboard.py::test_customer_overview_section_lists_completed_jobs -v`
Expected: FAIL

- [ ] **Step 3: Implement `customer_overview_section`**

Add to `dashboard.py`:

```python
def customer_overview_section(jobs=None):
    """Customer roster — who paid, tier, bot, email, status."""
    jobs = jobs if jobs is not None else (_api("/api/jobs?status=complete") or {}).get("jobs", [])

    lines = ["## Customer Overview\n",
             "| Job ID | Tier | Bot | Email | Created | Status |",
             "|--------|------|-----|-------|---------|--------|"]
    if not jobs:
        lines.append("| *(no customers yet)* | | | | | |")
        return "\n".join(lines) + "\n"
    for j in jobs:
        jid = j.get("id", "?")
        tier = j.get("tier", "?")
        bot = j.get("bot_username", "?")
        email = j.get("email", "?")
        created = (j.get("created_at") or "")[:10]
        status = j.get("status", "?")
        lines.append(f"| {jid} | {tier} | @{bot} | {email} | {created} | {status} |")
    return "\n".join(lines) + "\n"
```

- [ ] **Step 4: Run test — expect pass**

Run: `python -m pytest tests/test_dashboard.py::test_customer_overview_section_lists_completed_jobs -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add onboarding-pipeline/pi5-worker/dashboard.py onboarding-pipeline/pi5-worker/tests/test_dashboard.py
git commit -m "feat(dashboard): add customer_overview_section"
```

### Task A4: VPS Expiry & Billing section

**Files:**
- Modify: `onboarding-pipeline/pi5-worker/dashboard.py`
- Modify: `onboarding-pipeline/pi5-worker/tests/test_dashboard.py`

- [ ] **Step 1: Write failing test**

Append to `tests/test_dashboard.py`:

```python
def test_vps_expiry_section_shows_days_to_cancel_deadline():
    vps = [
        {"vps_id": "1", "contabo_ip": "1.1.1.1", "customer_id": "1001",
         "status": "active", "billing_start": "2026-01-01T00:00:00Z",
         "cancel_deadline": None},
        {"vps_id": "2", "contabo_ip": "2.2.2.2", "customer_id": "1002",
         "status": "cancelling", "billing_start": "2026-01-01T00:00:00Z",
         "cancel_deadline": "2026-05-01T00:00:00Z"},
    ]
    out = dashboard.vps_expiry_section(vps=vps)
    assert "1001" in out and "1002" in out
    assert "active" in out
    assert "cancelling" in out
    # deadline shown in human form, days remaining computed
    assert "2026-05-01" in out
```

- [ ] **Step 2: Run — expect fail**

- [ ] **Step 3: Implement**

```python
def vps_expiry_section(vps=None):
    """VPS billing + expiry overview (active + cancelling VPS together)."""
    if vps is None:
        active = (_api("/api/vps?status=active") or {}).get("vps_list") or []
        cancelling = (_api("/api/vps?status=cancelling") or {}).get("vps_list") or []
        vps = list(active) + list(cancelling)

    lines = ["## VPS Expiry & Billing\n",
             "| VPS ID | Customer | IP | Status | Billing Start | Cancel Deadline | Days Left |",
             "|--------|----------|----|--------|---------------|-----------------|-----------|"]
    if not vps:
        lines.append("| *(no VPS)* | | | | | | |")
        return "\n".join(lines) + "\n"
    for v in vps:
        vid = v.get("vps_id", "?")
        cid = v.get("customer_id", "?")
        ip = v.get("contabo_ip", "?")
        st = v.get("status", "?")
        bstart = (v.get("billing_start") or "")[:10]
        deadline = (v.get("cancel_deadline") or "")[:10]
        days_left = "—"
        if deadline:
            try:
                dl = datetime.fromisoformat(v["cancel_deadline"].replace("Z", "+00:00"))
                days_left = str((dl - datetime.now(timezone.utc)).days)
            except Exception:
                pass
        lines.append(f"| {vid} | {cid} | {ip} | {st} | {bstart} | {deadline or '—'} | {days_left} |")
    return "\n".join(lines) + "\n"
```

- [ ] **Step 4: Run test — expect pass**
- [ ] **Step 5: Commit**

```bash
git commit -am "feat(dashboard): add vps_expiry_section replacing per-service health probe"
```

### Task A5: Rewire `generate()` + remove old sections

**Files:**
- Modify: `onboarding-pipeline/pi5-worker/dashboard.py`
- Modify: `onboarding-pipeline/pi5-worker/tests/test_dashboard.py`

- [ ] **Step 1: Write failing test for new generate output**

```python
def test_generate_uses_new_business_sections(tmp_path, monkeypatch):
    monkeypatch.setattr(dashboard, "OUTPUT", tmp_path / "dash.md")
    monkeypatch.setattr(dashboard, "_api", lambda *a, **k: {"jobs": FAKE_JOBS, "usage": FAKE_USAGE, "vps_list": FAKE_VPS})
    monkeypatch.setattr(dashboard, "_vps_health", lambda ip: {})  # no-op
    report = dashboard.generate()
    assert "## Business Summary" in report
    assert "## Customer Overview" in report
    assert "## VPS Expiry & Billing" in report
    # Old ops sections must be gone
    assert "## Pi5 Worker" not in report
    assert "| Gateway |" not in report
    assert "| Watchdog |" not in report
    assert "| Qdrant |" not in report
```

- [ ] **Step 2: Run — expect fail**

- [ ] **Step 3: Rewrite `generate()` and delete obsolete sections**

In `dashboard.py`, replace the `generate()` function:

```python
def generate():
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    sections = [
        f"# NexGen Business Dashboard\n\n**Updated:** {now}\n",
        warnings_section(),
        business_summary_section(),
        customer_overview_section(),
        vps_expiry_section(),
        usage_section(),
        pending_orders_section(),
        recyclable_pool_section(),
        backup_section(),
        "---\n*Auto-generated by dashboard.py*\n",
    ]
    report = "\n".join(sections)
    OUTPUT.write_text(report)
    print(f"Dashboard written to {OUTPUT}")
    return report
```

Also **delete** these now-unused functions (they caused the ops noise):
- `worker_section` (lines 74-89)
- `vps_section` (lines 141-174) — replaced by `vps_expiry_section`
- `_vps_health` (lines 54-71) — no longer called

- [ ] **Step 4: Run all dashboard tests**

Run: `python -m pytest tests/test_dashboard.py -v`
Expected: all 4 tests pass

- [ ] **Step 5: Run full Pi5 suite**

Run: `python -m pytest -q`
Expected: all pass, no regressions

- [ ] **Step 6: Commit**

```bash
git commit -am "feat(dashboard): business view — remove ops noise, add MRR/customers/VPS expiry"
```

### Task A6: Update warnings_section to drop Pi5 disk check

**Files:**
- Modify: `onboarding-pipeline/pi5-worker/dashboard.py` (lines 243-311)

- [ ] **Step 1: Remove the Pi5 disk warning block**

In `warnings_section`, delete lines that check `df /home` (worker service status and Pi5 disk). Keep: backup-age, VPS-cancel-deadline, customer-blocked (new).

Replace the `warnings_section` body with:

```python
def warnings_section():
    warnings = []

    # Backup age
    active = BACKUPS_DIR / "active"
    if active.exists():
        for d in active.iterdir():
            if not d.is_dir():
                continue
            meta_f = d / "backup-meta.json"
            if meta_f.exists():
                try:
                    m = json.loads(meta_f.read_text())
                    ts = m.get("timestamp", "")
                    if ts:
                        dt = datetime.fromisoformat(ts)
                        age_days = (datetime.now(timezone.utc) - dt).days
                        if age_days > 7:
                            warnings.append(f"Backup for {d.name} is {age_days} days old")
                except Exception:
                    pass

    # VPS cancel deadlines
    cancel_data = _api("/api/vps?status=cancelling")
    cancel_instances = (cancel_data or {}).get("vps_list") or []
    for v in cancel_instances:
        deadline = v.get("cancel_deadline", "")
        if deadline:
            try:
                dl = datetime.fromisoformat(deadline.replace("Z", "+00:00"))
                days_left = (dl - datetime.now(timezone.utc)).days
                vid = v.get("vps_id", "?")
                if days_left <= 7:
                    warnings.append(f"VPS {vid} deadline in **{days_left} days**")
                elif days_left <= 14:
                    warnings.append(f"VPS {vid} deadline in {days_left} days")
            except Exception:
                pass

    # Blocked customers
    usage = (_api("/api/usage", admin=True) or {}).get("usage") or []
    for u in usage:
        if u.get("blocked_at"):
            warnings.append(f"Customer {u.get('customer_id')} is **blocked** (budget exceeded)")

    if not warnings:
        return "## Status: All OK\n\nNo warnings.\n"

    return "## Warnings\n\n" + "\n".join(f"- {w}" for w in warnings) + "\n"
```

- [ ] **Step 2: Run all tests**

Run: `python -m pytest -q`
Expected: all pass

- [ ] **Step 3: Smoke-run dashboard locally**

Run: `python dashboard.py`
Expected: output file written; output is business-focused; no Gateway/Watchdog/Qdrant columns.

- [ ] **Step 4: Commit**

```bash
git commit -am "refactor(dashboard): warnings focus on business blockers (VPS, backup, blocked customers)"
```

---

# PART B — Issue 16: Customer Email + Order Number Display

**Problem:** Customer never received an email after deploy. Order number exists in React state but is never rendered. Codebase has zero email capability.

**Approach:** Add Resend transactional email provider. New `EmailClient` wrapper in pi5-worker, called from `deployer.py` on `DEPLOYMENT_SUCCESS`. Separately, display `orderId` on the onboarding confirmation screen.

**Why Resend:** free tier 3,000 emails/month, HK-accessible, simple REST, dev-friendly DX. Alternatives considered: SendGrid (US-centric signup friction), Mailgun (requires verified domain before any send), Postmark (pay from first email). Resend lets us test today.

**Pre-req (manual, before this plan):** sign up at resend.com, create API key, add a sending domain `no-reply@3nexgen.com` (DKIM/SPF). Add to Pi5 `~/nexgen-worker/.env`: `RESEND_API_KEY=re_xxx`, `RESEND_FROM=NexGen <no-reply@3nexgen.com>`.

### Task B1: EmailClient module with TDD

**Files:**
- Create: `onboarding-pipeline/pi5-worker/email_client.py`
- Create: `onboarding-pipeline/pi5-worker/tests/test_email_client.py`

- [ ] **Step 1: Write failing test for EmailClient.send_ready_notification**

```python
"""Tests for Resend email client."""
from unittest.mock import patch, MagicMock
import pytest
from email_client import EmailClient


def test_send_ready_notification_calls_resend_api():
    client = EmailClient(api_key="re_test", from_addr="NexGen <no-reply@3nexgen.com>")
    mock_resp = MagicMock(status_code=200, ok=True)
    mock_resp.json.return_value = {"id": "abc123"}
    with patch("email_client.requests.post", return_value=mock_resp) as mock_post:
        ok = client.send_ready_notification(
            to="user@example.com",
            order_id="1002",
            tier=2,
            bot_username="NexGen_E2E_bot",
        )
    assert ok is True
    call = mock_post.call_args
    assert "resend.com" in call.args[0]
    body = call.kwargs["json"]
    assert body["to"] == ["user@example.com"]
    assert "1002" in body["subject"] or "1002" in body["html"]
    assert "NexGen_E2E_bot" in body["html"]


def test_send_ready_notification_returns_false_on_http_error():
    client = EmailClient(api_key="re_test", from_addr="NexGen <no-reply@3nexgen.com>")
    mock_resp = MagicMock(status_code=401, ok=False, text="Unauthorized")
    with patch("email_client.requests.post", return_value=mock_resp):
        ok = client.send_ready_notification(to="u@x.com", order_id="1", tier=1, bot_username="b")
    assert ok is False


def test_send_ready_notification_returns_false_on_network_error():
    import requests
    client = EmailClient(api_key="re_test", from_addr="NexGen <no-reply@3nexgen.com>")
    with patch("email_client.requests.post", side_effect=requests.ConnectionError("boom")):
        ok = client.send_ready_notification(to="u@x.com", order_id="1", tier=1, bot_username="b")
    assert ok is False


def test_no_send_when_api_key_missing():
    client = EmailClient(api_key="", from_addr="x@y.com")
    with patch("email_client.requests.post") as mock_post:
        ok = client.send_ready_notification(to="u@x.com", order_id="1", tier=1, bot_username="b")
    assert ok is False
    mock_post.assert_not_called()
```

- [ ] **Step 2: Run — expect fail (module does not exist)**

Run: `cd onboarding-pipeline/pi5-worker && python -m pytest tests/test_email_client.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'email_client'`

- [ ] **Step 3: Implement `email_client.py`**

```python
"""Resend transactional email client for customer notifications."""
import logging
import requests

logger = logging.getLogger(__name__)

TIER_NAMES = {1: "基本版 Starter", 2: "專業版 Pro", 3: "旗艦版 Elite"}


class EmailClient:
    """Thin Resend API wrapper for ready + failure customer emails."""

    def __init__(self, api_key: str, from_addr: str):
        self.api_key = api_key
        self.from_addr = from_addr
        self.base_url = "https://api.resend.com/emails"

    def send_ready_notification(self, to: str, order_id: str, tier: int, bot_username: str) -> bool:
        if not self.api_key:
            logger.warning("EmailClient: RESEND_API_KEY missing, skipping email send")
            return False
        tier_name = TIER_NAMES.get(tier, f"Tier {tier}")
        subject = f"[NexGen] 你的 AI 助手已準備就緒 — 訂單 #{order_id}"
        html = (
            f"<div style='font-family: sans-serif; max-width: 560px;'>"
            f"<h2 style='color:#ff8c42;'>你的 AI 助手已準備就緒</h2>"
            f"<p>訂單號碼：<strong>#{order_id}</strong></p>"
            f"<p>方案：<strong>{tier_name}</strong></p>"
            f"<p>Telegram Bot：<a href='https://t.me/{bot_username}'>@{bot_username}</a></p>"
            f"<p>點擊上方連結開始對話。首次使用時，請對 Bot 發送 /start。</p>"
            f"<hr/><p style='color:#888;font-size:12px;'>"
            f"如有問題，請聯絡 support@3nexgen.com 並附上訂單號碼。"
            f"</p></div>"
        )
        try:
            resp = requests.post(
                self.base_url,
                headers={"Authorization": f"Bearer {self.api_key}"},
                json={"from": self.from_addr, "to": [to], "subject": subject, "html": html},
                timeout=15,
            )
            if not resp.ok:
                logger.error("EmailClient send failed %s: %s", resp.status_code, resp.text[:200])
                return False
            return True
        except requests.RequestException as e:
            logger.error("EmailClient network error: %s", e)
            return False
```

- [ ] **Step 4: Run tests — expect all 4 pass**

Run: `python -m pytest tests/test_email_client.py -v`
Expected: 4 passed

- [ ] **Step 5: Commit**

```bash
git add onboarding-pipeline/pi5-worker/email_client.py onboarding-pipeline/pi5-worker/tests/test_email_client.py
git commit -m "feat(pi5): add Resend EmailClient with ready notification template"
```

### Task B2: Wire EmailClient into deployer.py

**Files:**
- Modify: `onboarding-pipeline/pi5-worker/config.py` (add RESEND_API_KEY, RESEND_FROM)
- Modify: `onboarding-pipeline/pi5-worker/deployer.py`
- Modify: `onboarding-pipeline/pi5-worker/tests/test_deploy_bugs.py`

- [ ] **Step 1: Add config entries**

In `config.py`, add (near other env reads):

```python
RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
RESEND_FROM = os.environ.get("RESEND_FROM", "NexGen <no-reply@3nexgen.com>")
```

- [ ] **Step 2: Write failing test — deployer calls EmailClient on success**

Append to `tests/test_deploy_bugs.py`:

```python
class TestDeployerSendsEmailOnSuccess:
    def test_deploy_sends_ready_email_when_agent_succeeds(self, monkeypatch):
        import deployer as dep_mod
        dep = dep_mod.Deployer(api=MagicMock(), notifier=MagicMock())
        job = {"id": "9999", "tier": 2, "telegram_user_id": "42",
               "bot_token": "t", "bot_username": "b", "email": "x@y.com"}
        # Stub all the heavy bits
        monkeypatch.setattr(dep, "_get_bot_from_job", lambda j: {"token": "t", "username": "b"})
        monkeypatch.setattr(dep, "_provision_vps", lambda *a, **k: "1.2.3.4")
        monkeypatch.setattr(dep_mod.anyio, "run", lambda *a, **k: True)
        monkeypatch.setattr(dep_mod.Notifier, "set_webhook", lambda *a, **k: True)
        monkeypatch.setattr(dep_mod.Notifier, "send_customer_message", lambda *a, **k: True)

        sent = []
        class FakeEmail:
            def send_ready_notification(self, **kwargs):
                sent.append(kwargs)
                return True
        monkeypatch.setattr(dep, "email_client", FakeEmail(), raising=False)
        # Deployer must look up email_client attr; make the attribute exist
        dep.email_client = FakeEmail()

        ok = dep.deploy(job)
        assert ok is True
        assert len(sent) == 1
        assert sent[0]["to"] == "x@y.com"
        assert sent[0]["order_id"] == "9999"
        assert sent[0]["tier"] == 2
        assert sent[0]["bot_username"] == "b"
```

- [ ] **Step 3: Run — expect fail**

Run: `python -m pytest tests/test_deploy_bugs.py::TestDeployerSendsEmailOnSuccess -v`
Expected: FAIL

- [ ] **Step 4: Implement email call in `deployer.py`**

In `Deployer.__init__`, add:

```python
from email_client import EmailClient
import config
self.email_client = EmailClient(api_key=config.RESEND_API_KEY, from_addr=config.RESEND_FROM)
```

In `deploy()`, after `self.api.update_job(job_id, "complete")` and before `return True`, add:

```python
# Send customer email (best-effort; log but don't fail deploy if email fails)
customer_email = job.get("email")
if customer_email:
    ok = self.email_client.send_ready_notification(
        to=customer_email,
        order_id=job_id,
        tier=tier,
        bot_username=bot.get("username", ""),
    )
    if not ok:
        print(f"[deployer] {job_id}: email send failed — customer won't receive notification", flush=True)
```

- [ ] **Step 5: Run test — expect pass**

Run: `python -m pytest tests/test_deploy_bugs.py::TestDeployerSendsEmailOnSuccess -v`
Expected: PASS

- [ ] **Step 6: Run full pi5 suite**

Run: `python -m pytest -q`
Expected: all pass

- [ ] **Step 7: Commit**

```bash
git commit -am "feat(deployer): send customer ready email via Resend on deploy success"
```

### Task B3: Display order number on confirmation screen (website)

**Files:**
- Modify: `website-lovable/src/src/pages/Onboarding.tsx` (around line 192-204)
- Modify: `website-lovable/src/src/i18n/locales/zh-HK/onboarding.json`
- Modify: `website-lovable/src/src/i18n/locales/zh-CN/onboarding.json`
- Modify: `website-lovable/src/src/i18n/locales/en/onboarding.json`
- Modify: `website-lovable/src/src/i18n/locales/es/onboarding.json`
- Modify: `website-lovable/src/src/i18n/locales/ja/onboarding.json`
- Modify: `website-lovable/src/src/i18n/locales/ru/onboarding.json`

- [ ] **Step 1: Add i18n key to all 6 locales**

In each `onboarding.json`, under the `payment` object, add two keys. Examples:

zh-HK:
```json
"orderNumber": "你的訂單號碼",
"orderNumberHint": "請保留此號碼以便跟進"
```

en:
```json
"orderNumber": "Your order number",
"orderNumberHint": "Keep this number for reference"
```

zh-CN:
```json
"orderNumber": "您的订单号",
"orderNumberHint": "请保留此号码以便跟进"
```

es:
```json
"orderNumber": "Número de pedido",
"orderNumberHint": "Guarda este número para referencia"
```

ja:
```json
"orderNumber": "注文番号",
"orderNumberHint": "この番号はお問い合わせの際に必要です"
```

ru:
```json
"orderNumber": "Номер заказа",
"orderNumberHint": "Сохраните этот номер для справки"
```

- [ ] **Step 2: Render orderId in confirmation screen**

In `Onboarding.tsx`, locate the `if (submitted)` block (around line 192). After the `<p>{t('payment.selectedPlan')}...</p>` line and before `<p>{t('payment.choosePayment')}</p>`, insert:

```tsx
{orderId && (
  <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 mx-auto max-w-sm">
    <p className="text-sm text-muted-foreground">{t('payment.orderNumber')}</p>
    <p className="text-2xl font-mono font-semibold text-primary mt-1">#{orderId}</p>
    <p className="text-xs text-muted-foreground mt-2">{t('payment.orderNumberHint')}</p>
  </div>
)}
```

- [ ] **Step 3: Smoke-test in browser**

Run: `cd website-lovable/src && bun run dev`
Open: http://localhost:5173/onboarding
Submit the form with any plan. Expected: order number block visible with `#<id>` in mono font and the hint text.

- [ ] **Step 4: Type-check**

Run: `cd website-lovable/src && bun run build`
Expected: build succeeds

- [ ] **Step 5: Commit**

```bash
git add website-lovable/src/src/pages/Onboarding.tsx website-lovable/src/src/i18n/locales/
git commit -m "feat(website): show order number on payment confirmation screen"
```

---

# PART C — Issue 17: Customer Bot Webhook + Notification Reliability

**Problem:**
- `getWebhookInfo` returns empty URL — `set_webhook()` silently failed.
- Telegram rejects the self-signed cert on `https://{server_ip}:18789/webhook`.
- `send_customer_message()` returns False without logging; deployer ignores return value.

**Approach:** Three sub-fixes:
1. Add structured logging to all `notifier.py` static methods, return diagnostic detail.
2. Check return values in `deployer.py` and surface failures to owner Telegram.
3. Fix webhook SSL by uploading the VPS self-signed cert to Telegram (Telegram allows `certificate` multipart upload for self-signed).

### Task C1: Add logging + error detail to notifier static methods

**Files:**
- Modify: `onboarding-pipeline/pi5-worker/notifier.py`
- Create: `onboarding-pipeline/pi5-worker/tests/test_notifier_logging.py`

- [ ] **Step 1: Write failing test — send_customer_message logs on failure**

```python
"""Tests for notifier error logging."""
import logging
from unittest.mock import patch, MagicMock
import pytest
import notifier


def test_send_customer_message_logs_telegram_403(caplog):
    caplog.set_level(logging.ERROR)
    mock_resp = MagicMock(ok=False, status_code=403, text='{"error_code":403,"description":"Forbidden: bot was blocked"}')
    with patch("notifier.requests.post", return_value=mock_resp):
        ok = notifier.Notifier.send_customer_message("t", "42", "hi")
    assert ok is False
    assert any("403" in r.message for r in caplog.records)
    assert any("42" in r.message for r in caplog.records)


def test_set_webhook_logs_telegram_rejection(caplog):
    caplog.set_level(logging.ERROR)
    mock_resp = MagicMock(ok=False, status_code=400,
                          text='{"ok":false,"description":"Bad webhook: SSL error"}')
    with patch("notifier.requests.post", return_value=mock_resp):
        ok = notifier.Notifier.set_webhook("t", "https://x/webhook")
    assert ok is False
    assert any("SSL" in r.message or "400" in r.message for r in caplog.records)
```

- [ ] **Step 2: Run — expect fail (currently methods don't log)**

Run: `python -m pytest tests/test_notifier_logging.py -v`
Expected: FAIL (assertions about log records fail)

- [ ] **Step 3: Modify notifier.py — add module logger + log on failure**

Replace the two static methods (`send_customer_message`, `set_webhook`) in `notifier.py`:

```python
import logging
logger = logging.getLogger(__name__)

# ...existing class...

    @staticmethod
    def send_customer_message(bot_token: str, chat_id: str, message: str) -> bool:
        """Send a message to a customer via their bot."""
        try:
            resp = requests.post(
                f"https://api.telegram.org/bot{bot_token}/sendMessage",
                json={"chat_id": chat_id, "text": message},
                timeout=10,
            )
            if not resp.ok:
                logger.error(
                    "send_customer_message FAILED chat_id=%s status=%s body=%s",
                    chat_id, resp.status_code, resp.text[:200],
                )
                return False
            return True
        except requests.RequestException as e:
            logger.error("send_customer_message NETWORK_ERROR chat_id=%s err=%s", chat_id, e)
            return False

    @staticmethod
    def set_webhook(bot_token: str, url: str, certificate_path: str | None = None) -> bool:
        """Set webhook URL for a customer's bot. Optionally upload self-signed cert."""
        try:
            if certificate_path:
                with open(certificate_path, "rb") as cert:
                    resp = requests.post(
                        f"https://api.telegram.org/bot{bot_token}/setWebhook",
                        data={"url": url},
                        files={"certificate": cert},
                        timeout=15,
                    )
            else:
                resp = requests.post(
                    f"https://api.telegram.org/bot{bot_token}/setWebhook",
                    json={"url": url},
                    timeout=10,
                )
            if not resp.ok:
                logger.error(
                    "set_webhook FAILED url=%s status=%s body=%s",
                    url, resp.status_code, resp.text[:200],
                )
                return False
            return True
        except (requests.RequestException, OSError) as e:
            logger.error("set_webhook ERROR url=%s err=%s", url, e)
            return False
```

- [ ] **Step 4: Run tests — expect pass**

Run: `python -m pytest tests/test_notifier_logging.py -v`
Expected: 2 passed

- [ ] **Step 5: Commit**

```bash
git commit -am "feat(notifier): log Telegram API failures with context; set_webhook accepts cert"
```

### Task C2: Check return values in deployer.py + surface failures

**Files:**
- Modify: `onboarding-pipeline/pi5-worker/deployer.py`
- Modify: `onboarding-pipeline/pi5-worker/tests/test_deploy_bugs.py`

- [ ] **Step 1: Write failing test — owner notified when customer message fails**

Append to `tests/test_deploy_bugs.py`:

```python
class TestDeployerSurfacesCustomerNotifyFailure:
    def test_failed_customer_ready_message_alerts_owner(self, monkeypatch):
        import deployer as dep_mod
        owner_notifier = MagicMock()
        dep = dep_mod.Deployer(api=MagicMock(), notifier=owner_notifier)
        job = {"id": "8888", "tier": 2, "telegram_user_id": "42",
               "bot_token": "t", "bot_username": "b", "email": ""}
        monkeypatch.setattr(dep, "_get_bot_from_job", lambda j: {"token": "t", "username": "b"})
        monkeypatch.setattr(dep, "_provision_vps", lambda *a, **k: "1.2.3.4")
        monkeypatch.setattr(dep_mod.anyio, "run", lambda *a, **k: True)
        monkeypatch.setattr(dep_mod.Notifier, "set_webhook", lambda *a, **k: True)
        # First customer message (waiting) ok; final ready message fails
        call_count = {"n": 0}
        def fake_send(*a, **k):
            call_count["n"] += 1
            return call_count["n"] == 1  # first True, second False
        monkeypatch.setattr(dep_mod.Notifier, "send_customer_message", fake_send)
        dep.email_client = MagicMock()
        dep.email_client.send_ready_notification.return_value = True

        ok = dep.deploy(job)
        assert ok is True
        # owner must be alerted that customer message failed
        calls = [c for c in owner_notifier.send.call_args_list if "8888" in str(c)]
        assert any("customer" in str(c).lower() and ("ready" in str(c).lower() or "notify" in str(c).lower())
                   for c in calls)
```

- [ ] **Step 2: Run — expect fail**

- [ ] **Step 3: Modify deployer.py deploy() to check return values**

Replace the delivery block (currently lines 87-99):

```python
# Step 4: Set webhook and deliver (sync — deterministic)
self.api.update_job(job_id, "qa")
cert_path = config.WEBHOOK_CERT_PATH if hasattr(config, "WEBHOOK_CERT_PATH") else None
webhook_ok = Notifier.set_webhook(
    bot["token"],
    f"https://{server_ip}:18789/webhook",
    certificate_path=cert_path,
)
if not webhook_ok:
    self.notifier.send(f"{job_id}: WARN — setWebhook failed; bot may not receive messages")

msg_ok = Notifier.send_customer_message(
    bot["token"],
    telegram_user_id,
    "Your AI assistant is ready! Start chatting now."
)
if not msg_ok:
    self.notifier.send(
        f"{job_id}: WARN — customer ready-notify send_customer_message FAILED "
        f"(chat_id={telegram_user_id}). Customer likely hasn't /start-ed the bot."
    )

self.api.update_job(job_id, "complete")
self.notifier.notify_complete(job_id)
```

- [ ] **Step 4: Run test — expect pass**

Run: `python -m pytest tests/test_deploy_bugs.py::TestDeployerSurfacesCustomerNotifyFailure -v`
Expected: PASS

- [ ] **Step 5: Run full suite**

Run: `python -m pytest -q`
Expected: all pass

- [ ] **Step 6: Commit**

```bash
git commit -am "fix(deployer): check return values of set_webhook and send_customer_message, alert owner on failure"
```

### Task C3: Fix webhook SSL (upload self-signed cert to Telegram)

**Files:**
- Modify: `onboarding-pipeline/pi5-worker/config.py`
- Modify: `openclaw_install/scripts/08-configure-nginx.sh` (or wherever the cert is generated) — if the cert path is not already known, document where the VPS stores its self-signed cert.
- Modify: `onboarding-pipeline/pi5-worker/deployer.py`

- [ ] **Step 1: Locate where the VPS cert is generated and stored**

Run: `grep -rn "openssl req\|self-signed\|webhook.*cert" openclaw_install/scripts/`
Expected: identify the exact path (likely `/etc/nginx/ssl/webhook.crt` on VPS).

- [ ] **Step 2: Fetch cert over SSH before calling setWebhook**

Add a helper to `deployer.py`:

```python
def _fetch_webhook_cert(self, server_ip: str, job_id: str) -> str | None:
    """Download the VPS self-signed webhook cert to a local temp file.
    Returns local path, or None on failure."""
    import tempfile
    tmp = tempfile.NamedTemporaryFile(mode="w", suffix=f"_{job_id}.crt", delete=False)
    tmp.close()
    cmd = [
        "scp", "-o", "StrictHostKeyChecking=no",
        "-o", "UserKnownHostsFile=/dev/null",
        "-i", self.ssh_key,
        f"deploy@{server_ip}:/etc/nginx/ssl/webhook.crt",
        tmp.name,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    if result.returncode != 0:
        print(f"[deployer] {job_id}: cert fetch failed: {result.stderr}", flush=True)
        return None
    return tmp.name
```

Then in `deploy()` replace the `cert_path = ...` line:

```python
cert_path = self._fetch_webhook_cert(server_ip, job_id)
webhook_ok = Notifier.set_webhook(
    bot["token"],
    f"https://{server_ip}:18789/webhook",
    certificate_path=cert_path,
)
```

- [ ] **Step 3: Add test for _fetch_webhook_cert**

Append to `tests/test_deploy_bugs.py`:

```python
class TestFetchWebhookCert:
    def test_fetch_cert_returns_none_on_scp_failure(self, monkeypatch):
        import deployer as dep_mod
        dep = dep_mod.Deployer(api=MagicMock(), notifier=MagicMock())
        fake_result = MagicMock(returncode=1, stderr="no such file")
        monkeypatch.setattr(dep_mod.subprocess, "run", lambda *a, **k: fake_result)
        assert dep._fetch_webhook_cert("1.2.3.4", "9999") is None

    def test_fetch_cert_returns_path_on_success(self, monkeypatch, tmp_path):
        import deployer as dep_mod
        dep = dep_mod.Deployer(api=MagicMock(), notifier=MagicMock())
        fake_result = MagicMock(returncode=0, stderr="")
        monkeypatch.setattr(dep_mod.subprocess, "run", lambda *a, **k: fake_result)
        path = dep._fetch_webhook_cert("1.2.3.4", "9999")
        assert path is not None
        assert "9999" in path
```

- [ ] **Step 4: Run tests**

Run: `python -m pytest tests/test_deploy_bugs.py::TestFetchWebhookCert -v`
Expected: 2 passed

- [ ] **Step 5: Live smoke test on VPS 203187256 (manual)**

On Pi5, after changes deployed, run:

```bash
cd ~/nexgen-worker
~/nexgen-worker-env/bin/python3 -c "
from api_client import ApiClient
from notifier import Notifier
from deployer import Deployer
import config
api = ApiClient(config.CF_WORKER_URL, config.WORKER_TOKEN)
n = Notifier(config.OWNER_BOT_TOKEN, config.OWNER_CHAT_ID)
d = Deployer(api, n)
cert = d._fetch_webhook_cert('161.97.88.8', '1002')
print('cert:', cert)
"
```

Expected: prints local `.crt` path. Then manually call Telegram setWebhook with the cert and verify `getWebhookInfo` shows non-empty url.

- [ ] **Step 6: Commit**

```bash
git commit -am "fix(deployer): fetch VPS self-signed cert and upload to Telegram setWebhook"
```

### Task C4: Post-deploy verification — call getWebhookInfo and assert non-empty

**Files:**
- Modify: `onboarding-pipeline/pi5-worker/notifier.py` (add `get_webhook_info`)
- Modify: `onboarding-pipeline/pi5-worker/deployer.py`

- [ ] **Step 1: Add `get_webhook_info` static method**

In `notifier.py`:

```python
    @staticmethod
    def get_webhook_info(bot_token: str) -> dict:
        """Return Telegram's view of the current webhook config."""
        try:
            resp = requests.get(
                f"https://api.telegram.org/bot{bot_token}/getWebhookInfo",
                timeout=10,
            )
            if resp.ok:
                return resp.json().get("result") or {}
        except requests.RequestException as e:
            logger.error("get_webhook_info ERROR err=%s", e)
        return {}
```

- [ ] **Step 2: Call it after setWebhook and alert owner if url empty**

In `deployer.py` deploy(), after the `webhook_ok = ...` block add:

```python
info = Notifier.get_webhook_info(bot["token"])
if not info.get("url"):
    self.notifier.send(
        f"{job_id}: ERROR — getWebhookInfo returned empty url after setWebhook. "
        f"last_error={info.get('last_error_message','?')}"
    )
```

- [ ] **Step 3: Commit**

```bash
git commit -am "feat(deployer): verify webhook URL after setWebhook, alert owner if empty"
```

---

# PART D — Edit 2: Marigold Briefing Audit

**Problem:** `docs/pi5-assistant-briefing-v2.md` contains plan-era assertions that no longer match production behavior (unconditional "click Undo cancellation", etc.). Partial v2.3 fixes done; full audit pending.

**Approach:** Grep every assertion about system behavior, verify against actual code, fix drift, sync to Pi5.

### Task D1: Produce a drift report

**Files:**
- Create: `docs/briefing-drift-report.md`

- [ ] **Step 1: Grep assertions**

Run:
```bash
grep -nE 'manual|revoke|do NOT|always|never|notify-only|must|should not' docs/pi5-assistant-briefing-v2.md
```
Write results to `docs/briefing-drift-report.md` (one line per hit with line-number and assertion text).

- [ ] **Step 2: For each assertion, mark `OK`, `DRIFT` or `CHECK` after verifying against production code**

For each DRIFT, note the correct assertion. Files to check for each claim type:
- Claims about revoke behavior → `openclaw_install/provision/contabo-revoke.sh`
- Claims about pool display → `onboarding-pipeline/pi5-worker/nexgen_cli.py` (handle_pool)
- Claims about job-pickup / deploy flow → `onboarding-pipeline/pi5-worker/deployer.py`
- Claims about dashboard content → `onboarding-pipeline/pi5-worker/dashboard.py`
- Claims about CLI python path → match `nexgen-worker.service` ExecStart
- Claims about budgets → `deployer.TIER_BUDGETS` and `cf-worker/src/handlers/usage.ts`

- [ ] **Step 3: Commit the drift report as a WIP document**

```bash
git add docs/briefing-drift-report.md
git commit -m "docs(briefing): drift audit report (WIP)"
```

### Task D2: Fix the briefing

**Files:**
- Modify: `docs/pi5-assistant-briefing-v2.md` (local)

- [ ] **Step 1: Apply every DRIFT fix identified in D1**

For each drift, update the briefing with the correct language. Bump the version header to `v2.4` and add a changelog entry at the top:

```markdown
## Changelog
- v2.4 (2026-04-18): Production drift audit — fixed revoke assertions, pool display, CLI paths, budget values to match live code (docs/briefing-drift-report.md).
- v2.3 (2026-04-12): venv python path everywhere, pool with Contabo live state.
...
```

- [ ] **Step 2: Re-grep to confirm all DRIFT items are now accurate**

Run the same grep, cross-check every hit against the drift report.

- [ ] **Step 3: Commit**

```bash
git commit -am "docs(briefing): v2.4 — production drift fixes (revoke, pool, CLI, budgets)"
```

### Task D3: Sync to Pi5

**Files:**
- `~/clawd/memory/pi5-assistant-briefing-v2.md` on Pi5 (via scp)

- [ ] **Step 1: SCP updated briefing**

Run (from local machine):
```bash
scp docs/pi5-assistant-briefing-v2.md jacky999@192.168.1.30:~/clawd/memory/pi5-assistant-briefing-v2.md
```
Expected: file transferred.

- [ ] **Step 2: Verify on Pi5**

Run: `ssh jacky999@192.168.1.30 "head -20 ~/clawd/memory/pi5-assistant-briefing-v2.md"`
Expected: header shows `v2.4` and the new changelog entry.

- [ ] **Step 3: Update active.md with "briefing drift" watch item**

In `active.md`, add a bullet under a "Process watch" section (create if missing):

```markdown
- Watch for briefing drift: after any change to pipeline behavior (scripts, CLI, D1 schema, budgets, webhook logic), re-grep `pi5-assistant-briefing-v2.md` for affected assertions and bump version.
```

- [ ] **Step 4: Commit**

```bash
git add active.md
git commit -m "docs: note briefing drift as ongoing process watch item"
```

---

## Final verification (after all 4 parts complete)

### Task Z1: Full test suite

- [ ] **Step 1: Pi5 worker**

Run: `cd onboarding-pipeline/pi5-worker && python -m pytest -v`
Expected: baseline + new tests (dashboard ~4, email_client ~4, deployer email ~1, deployer surface ~1, notifier logging ~2, fetch_cert ~2) = ~14 new tests; all pass.

- [ ] **Step 2: CF Worker**

Run: `cd onboarding-pipeline/cf-worker && npx vitest run`
Expected: unchanged baseline — this plan does not touch the worker.

- [ ] **Step 3: Website build**

Run: `cd website-lovable/src && bun run build`
Expected: clean build.

### Task Z2: Live smoke test on Run 2 (Tier 3 Elite) — Marigold drives

- [ ] **Step 1: Create new order** through website, tier 3, real Lemon Squeezy test payment.

- [ ] **Step 2: Watch Marigold** suggest VPS 203187278 using the v2.4 briefing + updated pool command.

- [ ] **Step 3: Verify post-deploy**:
  - Dashboard (`cat ~/nexgen-dashboard.md`) shows business view — customer in roster, MRR increased, no Gateway/Watchdog rows.
  - Customer receives email with order number + bot link.
  - Customer bot `getWebhookInfo` returns non-empty url.
  - Customer bot sends "ready" message (assuming customer has `/start`-ed).
  - Owner Telegram: no WARN messages.
  - Confirmation screen on website showed order number.

- [ ] **Step 4: Mark the E2E test progress doc** — flip the four pending items in the Marigold Handoff Checklist to `[x]`.

---

## Self-Review Checklist (performed while writing this plan)

- **Spec coverage:** Issues 15 (Tasks A1–A6), 16 (Tasks B1–B3), 17 (Tasks C1–C4), and final-edit_v2.md Edit 2 (Tasks D1–D3) each have explicit tasks. ✅
- **Placeholders:** No "TBD", "implement later", or "add appropriate handling". Every code block is complete. ✅
- **Type consistency:** `EmailClient` signature `send_ready_notification(to, order_id, tier, bot_username)` is consistent across email_client.py test, implementation, and deployer call site. `set_webhook(bot_token, url, certificate_path=None)` consistent across notifier test, implementation, and deployer call site. ✅
- **Placement assumptions to verify at execution time:**
  - i18n file paths — confirm `src/i18n/locales/<lang>/onboarding.json` matches current website layout before B3 step 1.
  - VPS webhook cert path `/etc/nginx/ssl/webhook.crt` — verify during C3 step 1 by grep.
  - `cancel_deadline` field name on VPS records — confirm against D1 schema (`cf-worker/src/lib/db.ts`) when testing A4.

---

# Expected Outputs & Verification Table

> **Usage:** After each task, run the listed verification command, compare to "Expected Output" exactly. If actual differs, flag using the Bug Flag Template at the bottom of this section. Do **not** claim a task complete until expected output matches.

## Part A — Dashboard

### A1: Snapshot test infrastructure

**Command:** `cd onboarding-pipeline/pi5-worker && python -m pytest tests/test_dashboard.py::test_business_summary_computes_mrr_per_tier -v`

**Expected (before A2 implementation):**
```
FAILED tests/test_dashboard.py::test_business_summary_computes_mrr_per_tier
AttributeError: module 'dashboard' has no attribute 'business_summary_section'
```

**Flag if:** test passes without A2 implementation (means someone already added the function — stop and investigate), or error is different (e.g. ImportError on `dashboard` itself — environment broken).

---

### A2: `business_summary_section` implemented

**Command:** `python -m pytest tests/test_dashboard.py::test_business_summary_computes_mrr_per_tier -v`

**Expected:**
```
PASSED tests/test_dashboard.py::test_business_summary_computes_mrr_per_tier
```

**Expected markdown output of the function (with FAKE_JOBS + FAKE_USAGE):**
```
## Business Summary

| Metric | Value |
|--------|-------|
| Active Customers | **3** |
| MRR (HKD) | **HK$1,244** |
| Total API Cost (this month) | $158.50 |
| Gross Margin | HK$1,085.50 |
```

**Math check:**
- MRR: 248 + 398 + 598 = **1244** ✓
- API cost: 12.5 + 45.0 + 101.0 = **158.50** ✓
- Margin: 1244 − 158.5 = **1085.50** ✓

**Flag if:**
- MRR ≠ 1244 → tier pricing constants wrong
- API cost ≠ 158.50 → spend summation wrong
- Margin sign wrong → margin formula wrong

---

### A3: Customer Overview section

**Command:** `python -m pytest tests/test_dashboard.py::test_customer_overview_section_lists_completed_jobs -v`

**Expected:** PASSED

**Expected markdown output:**
```
## Customer Overview

| Job ID | Tier | Bot | Email | Created | Status |
|--------|------|-----|-------|---------|--------|
| 1001 | 1 | @c1bot | a@b.com | 2026-03-01 | complete |
| 1002 | 2 | @c2bot | c@d.com | 2026-04-11 | complete |
| 1003 | 3 | @c3bot | e@f.com | 2026-04-15 | complete |
```

**Flag if:**
- Any customer row missing → jobs loop broken
- "Gateway" or "Qdrant" appears anywhere → old section leaked back in
- Email column empty → job.get("email") path wrong

---

### A4: VPS Expiry section

**Command:** `python -m pytest tests/test_dashboard.py::test_vps_expiry_section_shows_days_to_cancel_deadline -v`

**Expected:** PASSED

**Expected markdown output (with test fixtures, run date 2026-04-18):**
```
## VPS Expiry & Billing

| VPS ID | Customer | IP | Status | Billing Start | Cancel Deadline | Days Left |
|--------|----------|----|--------|---------------|-----------------|-----------|
| 1 | 1001 | 1.1.1.1 | active | 2026-01-01 | — | — |
| 2 | 1002 | 2.2.2.2 | cancelling | 2026-01-01 | 2026-05-01 | 13 |
```

**Flag if:**
- Days Left for row 2 is not `13` (as of test run date 2026-04-18) — if tests run later, expected will be (2026-05-01 minus test_date).days. Document the actual date delta if flagged.
- Row 1 (no deadline) shows a days count — should be `—`.

---

### A5: `generate()` uses new sections + removes old

**Command:** `python -m pytest tests/test_dashboard.py::test_generate_uses_new_business_sections -v`

**Expected:** PASSED

**Also run:** `python dashboard.py` and inspect `~/nexgen-dashboard.md` (or local equivalent).

**Expected top-level structure of the rendered file:**
```
# NexGen Business Dashboard

**Updated:** 2026-04-18 HH:MM UTC

## Status: All OK
-- or --
## Warnings
...

## Business Summary
...

## Customer Overview
...

## VPS Expiry & Billing
...

## API Usage (This Month)
...

## Pending Orders
...

## Recyclable Pool
...

## Backups
...
```

**Sections that MUST NOT appear:**
- `## Pi5 Worker`
- Any table header containing `| Gateway |`, `| Watchdog |`, `| Qdrant |`, `| SearXNG |`, `| Disk |`, `| Mem |`
- `## VPS Instances` (replaced by VPS Expiry & Billing)

**Flag if:** any of the forbidden sections appear, or the new sections are missing from the live output.

---

### A6: Warnings business-focused

**Command:** `python -m pytest -q` (full pi5 suite)

**Expected count:**
```
~98 passed
```
(baseline 84 + new tests: dashboard 4 + email_client 4 + deployer email 1 + deployer surface 1 + notifier logging 2 + fetch_cert 2 = **14 new tests**)

**Smoke-run dashboard:** `python dashboard.py` — "Warnings" section shows no Pi5-disk/worker-service entries even when Pi5 disk is intentionally pretended-low.

**Flag if:** test count is not baseline+14 (off-by-more-than-1 means tests regressed or weren't added).

---

## Part B — Email + Order Number

### B1: EmailClient module

**Command:** `python -m pytest tests/test_email_client.py -v`

**Expected:**
```
tests/test_email_client.py::test_send_ready_notification_calls_resend_api PASSED
tests/test_email_client.py::test_send_ready_notification_returns_false_on_http_error PASSED
tests/test_email_client.py::test_send_ready_notification_returns_false_on_network_error PASSED
tests/test_email_client.py::test_no_send_when_api_key_missing PASSED

===== 4 passed =====
```

**Live send smoke test (optional, manual):**
```bash
~/nexgen-worker-env/bin/python3 -c "
from email_client import EmailClient
import os
c = EmailClient(api_key=os.environ['RESEND_API_KEY'], from_addr=os.environ['RESEND_FROM'])
print(c.send_ready_notification(to='amaztsang@gmail.com', order_id='TEST-01', tier=2, bot_username='NexGen_E2E_bot'))
"
```
**Expected:** prints `True`. Email arrives at amaztsang@gmail.com within 30s, subject `[NexGen] 你的 AI 助手已準備就緒 — 訂單 #TEST-01`, order number `#TEST-01` prominent, bot link clickable.

**Flag if:**
- Print says `False` — check API key in .env, check Resend dashboard for rejection reason.
- Email arrives but order number not rendered — HTML template variable substitution broken.
- Email lands in spam — Resend domain DKIM/SPF not set up (pre-req missed).

---

### B2: Deployer sends email on success

**Command:** `python -m pytest tests/test_deploy_bugs.py::TestDeployerSendsEmailOnSuccess -v`

**Expected:** PASSED

**Expected behavior in logs when deployer runs end-to-end on a success path:**
```
[deployer] 1002: DEPLOYMENT_SUCCESS
[deployer] 1002: email ready_notification sent to amaztsang@gmail.com
```

**Expected deploy still succeeds even if email_client returns False** (email is best-effort). Log should say:
```
[deployer] 1002: email send failed — customer won't receive notification
```
but the deploy return value is still `True` and `update_job(..., "complete")` still called.

**Flag if:**
- Test fails because `email_client` attribute not found — `__init__` change not applied.
- Deploy fails when email fails — email call accidentally made blocking.

---

### B3: Order number on confirmation screen

**Command:** `cd website-lovable/src && bun run build`

**Expected:**
```
✓ built in X.XXs
```
No TypeScript errors.

**Browser smoke test:**
1. Open http://localhost:5173/onboarding
2. Fill form with any valid data, submit
3. Wait for POST /api/orders response

**Expected visual output on confirmation screen** (after "資料已確認"):
- Rounded card with primary-orange tinted border
- Label: "你的訂單號碼" (or locale equivalent)
- Order ID in large mono font, prefixed with `#`, e.g. `#1234`
- Hint: "請保留此號碼以便跟進" (or locale equivalent)

**i18n check:** Switch language via i18n picker — order number label and hint update. Order ID itself stays numeric.

**Flag if:**
- Build fails → i18n JSON malformed (trailing comma, missing quote).
- Order card doesn't render → `orderId` state is null (check network tab — POST /api/orders response includes `order.id`).
- Key shows as `payment.orderNumber` literal → i18n key missing from that language file.

---

## Part C — Webhook

### C1: Notifier logging

**Command:** `python -m pytest tests/test_notifier_logging.py -v`

**Expected:**
```
tests/test_notifier_logging.py::test_send_customer_message_logs_telegram_403 PASSED
tests/test_notifier_logging.py::test_set_webhook_logs_telegram_rejection PASSED

===== 2 passed =====
```

**Flag if:** tests pass but grep `logger.error` in notifier.py returns 0 hits — tests are matching on something other than real logging.

---

### C2: Deployer surfaces failures

**Command:** `python -m pytest tests/test_deploy_bugs.py::TestDeployerSurfacesCustomerNotifyFailure -v`

**Expected:** PASSED

**Expected owner Telegram messages during a deploy where customer ready-notify fails:**
```
1002: WARN — customer ready-notify send_customer_message FAILED (chat_id=42). Customer likely hasn't /start-ed the bot.
```

**Expected the deploy still marks complete** — a failed ready-notify is NOT a deploy failure. `update_job(1002, "complete")` and `notify_complete(1002)` still fire.

**Flag if:**
- Deploy flipped to "failed" because of notify miss → logic inverted.
- No owner WARN sent → return-value check not actually wired up.

---

### C3: Webhook cert upload

**Command:** `python -m pytest tests/test_deploy_bugs.py::TestFetchWebhookCert -v`

**Expected:**
```
TestFetchWebhookCert::test_fetch_cert_returns_none_on_scp_failure PASSED
TestFetchWebhookCert::test_fetch_cert_returns_path_on_success PASSED
```

**Live smoke test on Pi5 (real VPS 161.97.88.8):**
```bash
~/nexgen-worker-env/bin/python3 -c "
from api_client import ApiClient
from notifier import Notifier
from deployer import Deployer
import config
d = Deployer(ApiClient(config.CF_WORKER_URL, config.WORKER_TOKEN),
             Notifier(config.OWNER_BOT_TOKEN, config.OWNER_CHAT_ID))
print(d._fetch_webhook_cert('161.97.88.8', '1002'))
"
```
**Expected output:** a local path like `/tmp/tmpXXXXXX_1002.crt`. File exists, size > 0, content starts with `-----BEGIN CERTIFICATE-----`.

**Flag if:**
- Output is `None` → cert path on VPS wrong. Run `ssh deploy@161.97.88.8 'ls -la /etc/nginx/ssl/'` to find actual path.
- File exists but empty → scp succeeded but source was empty (VPS didn't generate cert during install).

---

### C4: Post-setWebhook verification

**After a real deploy**, run:
```bash
curl -s "https://api.telegram.org/bot<CUSTOMER_BOT_TOKEN>/getWebhookInfo" | python3 -m json.tool
```

**Expected:**
```json
{
  "ok": true,
  "result": {
    "url": "https://161.97.88.8:18789/webhook",
    "has_custom_certificate": true,
    "pending_update_count": 0,
    "last_error_message": null,
    ...
  }
}
```

**Flag if:**
- `url` is empty string → setWebhook did not persist; check owner Telegram for the ERROR message from C4 step 2.
- `has_custom_certificate` is `false` → cert was not uploaded (multipart form issue).
- `last_error_message` contains "SSL error", "certificate", "unsupported" → cert format wrong (check it's PEM not DER).

---

## Part D — Briefing Audit

### D1: Drift report produced

**Command:**
```bash
grep -nE 'manual|revoke|do NOT|always|never|notify-only|must|should not' docs/pi5-assistant-briefing-v2.md | wc -l
```

**Expected:** non-zero count (briefing has many assertions). Record exact number in the drift report.

**Expected `docs/briefing-drift-report.md` structure:**
```markdown
# Briefing Drift Report (2026-04-18)

Scanned: docs/pi5-assistant-briefing-v2.md (v2.3)
Total assertions flagged: N

## Findings

| Line | Assertion | Verdict | Correction |
|------|-----------|---------|------------|
| 147 | "must click Undo cancellation before deploy" | DRIFT | contabo-revoke.sh is a verifier; only ask if cancelDate != null |
| ... | ... | ... | ... |
```

**Flag if:** report has zero DRIFT entries — either briefing is already perfect (unlikely given history) or the auditor skimmed.

---

### D2: Briefing at v2.4

**Command:** `head -20 docs/pi5-assistant-briefing-v2.md`

**Expected:** first changelog line mentions `v2.4 (2026-04-18)`.

**Command:** re-run the D1 grep and compare to the drift report.

**Expected:** every DRIFT item from D1 is either now correct in the text, or removed entirely.

**Flag if:** grep still shows outdated phrasing on any DRIFT line.

---

### D3: Synced to Pi5

**Command:** `ssh jacky999@192.168.1.30 "head -20 ~/clawd/memory/pi5-assistant-briefing-v2.md"`

**Expected:** first 20 lines match local `docs/pi5-assistant-briefing-v2.md` verbatim, including `v2.4` header.

**Flag if:** Pi5 still shows `v2.3` or older — scp did not run or landed at wrong path.

---

## Part Z — Final Integration

### Z1: Full test suite counts

| Suite | Baseline | Expected after plan | Verify |
|-------|----------|--------------------|---------| 
| Pi5 worker pytest | 84 passed | **98 passed** | `cd onboarding-pipeline/pi5-worker && python -m pytest -q` |
| CF Worker vitest | 72 passed | **72 passed** (unchanged) | `cd onboarding-pipeline/cf-worker && npx vitest run` |
| Website build | clean | clean | `cd website-lovable/src && bun run build` |

**Flag if:**
- Pi5 count ≠ 98 (±1 acceptable if test was restructured): which test is missing, or which unintended test was added?
- CF Worker count changes: this plan must not touch the worker.
- Website build produces warnings about unused imports from the new order-number block: clean them up.

---

### Z2: Live Run 2 (Tier 3 Elite) end-to-end

**Verification matrix** — check each after Marigold completes deploy:

| Check | Expected | How to verify |
|-------|----------|---------------|
| Dashboard section `## Business Summary` exists | Yes | `cat ~/nexgen-dashboard.md \| grep -c "## Business Summary"` returns `1` |
| Dashboard shows new customer in roster | Yes | Customer job_id visible in Customer Overview table |
| MRR increased by HK$598 (tier 3) | Yes | Compare before/after MRR values |
| Dashboard has no `| Gateway |` column | Yes | `grep -c "| Gateway |" ~/nexgen-dashboard.md` returns `0` |
| Customer email received | Yes | Check inbox for `[NexGen] 你的 AI 助手已準備就緒 — 訂單 #<id>` |
| Email contains order number | Yes | Body shows `訂單號碼：#<id>` |
| Bot webhook non-empty | Yes | `curl .../getWebhookInfo` returns `url != ""` |
| Bot sends ready message | Yes | Customer Telegram chat shows "Your AI assistant is ready!" |
| Owner gets no WARN messages | Yes | Owner Telegram scroll for `WARN —` in last 30 min |
| Confirmation screen showed order number | Yes | User recalls seeing `#<id>` on the page before paying |

**Flag if any row fails** — use the template below, linking to specific task (A/B/C/D) that should have prevented it.

---

## Bug Flag Template

When an expected output does not match, create an entry in `docs/e2e_test_progress.md` under a new section `## Post-Fix Regressions` using this format:

```markdown
### Bug #XX: <one-line summary>

- **Found during:** Task <A1/B2/etc.> verification
- **Severity:** Critical / High / Medium / Low
- **Expected:** <paste from this table>
- **Actual:** <paste exact observed output>
- **Delta:** <one-sentence what differs>
- **Hypothesis:** <root cause guess, or "unknown">
- **Related files:** <paths>
- **Reproduction:** <exact commands to re-trigger>
- **Status:** Open / Investigating / Fixed (link to commit)
```

**When to flag vs. when to just fix:**
- Test fails with a clear fix (typo, off-by-one) — fix in place, no flag needed.
- Test fails with unknown cause, or live smoke test diverges from spec — flag, because someone else may hit the same divergence.
- Expected output pattern matches but a new unintended behavior appears (e.g. extra log lines, new warning) — flag even if tests green.
