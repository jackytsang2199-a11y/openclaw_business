# Plan B Review: Pi5 Worker + Bot Pool + Deploy Pipeline

**Plan:** `docs/superpowers/plans/2026-03-26-plan-b-pi5-worker.md`
**Reviewed:** 2026-03-26
**Verdict:** 85% complete, well-structured, 3 critical bugs + 5 missed operational risks must be fixed before implementation

---

## Critical Bugs (will crash at runtime)

### C1. Contabo SSH key format is wrong — will fail to create VPS

**Location:** Lines 231-237 (`contabo-create.sh`)

The plan passes a raw SSH public key string in `sshKeys`:
```json
"sshKeys": [$(echo "$SSH_PUB_KEY" | jq -Rs .)]
```

The Contabo API expects an **array of numeric `secretId` values** from their Secrets Management API — not raw key strings. You must first register the key via `POST /v1/secrets`, then pass the resulting ID.

**Fix:** Add a pre-step to `contabo-create.sh` that registers the SSH key via `POST /v1/secrets` and captures the `secretId`, or checks if it already exists. Store the `secretId` in `.env` as `CONTABO_SSH_KEY_ID`.

---

### C2. Claude Agent SDK result parsing misses the output

**Location:** Lines 1311-1356 (`deployer.py`)

**Problem 2a:** The plan only checks `ResultMessage.result` for `DEPLOYMENT_SUCCESS`, but the agent's text output comes through `AssistantMessage` → `TextBlock` objects. The success/failure strings will never be captured.

**Fix:** Accumulate text from `AssistantMessage` blocks during the async loop:
```python
from claude_agent_sdk import query, ClaudeAgentOptions, AssistantMessage, TextBlock, ResultMessage

full_text = ""
async for message in query(...):
    if isinstance(message, AssistantMessage):
        for block in message.content:
            if isinstance(block, TextBlock):
                full_text += block.text
    elif isinstance(message, ResultMessage):
        if message.result:
            full_text += message.result

if "DEPLOYMENT_SUCCESS" in full_text:
    return True
```

**Problem 2b:** Lines 1266-1272 have broken async bridging logic:
```python
success = anyio.from_thread.run(
    self._run_agent_deployment, ...
) if anyio.get_current_task() else anyio.run(
    self._run_agent_deployment, ...
)
```

`anyio.get_current_task()` will fail in a sync context. The original review suggested `asyncio.run()` as the fix, but this is fragile — if the worker ever moves to async (likely for Phase 1+ concurrent deploys), `asyncio.run()` inside an already-running event loop throws `RuntimeError`.

**Better fix:** Make `deploy()` async from the start. Have the synchronous `worker.py` main loop call `asyncio.run(deployer.deploy(...))` at the **single top-level entry point** — not inside the deployer. This isolates the sync/async boundary to one place and doesn't break when the worker goes async later.

---

### C3. `_handle_failure` references undefined variable `job`

**Location:** Line 1437 (`deployer.py`)

```python
Notifier.send_customer_message(
    bot["token"],
    job.get("telegram_user_id", ""),  # BUG: 'job' is not in scope
    ...
)
```

The method signature is `def _handle_failure(self, job_id: str, bot: dict, error: str)` — it receives `job_id` (a string), not the full `job` dict. Will raise `NameError`.

**Fix:** Pass `telegram_user_id` as a parameter to `_handle_failure`, or pass the full `job` dict.

---

## Incorrect API Assumptions (must verify before implementation)

### ~~I1. Pre-work P2 vs contabo-auth.sh grant_type mismatch~~ (downgraded to typo)

**Location:** Lines 37 vs 185

Pre-work P2 uses `grant_type=client_credentials` in the test command, but `contabo-auth.sh` correctly uses `grant_type=password`. This is just a **typo in the pre-work test command** — the actual script is correct. Fix the test command and move on.

### I2. Contabo product ID `V45` may not exist

**Location:** Lines 222-233 (`contabo-create.sh`)

