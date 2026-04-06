# Contabo API Guide — For AI Agents

> **Purpose:** Quick-reference for any AI agent (Claude Agent SDK, Pi5 worker, or human operator) that needs to interact with the Contabo API for VPS provisioning, lifecycle management, and recycling within the NexGen customer onboarding pipeline.
>
> **Source:** https://api.contabo.com/ (fetched 2026-03-27)
>
> **Context:** See `docs/superpowers/plans/2026-03-26-plan-b-pi5-worker.md` for the full implementation plan and `docs/superpowers/specs/2026-03-27-contabo-vps-billing-strategy-design.md` for VPS billing/recycling strategy.

---

## 1. Authentication (OAuth2 Password Grant)

Contabo uses OAuth2 with the **password grant type**. You need four credentials from the Contabo Customer Control Panel:

| Credential | Env Var | Where to Get |
|---|---|---|
| OAuth Client ID | `CONTABO_CLIENT_ID` | Contabo Panel → API Settings |
| OAuth Client Secret | `CONTABO_CLIENT_SECRET` | Contabo Panel → API Settings |
| API Username (email) | `CONTABO_API_USER` | Your Contabo login email |
| API Password | `CONTABO_API_PASSWORD` | Your Contabo login password |

### Get Access Token

```bash
curl -s -X POST \
  "https://auth.contabo.com/auth/realms/contabo/protocol/openid-connect/token" \
  -d "client_id=${CONTABO_CLIENT_ID}" \
  -d "client_secret=${CONTABO_CLIENT_SECRET}" \
  -d "grant_type=password" \
  -d "username=${CONTABO_API_USER}" \
  -d "password=${CONTABO_API_PASSWORD}"
```

**Response:**
```json
{
  "access_token": "eyJ...",
  "expires_in": 300,
  "token_type": "Bearer"
}
```

**Important:**
- Token expires in **300 seconds (5 minutes)** — refresh before each API call in long-running operations
- Store in variable: `TOKEN=$(curl ... | jq -r '.access_token')`

---

## 2. Required Headers

Every API request **must** include:

| Header | Value | Notes |
|---|---|---|
| `Authorization` | `Bearer {access_token}` | From OAuth token above |
| `x-request-id` | UUID4 or unique string | **Required.** Must be unique per request. Example: `nexgen-T001-1711540800` |
| `Content-Type` | `application/json` | For POST/PUT/PATCH requests |
| `x-trace-id` | Any string | Optional. Groups related requests for debugging |

**If you omit `x-request-id`, the API will reject your request.**

---

## 3. Base URL

```
https://api.contabo.com/v1
```

---

## 4. Operations We Use (Pipeline-Critical)

### 4.1 List Instances

```
GET /compute/instances
```

Query params: `page`, `size`, `orderBy`, `name`, `displayName`, `dataCenter`, `region`, `status`, `search`

```bash
curl -s -H "Authorization: Bearer ${TOKEN}" \
  -H "x-request-id: list-$(date +%s)" \
  "https://api.contabo.com/v1/compute/instances"
```

**Use case:** Check for recyclable VPS (status=running + pending cancellation), count active instances, monitor pool.

### 4.2 Create Instance (New VPS)

```
POST /compute/instances
```

```bash
curl -s -X POST "https://api.contabo.com/v1/compute/instances" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "x-request-id: create-${CLIENT_ID}-$(date +%s)" \
  -H "Content-Type: application/json" \
  -d '{
    "imageId": "afecbb85-e2fc-46f0-9684-b46b1faf00bb",
    "productId": "V45",
    "region": "EU-DE-1",
    "period": 1,
    "displayName": "nexgen-T001",
    "sshKeys": [12345],
    "userData": "#cloud-config\n..."
  }'
```

**Key Parameters:**

| Param | Type | Description |
|---|---|---|
| `imageId` | string | OS image UUID. Default: Ubuntu 22.04. **Get actual ID from `GET /compute/images`** |
| `productId` | string | VPS tier. `V45` = Cloud VPS S (4 vCPU, 8GB RAM, 200GB SSD, ~EUR 4.50/mo). See Section 7 for all tiers. |
| `region` | string | Data center region. `EU-DE-1` = Germany. See Section 8 for all regions. |
| `period` | int | Billing period in months: `1`, `3`, `6`, or `12`. **Always use `1` for our recycling strategy.** |
| `displayName` | string | Human-readable name (e.g., `nexgen-T001`) |
| `sshKeys` | array[int] | Array of **secret IDs** (not raw keys). Upload SSH keys via Secrets API first. |
| `rootPassword` | int | Secret ID containing root password. Alternative to SSH keys. |
| `userData` | string | Cloud-Init YAML as a string |
| `defaultUser` | string | `root`, `admin`, or `administrator`. Default: `root` |

