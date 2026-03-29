#!/usr/bin/env bash
# Pi5 Monitoring Dashboard — runs every 15 min via cron
# Writes to ~/dashboard-status.txt + stdout. Exit 1 if worker down or auth missing.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT="$HOME/dashboard-status.txt"
CRITICAL_FAIL=0

# Load .env
if [ -f "$SCRIPT_DIR/.env" ]; then
    while IFS='=' read -r key value; do
        key="${key%%[[:space:]]}" ; value="${value##[[:space:]]}"
        [[ -z "$key" || "$key" == \#* ]] && continue
        export "$key"="$value"
    done < "$SCRIPT_DIR/.env"
fi

CF_URL="${CF_WORKER_URL:-}" ; TOKEN="${WORKER_TOKEN:-}" ; T=5
HAS_CREDS=false
[ -n "$CF_URL" ] && [ -n "$TOKEN" ] && HAS_CREDS=true

section() { echo "" ; echo "=== $1 ==="; }
ok()   { echo "  [OK]   $1"; }
warn() { echo "  [WARN] $1"; }
fail() { echo "  [FAIL] $1"; CRITICAL_FAIL=1; }

api_get() { curl -sf --max-time "$T" "$CF_URL$1" -H "Authorization: Bearer $TOKEN" 2>/dev/null; }
api_post() { curl -sf --max-time "$T" -X POST "$CF_URL$1" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "${2:-{}}" 2>/dev/null; }
jq_py() { python3 -c "import sys,json; d=json.load(sys.stdin); $1" 2>/dev/null; }

{
    echo "============================================"
    echo "  3NexGen Pi5 Dashboard"
    echo "  $(date '+%Y-%m-%d %H:%M:%S %Z')"
    echo "============================================"

    # 1. Worker service
    section "Worker Service"
    if systemctl --user is-active nexgen-worker >/dev/null 2>&1; then
        ok "nexgen-worker is active"
    else
        fail "nexgen-worker is $(systemctl --user is-active nexgen-worker 2>&1 || true)"
    fi

    # 2. CF Worker health ping
    section "CF Worker Health"
    if $HAS_CREDS; then
        if api_post "/api/health" '{"source":"dashboard"}' >/dev/null; then
            ok "Health ping returned 200"
        else
            warn "CF Worker unreachable or non-200 response"
        fi
    else
        warn "CF_WORKER_URL or WORKER_TOKEN not set — skipping API checks"
    fi

    # 3. Active VPS count
    section "Active VPS Instances"
    if $HAS_CREDS; then
        RESP=$(api_get "/api/vps?status=active" || echo "")
        if [ -n "$RESP" ]; then
            COUNT=$(echo "$RESP" | jq_py "print(len(d.get('vps',d.get('data',[]))))" || echo "?")
            ok "Active VPS count: $COUNT"
        else
            warn "Could not fetch VPS list"
        fi
    fi

    # 4. Pending jobs
    section "Pending Jobs"
    if $HAS_CREDS; then
        RESP=$(api_get "/api/jobs/next" || echo "")
        if [ -n "$RESP" ]; then
            HAS_JOB=$(echo "$RESP" | jq_py "print('yes' if d.get('job') else 'no')" || echo "?")
            [ "$HAS_JOB" = "yes" ] && warn "Pending job waiting for pickup" || ok "No pending jobs"
        else
            warn "Could not check job queue"
        fi
    fi

    # 5. Disk usage
    section "Disk Usage"
    ok "Root: $(df -h / | awk 'NR==2 {print $3 " / " $2 " (" $5 " used)"}')"
    [ -d "$HOME/backups" ] && ok "Backups: $(du -sh "$HOME/backups" 2>/dev/null | awk '{print $1}')" || ok "No backups directory"

    # 6. Memory
    section "Memory"
    ok "$(free -h | awk 'NR==2 {print $3 " used / " $2 " total (" $7 " available)"}')"

    # 7. Docker containers
    section "Docker Containers"
    if command -v docker >/dev/null 2>&1; then
        RUNNING=$(docker ps --format "{{.Names}}\t{{.Status}}" 2>/dev/null || true)
        if [ -n "$RUNNING" ]; then
            echo "$RUNNING" | while IFS= read -r line; do echo "  $line"; done
        else
            ok "No running containers"
        fi
    else
        ok "Docker not installed"
    fi

    # 8. Last backup
    section "Last Backup"
    META="$HOME/backups/active/backup-meta.json"
    if [ -f "$META" ]; then
        ok "Last backup: $(python3 -c "import json; d=json.load(open('$META')); print(d.get('timestamp',d.get('date','unknown')))" 2>/dev/null || echo "unknown")"
    else
        warn "No backup-meta.json found"
    fi

    # 9. Claude auth
    section "Claude Agent SDK Auth"
    [ -d "$HOME/.claude" ] && ok "~/.claude/ directory exists" || fail "~/.claude/ MISSING — Agent SDK cannot authenticate"

    # Summary
    echo ""
    echo "--------------------------------------------"
    [ "$CRITICAL_FAIL" -eq 0 ] && echo "  STATUS: ALL CRITICAL CHECKS PASSED" || echo "  STATUS: CRITICAL FAILURE DETECTED"
    echo "--------------------------------------------"
} 2>&1 | tee "$OUTPUT"

exit "$CRITICAL_FAIL"
