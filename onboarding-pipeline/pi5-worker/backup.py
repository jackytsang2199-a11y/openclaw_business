"""Backup orchestrator: VPS -> Pi5 weekly backup.

Spec: docs/superpowers/specs/2026-03-27-customer-backup-strategy-design.md

For each active customer VPS:
  1. SSH in, safe-copy mem0.db (Tier 2+)
  2. Create Qdrant snapshot (Tier 2+)
  3. Tar ~/clawd/ workspace
  4. SCP files to Pi5 /backups/active/{CUSTOMER_ID}/
  5. Write backup-meta.json
  6. Clean up /tmp on VPS
"""

import json
import os
import subprocess
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import config
from api_client import ApiClient
from notifier import Notifier


class BackupOrchestrator:
    def __init__(self, api: ApiClient, notifier: Notifier, backups_dir: str = None):
        self.api = api
        self.notifier = notifier
        self.backups_dir = Path(backups_dir or str(config.BACKUPS_DIR))
        self.ssh_key = str(config.SSH_KEY_PATH)
        self.ssh_opts = [
            "-o", "StrictHostKeyChecking=no",
            "-o", "UserKnownHostsFile=/dev/null",
            "-o", "ConnectTimeout=15",
            "-i", self.ssh_key,
        ]

    def _ssh_cmd(self, ip: str, command: str, timeout: int = 120) -> subprocess.CompletedProcess:
        return subprocess.run(
            ["ssh", *self.ssh_opts, f"deploy@{ip}", command],
            capture_output=True, text=True, timeout=timeout,
        )

    def _scp_from(self, ip: str, remote_path: str, local_path: str, timeout: int = 300) -> subprocess.CompletedProcess:
        os.makedirs(os.path.dirname(local_path), exist_ok=True)
        return subprocess.run(
            ["scp", *self.ssh_opts, f"deploy@{ip}:{remote_path}", local_path],
            capture_output=True, text=True, timeout=timeout,
        )

    def write_meta(self, customer_id: str, vps_ip: str, tier: int,
                   size_bytes: int, status: str) -> None:
        customer_dir = self.backups_dir / "active" / customer_id
        customer_dir.mkdir(parents=True, exist_ok=True)
        meta = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "customer_id": customer_id,
            "vps_ip": vps_ip,
            "tier": tier,
            "size_bytes": size_bytes,
            "status": status,
        }
        meta_path = customer_dir / "backup-meta.json"
        meta_path.write_text(json.dumps(meta, indent=2))

    def _read_previous_size(self, customer_id: str) -> Optional[int]:
        meta_path = self.backups_dir / "active" / customer_id / "backup-meta.json"
        if meta_path.exists():
            try:
                meta = json.loads(meta_path.read_text())
                return meta.get("size_bytes")
            except (json.JSONDecodeError, KeyError):
                return None
        return None

    def backup_single_vps(self, vps: dict) -> dict:
        customer_id = vps["customer_id"]
        ip = vps["contabo_ip"]
        tier = vps["tier"]
        customer_dir = self.backups_dir / "active" / customer_id

        print(f"[backup] {customer_id}: Starting backup from {ip} (Tier {tier})")

        mem0_exists = False
        if tier >= 2:
            check = self._ssh_cmd(ip, 'test -f ~/clawd/mem0-history.db && echo EXISTS')
            if "EXISTS" in (check.stdout or ""):
                result = self._ssh_cmd(ip, 'sqlite3 ~/clawd/mem0-history.db ".backup /tmp/mem0-backup.db"')
                if result.returncode != 0:
                    error = f"sqlite3 backup failed: {result.stderr[:200]}"
                    print(f"[backup] {customer_id}: {error}")
                    return {"success": False, "customer_id": customer_id, "error": error}
                mem0_exists = True
            else:
                print(f"[backup] {customer_id}: mem0-history.db not found, skipping")

        qdrant_snapshot_name = None
        if tier >= 2:
            result = self._ssh_cmd(
                ip,
                f'curl -s -X POST http://localhost:6333/collections/client-{customer_id}-memories/snapshots',
            )
            if result.returncode != 0:
                error = f"Qdrant snapshot failed: {result.stderr[:200]}"
                print(f"[backup] {customer_id}: {error}")
                return {"success": False, "customer_id": customer_id, "error": error}
            try:
                snap_response = json.loads(result.stdout)
                if "error" in snap_response.get("status", {}):
                    # Collection doesn't exist yet (no memories stored) — skip
                    print(f"[backup] {customer_id}: Qdrant collection not found, skipping snapshot")
                else:
                    qdrant_snapshot_name = snap_response["result"]["name"]
            except (json.JSONDecodeError, KeyError):
                error = f"Qdrant snapshot response parse failed: {result.stdout[:200]}"
                print(f"[backup] {customer_id}: {error}")
                return {"success": False, "customer_id": customer_id, "error": error}

        result = self._ssh_cmd(ip, 'tar -czf /tmp/clawd-backup.tar.gz -C ~/ clawd/', timeout=300)
        if result.returncode != 0:
            error = f"tar failed: {result.stderr[:200]}"
            print(f"[backup] {customer_id}: {error}")
            return {"success": False, "customer_id": customer_id, "error": error}

        customer_dir.mkdir(parents=True, exist_ok=True)

        result = self._scp_from(ip, "/tmp/clawd-backup.tar.gz", str(customer_dir / "clawd.tar.gz"))
        if result.returncode != 0:
            error = f"SCP clawd.tar.gz failed: {result.stderr[:200]}"
            print(f"[backup] {customer_id}: {error}")
            return {"success": False, "customer_id": customer_id, "error": error}

        if tier >= 2 and qdrant_snapshot_name:
            qdrant_remote = f"/qdrant/snapshots/client-{customer_id}-memories/{qdrant_snapshot_name}"
            result = self._scp_from(ip, qdrant_remote, str(customer_dir / "qdrant-snapshot.tar.gz"))
            if result.returncode != 0:
                error = f"SCP Qdrant snapshot failed: {result.stderr[:200]}"
                print(f"[backup] {customer_id}: {error}")
                return {"success": False, "customer_id": customer_id, "error": error}

        if tier >= 2 and mem0_exists:
            result = self._scp_from(ip, "/tmp/mem0-backup.db", str(customer_dir / "mem0.db"))
            if result.returncode != 0:
                error = f"SCP mem0.db failed: {result.stderr[:200]}"
                print(f"[backup] {customer_id}: {error}")
                return {"success": False, "customer_id": customer_id, "error": error}

        total_size = sum(
            f.stat().st_size for f in customer_dir.iterdir() if f.is_file() and f.name != "backup-meta.json"
        )

        self.write_meta(customer_id, ip, tier, total_size, "success")

        cleanup_cmd = "rm -f /tmp/clawd-backup.tar.gz /tmp/mem0-backup.db"
        if tier >= 2 and qdrant_snapshot_name:
            cleanup_cmd += f" /qdrant/snapshots/client-{customer_id}-memories/{qdrant_snapshot_name}"
        self._ssh_cmd(ip, cleanup_cmd)

        print(f"[backup] {customer_id}: OK ({total_size} bytes)")
        return {"success": True, "customer_id": customer_id, "size_bytes": total_size}

    def run_all(self, stagger_seconds: int = None) -> None:
        if stagger_seconds is None:
            stagger_seconds = config.BACKUP_STAGGER_SECONDS

        vps_list = self.api.get_active_vps_list()
        total = len(vps_list)
        print(f"[backup] Starting backup run: {total} active VPSes")

        successes = 0
        failures = 0

        for i, vps in enumerate(vps_list):
            customer_id = vps["customer_id"]
            previous_size = self._read_previous_size(customer_id)

            result = self.backup_single_vps(vps)

            if result["success"]:
                successes += 1
                current_size = result.get("size_bytes", 0)
                if current_size == 0:
                    self.notifier.send(
                        f"Backup anomaly: {customer_id} — 0 bytes"
                    )
                elif previous_size and current_size > previous_size * 2:
                    self.notifier.send(
                        f"Backup anomaly: {customer_id} — "
                        f"{current_size} bytes (was {previous_size})"
                    )
            else:
                failures += 1
                self.notifier.send(
                    f"Backup failed: {customer_id} — {result.get('error', 'unknown')}"
                )

            if stagger_seconds > 0 and i < total - 1:
                time.sleep(stagger_seconds)

        active_dir = self.backups_dir / "active"
        if active_dir.exists():
            total_usage = sum(
                f.stat().st_size for f in active_dir.rglob("*") if f.is_file()
            )
            budget_80pct = 12 * 1024 * 1024 * 1024
            if total_usage > budget_80pct:
                self.notifier.send(
                    f"Backup storage warning: {total_usage / 1024 / 1024:.0f}MB used "
                    f"(budget: 15GB)"
                )

        log_path = self.backups_dir / "backup.log"
        timestamp = datetime.now(timezone.utc).isoformat()
        with open(log_path, "a") as f:
            f.write(f"{timestamp} | {successes}/{total} OK | {failures} failed\n")

        print(f"[backup] Complete: {successes}/{total} OK, {failures} failed")


if __name__ == "__main__":
    from api_client import ApiClient
    from notifier import Notifier

    api = ApiClient(config.CF_WORKER_URL, config.WORKER_TOKEN)
    notifier = Notifier(config.OWNER_TELEGRAM_BOT_TOKEN, config.OWNER_TELEGRAM_CHAT_ID)
    orchestrator = BackupOrchestrator(api, notifier)
    orchestrator.run_all()