The plan defaults to `productId: V45` described as "Cloud VPS S (4 vCPU, 8GB, 200GB SSD, ~EUR 4.50/mo)". Product IDs change over time.

**Fix:** Query `GET /v1/compute/products` during pre-work and verify the correct `productId`. Store as `CONTABO_PRODUCT_ID` in `.env`.

### I3. Hardcoded image UUID may be stale

**Location:** Line 232

```json
"imageId": "${CONTABO_IMAGE_ID:-afecbb85-e2fc-46f0-9684-b46b1faf00bb}"
```

This UUID may not correspond to Ubuntu 24.04 on Contabo. Image IDs are provider-specific and change.

**Fix:** Query `GET /v1/compute/images` during pre-work. Document the mapping.

### I4. Contabo destroy may not immediately delete — ⚠️ POTENTIAL STRATEGY BLOCKER

**Location:** Lines 322-325 (`contabo-destroy.sh`)

Contabo VPSes are contract-based — `POST .../cancel` may initiate end-of-billing-period termination rather than immediate destruction. This has significant cost implications for the churn flow (spec Section 11 says "Destroy VPS immediately" on Day 8).

**This is far more severe than I2/I3.** If Contabo only does end-of-billing-period cancellation:
- The Day 8 churn flow ("destroy VPS immediately") doesn't work
- You're paying for churned customer VPSes until end of billing period (EUR 4.50+/mo sitting idle)
- The cost model breaks for any churn scenario

**Fix:** Before writing a single line of code, do a **real API test**: create a VPS, cancel it immediately, check if it's actually destroyed. If Contabo cannot immediately destroy, either:
- (a) Switch provisioning to Hetzner (which supports immediate deletion — already proven in T001/T002 runs), or
- (b) Redesign churn to "wipe and recycle" VPSes instead of destroy (factory-reset and return to pool)

---

## Missing Features From Spec

### M2. No stale job cleanup

The spec (Section 13, line 562) defines stale job cleanup: "Worker checks on each poll: any job in `provisioning` or `installing` for >45 minutes..." This is not implemented anywhere in the worker loop (Task 7). The worker only polls for `ready` jobs.

**Fix:** Add a stale job check to the worker loop, either as a periodic task or on every poll cycle.

### M3. Bot username not stored in CF D1

The spec schema includes `bot_username TEXT` in the jobs table. The deployer assigns a bot but never calls `api.update_job(job_id, ..., bot_username=bot["username"])`.

**Fix:** After bot assignment in `_assign_bot`:
```python
self.api.update_job(job_id, "provisioning", bot_username=bot["username"])
```

### M6. Webhook self-signed certificate — investigate before assuming blocker

**Location:** Lines 1280-1281 (`deployer.py`)

```python
webhook_url = f"https://{server_ip}:18789/webhook"
Notifier.set_webhook(bot["token"], webhook_url)
```

The `set_webhook` method (lines 857-868) sends only `{"url": url}` — no certificate. If OpenClaw uses a self-signed certificate, Telegram requires the certificate to be provided via the `certificate` parameter in `setWebhook`.

**However:** OpenClaw likely manages its own webhook registration on startup — many Telegram bot frameworks do. Check `openclaw.json.template` and OpenClaw's startup behavior first. If OpenClaw handles this internally, the deployer doesn't need webhook code at all.

**Fix:** Add to pre-work: "Verify whether OpenClaw registers its own webhook on startup." If yes, remove the deployer's webhook code. If no, modify `set_webhook` to accept and upload the certificate file.

### M7. No provider fallback config — promote to high priority

The provisioning script is hardcoded to `contabo-create.sh`. A `PROVISION_PROVIDER` env var that selects between `contabo-create.sh` and `hetzner-create.sh` is ~5 lines of code and saves hours of testing pain. You already have a working Hetzner provisioner from T001/T002 runs.

**Fix:** Add `PROVISION_PROVIDER` to `.env.example` (default: `contabo`). In `deployer.py`, dispatch to the correct script:
```python
script = f"{config.PROVISION_PROVIDER}-create.sh"
```