**Response:**
```json
{
  "data": [{
    "instanceId": 12345,
    "contractId": "67890",
    "ipConfig": { "v4": { "ip": "1.2.3.4" } },
    "status": "provisioning",
    "displayName": "nexgen-T001"
  }]
}
```

**Important Notes:**
- `sshKeys` takes **secret IDs**, not raw public keys. You must first upload your SSH public key via `POST /secrets` (type: `ssh`) and use the returned secret ID.
- Contabo provisioning is **slow** (5–15 minutes). Poll `GET /compute/instances/{instanceId}` until `status` = `"running"` and `ipConfig.v4.ip` is populated.
- First-time orders may trigger **fraud verification** (hours-long delay). Place one VPS manually first to clear this.

### 4.3 Get Instance Details

```
GET /compute/instances/{instanceId}
```

```bash
curl -s -H "Authorization: Bearer ${TOKEN}" \
  -H "x-request-id: get-${INSTANCE_ID}-$(date +%s)" \
  "https://api.contabo.com/v1/compute/instances/${INSTANCE_ID}"
```

**Use case:** Poll for IP assignment after creation, check instance status, get current config.

**Response `data[0]` fields:**
- `instanceId` — Numeric instance ID
- `status` — `provisioning`, `running`, `stopped`, `error`, `installing`, `unknown`
- `ipConfig.v4.ip` — Public IPv4 address
- `contractId` — Billing contract reference
- `displayName` — Human-readable name
- `productId` — VPS tier code
- `region` — Data center region

### 4.4 Reinstall Instance (OS Wipe for Recycling)

```
PUT /compute/instances/{instanceId}
```

```bash
curl -s -X PUT "https://api.contabo.com/v1/compute/instances/${INSTANCE_ID}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "x-request-id: reinstall-${INSTANCE_ID}-$(date +%s)" \
  -H "Content-Type: application/json" \
  -d '{
    "imageId": "afecbb85-e2fc-46f0-9684-b46b1faf00bb",
    "sshKeys": [12345]
  }'
```

**Use case:** Wipe a recycled VPS to clean state before redeploying for a new customer. This is a **full OS reinstall** — all data is destroyed.

**Important:** After reinstall, SSH won't be available for ~5–15 minutes. Poll with SSH connection attempts.

### 4.5 Cancel Instance (Submit Billing Cancellation)

```
POST /compute/instances/{instanceId}/cancel
```

```bash
curl -s -X POST \
  "https://api.contabo.com/v1/compute/instances/${INSTANCE_ID}/cancel" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "x-request-id: cancel-${INSTANCE_ID}-$(date +%s)" \
  -H "Content-Type: application/json"
```

**Use case:** When a customer churns, submit cancellation. The VPS **stays running** until Contabo's scheduled termination date (~4 weeks from current billing period end). During this window, the VPS can be recycled.

**Response includes:** `cancelDate` — the date Contabo will terminate the VPS.

### 4.6 Revoke Cancellation (For Recycling)

> **VERIFIED 2026-04-06: Contabo API does NOT support revoking cancellations.**
>
> Tested all plausible endpoints:
> - `PATCH /compute/instances/{id}/cancel` with `{"cancel": false}` → 404
> - `DELETE /compute/instances/{id}/cancel` → 404
> - `PATCH /compute/instances/{id}` with `{"cancelDate": null}` → 200 but field unchanged (read-only)
> - `PATCH /compute/instances/{id}` with `{"cancelDate": ""}` → 200 but field unchanged (read-only)
>
> **Revocation is ONLY possible via the Contabo control panel (manual).**
> Panel URL: https://my.contabo.com/compute → instance → "Undo cancellation"

**Required workflow:** When recycling a VPS, the operator must manually revoke in the Contabo panel before the CLI can proceed with OS reinstall and deployment. The CLI will prompt and wait.

**Use case:** When a new customer arrives and a cancelling VPS is available in the recycling pool, revoke its cancellation before reinstalling and redeploying.