This is trivially simple and immediately valuable — use Hetzner for dev/testing, Contabo in production.

---

## Missing Findings (not in original review)

### MISS-1. Max plan auth conversion not verified

The plan was recently updated from API-key auth to Claude Max plan OAuth. The original review did not check whether all edit locations are consistent, or whether stale `ANTHROPIC_API_KEY` / `max_budget_usd` / `escalation` / `haiku` references remain anywhere in the plan. This is the freshest change and the most likely to have inconsistencies.

**Fix:** Grep the entire plan for `API_KEY`, `budget`, `escalation`, `haiku`, `anthropic` and verify every occurrence was updated.

### MISS-2. Max plan rate limits — no backoff strategy

The plan says "$0 marginal cost per deployment" but the Max plan has rate limits (not unlimited tokens/minute). What happens when 3 deployments are queued and the second one hits the rate limit mid-install?

The plan captures `RateLimitEvent` but has no backoff-and-retry strategy. A rate-limited agent just fails the deployment.

**Fix:** At minimum:
- Worker should pause polling when a deployment hits rate limits (prevent queuing more work)
- Deployer should implement exponential backoff around the `query()` call when `RateLimitEvent` fires
- Consider a cooldown period between consecutive deployments (e.g., 5 minutes)

### MISS-3. Contabo auth token expiry

`contabo-auth.sh` gets an OAuth bearer token. These typically expire in ~24 hours. The worker loop polls indefinitely but never refreshes the Contabo token. If a token expires between polling and provisioning, `contabo-create.sh` silently fails with 401.

**Fix:** Either:
- Refresh the token on every poll cycle (cheap — one HTTP call), or
- Add a token-age check before provisioning and refresh if stale

### MISS-4. No deployment timeout (wall-clock)

The Agent SDK's `max_turns=50` limits turns but not wall-clock time. A misbehaving agent could loop for hours hitting retries on a broken VPS. The worker needs a deployment timeout (e.g., 45 minutes) that kills the deployment and marks the job as failed regardless of Agent SDK state.

**Fix:**
```python
import asyncio
try:
    result = await asyncio.wait_for(self._run_agent_deployment(...), timeout=2700)  # 45 min
except asyncio.TimeoutError:
    self._handle_failure(job_id, bot, telegram_user_id, "Deployment timed out after 45 minutes")
```

### MISS-5. Pi5 disk space — no cleanup or monitoring

Each deployment SCPs scripts to a remote VPS, writes temporary `client.env` files, and the Agent SDK generates logs/session data in `~/.claude/`. Over months of deployments, the Pi5's SD card fills up silently. No log rotation, no temp file cleanup, no disk space monitoring.

**Fix:** Add to worker startup: check available disk space, warn if <2GB. Add periodic cleanup of old temp files and Agent SDK session data.

---

## Consistency Issues

### S2. Phase grouping mismatch between CLAUDE.md and playbook.py

The existing `CLAUDE.md` groups scripts as:
- Phase 2: scripts 04-07
- Phase 3: scripts 08-13

But `playbook.py` (lines 1080-1082) groups them as:
- Phase 2: scripts 04-08
- Phase 3: scripts 09-13

Script 08 (watchdogs) is in Phase 3 per CLAUDE.md but Phase 2 per `playbook.py`. Gate checks fire at different points.

**Fix:** Align with CLAUDE.md grouping (04-07, then 08-13). The gate check after Phase 2 should validate core services (OpenClaw + Qdrant + SearXNG), and watchdogs are an "extra" that depends on those core services.

### S4. Webhook port 18789 hardcoded

**Location:** Line 1280

```python
webhook_url = f"https://{server_ip}:18789/webhook"
```

This port number is not defined anywhere in the spec or install scripts. Should come from configuration rather than being hardcoded.

---

## Security Concerns

### SEC1. client.env written to world-readable `/tmp` on Pi5

**Location:** Lines 1110-1114 (`playbook.py`)