### 4.7 Instance Actions (Start/Stop/Restart)

```
POST /compute/instances/{instanceId}/actions/start
POST /compute/instances/{instanceId}/actions/restart
POST /compute/instances/{instanceId}/actions/stop
POST /compute/instances/{instanceId}/actions/shutdown
POST /compute/instances/{instanceId}/actions/rescue
POST /compute/instances/{instanceId}/actions/reset-password
```

**Use case:** Rarely needed. `restart` may help if a VPS becomes unresponsive during deployment. `rescue` boots into recovery mode for debugging failed installations.

---

## 5. Secrets API (SSH Key Management)

Contabo requires SSH keys to be uploaded as "secrets" before they can be used in instance creation.

### Upload SSH Key

```
POST /secrets
```

```bash
curl -s -X POST "https://api.contabo.com/v1/secrets" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "x-request-id: ssh-key-$(date +%s)" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "nexgen-automation",
    "value": "ssh-ed25519 AAAA... deploy@nexgen",
    "type": "ssh"
  }'
```

**Response:**
```json
{
  "data": [{
    "secretId": 12345,
    "name": "nexgen-automation",
    "type": "ssh"
  }]
}
```

**Use the returned `secretId`** in the `sshKeys` array when creating instances.

### List Secrets

```
GET /secrets
```

Use to find the secret ID for your SSH key if you've already uploaded it.

---

## 6. Images API (Find OS Image IDs)

### List Available Images

```
GET /compute/images
```

```bash
curl -s -H "Authorization: Bearer ${TOKEN}" \
  -H "x-request-id: images-$(date +%s)" \
  "https://api.contabo.com/v1/compute/images"
```

**Use case:** Find the correct `imageId` for Ubuntu 24.04 (or latest LTS). The default image ID in our scripts (`afecbb85-e2fc-46f0-9684-b46b1faf00bb`) may change — always verify.

**Filter by name:** Add `?name=Ubuntu` to filter results.

---

## 7. Product IDs (VPS Tiers)

| Product ID | Type | vCPU | RAM | Disk | Approx. Price |
|---|---|---|---|---|---|
| V45 | Cloud VPS S | 4 | 8 GB | 200 GB SSD | ~EUR 4.50/mo |
| V91–V107 | Cloud VPS (various) | 1–4 | 2–16 GB | 75–1400 GB | Varies |
| V8–V16 | VDS (dedicated) | 8–32 | 16–64 GB | 180–720 GB | Higher |

**Our standard:** `V45` (Cloud VPS S, 8GB RAM) for all tiers. Tier differences are software, not hardware.

---

## 8. Regions

| Region Code | Location |
|---|---|
| `EU-DE-1` | Germany (default) |
| `EU` | Europe (generic) |
| `US-central` | US Central |
| `US-east` | US East |
| `US-west` | US West |
| `SIN` | Singapore |
| `UK` | United Kingdom |
| `AUS` | Australia |
| `JPN` | Japan |
| `IND` | India |

**Our standard:** `EU-DE-1` (Germany) — cheapest, closest to most Contabo infrastructure.

---

## 9. Response Format

All responses follow this structure:

```json
{
  "data": [ /* array of resource objects */ ],
  "_pagination": {
    "size": 10,
    "totalElements": 100,
    "totalPages": 10,
    "page": 1
  },
  "_links": {
    "first": "/v1/...",
    "self": "/v1/...",
    "next": "/v1/...",
    "last": "/v1/..."
  }
}
```

**Pagination:** Use `?page=N&size=M` query params. Default page size is 10.

---

## 10. HTTP Status Codes

| Code | Meaning | Action |
|---|---|---|
| 200 | Success | Parse `data` |
| 201 | Created | Parse `data` for new resource |
| 204 | No content | Success, no body |
| 400 | Bad request | Check request body/params |
| 401 | Unauthorized | Token expired — re-authenticate |
| 403 | Forbidden | Check API user permissions |
| 404 | Not found | Instance ID wrong or deleted |
| 409 | Conflict | Resource already exists or state conflict |
| 429 | Rate limited | Back off and retry after delay |
| 500 | Server error | Retry after delay |

---

## 11. Pipeline Integration Summary

### New Customer Deploy Flow