The deployment prompt instructs the agent to write `client.env` (containing `DEEPSEEK_API_KEY`, `OPENAI_API_KEY`, `TELEGRAM_BOT_TOKEN`) to `/tmp/client-{job_id}.env` on the Pi5 before SCP-ing. If the agent crashes between write and cleanup, secrets persist in a world-readable directory.

**Fix:** Use `mktemp` with restrictive permissions: `umask 077; TMPFILE=$(mktemp)` and ensure cleanup in a trap.

### SEC2. Bot tokens in `journalctl` log output

**Location:** Lines 1318-1319

The `client_env` content includes `TELEGRAM_BOT_TOKEN={bot_token}` and is embedded in the Agent SDK prompt. This may appear in stdout captured by `journalctl`. Anyone with Pi5 journal access can read customer bot tokens.

**Fix:** Redact sensitive values in log output, or configure the systemd service with `LogLevelMax=` to limit verbosity.

---

## Removed / Downgraded Findings

### ~~M5. No structured logging~~ — removed

For Phase 0 with a single Pi5 worker processing 2-3 deploys/day, `print()` + `journalctl` is adequate. `journalctl` already adds timestamps. Structured logging is a Phase 1+ improvement, not a Phase 0 finding.

### ~~I1. grant_type mismatch~~ — downgraded to typo

The actual `contabo-auth.sh` script is correct. Only the pre-work test command has a typo. Not an architectural finding.

---

## Architecture Assessment

The overall architecture is **sound and appropriately scoped**:

- Separating deterministic steps (provision, webhook) from AI-driven steps (install + QA) is the correct split
- Filesystem-based bot pool is simple and adequate for Phase 0-1 (single worker, low volume)
- Polling model avoids exposing Pi5 to inbound connections
- No overengineering (no DB, no message queue, no containers on Pi5)
- Agent SDK as "AI operator" is the project's core differentiator and is well-motivated

**Operational gaps that will bite in production:** The lack of deployment timeouts (MISS-4), rate limit backoff (MISS-2), and Contabo token refresh (MISS-3) are the kind of issues that look minor in a review but cause production incidents. The Contabo destroy behavior (I4) could invalidate the entire VPS provider choice.

---

## Recommended Fix Order

| Priority | Items | Why |
|----------|-------|-----|
| 1 | C1, C2, C3 | Critical bugs — will crash at runtime |
| 2 | **I4 first**, then I2, I3 | I4 is a potential strategy blocker — validate Contabo destroy behavior before writing any code. I2/I3 are standard pre-work. |
| 3 | M7 (provider fallback) + M6 (webhook — only if OpenClaw doesn't handle it) | M7 is 5 lines, saves hours. M6 needs investigation first. |
| 4 | M2, M3, **MISS-4** (deployment timeout) | Stale job cleanup + bot username tracking + wall-clock timeout |
| 5 | S2 | Phase grouping alignment with CLAUDE.md |
| 6 | SEC1, SEC2, **MISS-2** (rate limit backoff), **MISS-3** (token expiry), MISS-5, S4 | Hardening and operational resilience |
| 7 | **MISS-1** | Verify Max plan auth conversion completeness (grep for stale references) |

---

## Summary

| Category | Count | Severity |
|----------|-------|----------|
| Critical bugs (will crash at runtime) | 3 | Must fix |
| Incorrect API assumptions | 3 (I1 downgraded) | Must verify/fix — **I4 is potential strategy blocker** |
| Missing features from spec | 4 (M5 removed) | Should fix before production |
| Missing findings (operational risks) | 5 | MISS-2, MISS-3, MISS-4 should fix before production |
| Consistency issues | 2 | Should fix |
| Security concerns | 2 | Should fix |

The plan is approximately 85% complete and well-structured. The critical code bugs (C1-C3) are all fixable with targeted changes. **The most important pre-work item is I4** — validating Contabo's destroy behavior. If Contabo can't immediately delete VPSes, the churn flow and cost model need redesign (or switch to Hetzner). The newly identified operational risks (MISS-1 through MISS-5) are the kind of gaps that don't crash code but cause production incidents — address them before going live.