```
1. Check recycling pool → GET /compute/instances (filter status + cancellation)
   ├─ Recyclable VPS found:
   │   a. Revoke cancellation (Section 4.6 — may need manual fallback)
   │   b. Reinstall OS → PUT /compute/instances/{id}
   │   c. Poll for SSH ready (5-15 min)
   │   d. Run deployment scripts
   └─ No recyclable VPS:
       a. Upload SSH key if needed → POST /secrets
       b. Create instance → POST /compute/instances
       c. Poll for IP + running status (5-15 min)
       d. Run deployment scripts
```

### Customer Churn Flow

```
1. Wipe customer data (SSH into VPS, export archives)
2. Submit cancellation → POST /compute/instances/{id}/cancel
3. Record cancel_deadline in CF D1 (vps_instances table)
4. VPS enters recycling pool (still running, cancellation ticking)
```

### Daily Monitoring (CF Worker Cron)

```
1. List all instances → GET /compute/instances
2. Count by status: active, cancelling, total
3. Check cancelling VPS approaching termination deadline
4. Alert if recyclable pool empty and new orders pending
5. Alert if total VPS cost exceeds 10% of revenue
```

---

## 12. Known Gotchas

1. **Token expiry is 5 minutes.** Always get a fresh token before multi-step operations.
2. **`sshKeys` takes secret IDs, not raw keys.** Upload via `POST /secrets` first.
3. **Provisioning is slow.** Expect 5–15 minutes from `POST /compute/instances` to SSH-ready. Poll every 30 seconds.
4. **First order triggers fraud check.** Place one order manually via web panel before automating.
5. **Cancellation revoke endpoint is unverified.** Test during P2; have manual fallback ready.
6. **`x-request-id` is mandatory.** Every request needs a unique one. Use `{action}-{id}-{timestamp}` pattern.
7. **Image IDs can change.** Always verify Ubuntu image ID via `GET /compute/images` before hardcoding.
8. **Monthly billing, no proration.** Cancellation takes effect at end of billing period + 4-week notice. VPS keeps running during this window.
9. **75 instance limit per account.** Monitor count; plan for second account at scale.
10. **All VPS tiers use same hardware (V45, 8GB).** Tier differences are software-only — any recycled VPS works for any tier.

---

## 13. Endpoints NOT Used (But Available)

These exist in the API but are not part of our pipeline:

- **Snapshots** (`/compute/instances/{id}/snapshots`) — We use SSH-based backups instead
- **Object Storage** (`/object-storages`) — Not needed; backups go to Pi5
- **Private Networks** (`/private-networks`) — Single VPS per customer, no inter-VPS networking
- **Firewalls** (`/firewalls`) — We use UFW on the VPS directly
- **DNS** (`/dns/zones`) — We use Cloudflare for DNS
- **Domains** (`/domains`) — We use Cloudflare Registrar
- **Tags** (`/tags`) — Could be useful later for labeling VPS by customer/tier
- **Upgrade Instance** (`POST /compute/instances/{id}/upgrade`) — All tiers use same hardware

---

## 14. Quick Test Commands

Verify your credentials work:

```bash
# 1. Get token
TOKEN=$(curl -s -X POST \
  "https://auth.contabo.com/auth/realms/contabo/protocol/openid-connect/token" \
  -d "client_id=${CONTABO_CLIENT_ID}" \
  -d "client_secret=${CONTABO_CLIENT_SECRET}" \
  -d "grant_type=password" \
  -d "username=${CONTABO_API_USER}" \
  -d "password=${CONTABO_API_PASSWORD}" | jq -r '.access_token')

echo "Token: ${TOKEN:0:20}..."

# 2. List instances
curl -s -H "Authorization: Bearer ${TOKEN}" \
  -H "x-request-id: test-$(date +%s)" \
  "https://api.contabo.com/v1/compute/instances" | jq '.data | length'

# 3. List available images (find Ubuntu 24.04 ID)
curl -s -H "Authorization: Bearer ${TOKEN}" \
  -H "x-request-id: images-$(date +%s)" \
  "https://api.contabo.com/v1/compute/images?name=Ubuntu" | jq '.data[] | {imageId, name}'

# 4. List uploaded SSH keys
curl -s -H "Authorization: Bearer ${TOKEN}" \
  -H "x-request-id: secrets-$(date +%s)" \
  "https://api.contabo.com/v1/secrets?type=ssh" | jq '.data[] | {secretId, name}'
```
