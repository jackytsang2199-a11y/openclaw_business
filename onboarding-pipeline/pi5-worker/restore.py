"""Restore helper: Pi5 -> VPS data restore.

Spec: docs/superpowers/specs/2026-03-27-customer-backup-strategy-design.md — Section 7

Restores a customer's data from Pi5 backup onto a target VPS.
Used for: VPS crash recovery, Contabo re-provision, corruption rollback.
"""

import json
import subprocess
from pathlib import Path

import config
from notifier import Notifier


class RestoreHelper:
    def __init__(self, notifier: Notifier, backups_dir: str = None):
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

    def _scp_to(self, local_path: str, ip: str, remote_path: str, timeout: int = 300) -> subprocess.CompletedProcess:
        return subprocess.run(
            ["scp", *self.ssh_opts, local_path, f"deploy@{ip}:{remote_path}"],
            capture_output=True, text=True, timeout=timeout,
        )

    def restore(self, customer_id: str, target_ip: str,
                source_dir: str = None) -> dict:
        backup_dir = Path(source_dir) if source_dir else (
            self.backups_dir / "active" / customer_id
        )

        if not backup_dir.exists():
            return {
                "success": False,
                "customer_id": customer_id,
                "error": f"No backup found at {backup_dir}",
            }

        meta_path = backup_dir / "backup-meta.json"
        tier = 1
        if meta_path.exists():
            try:
                meta = json.loads(meta_path.read_text())
                tier = meta.get("tier", 1)
            except (json.JSONDecodeError, KeyError):
                pass

        clawd_tar = backup_dir / "clawd.tar.gz"
        qdrant_snap = backup_dir / "qdrant-snapshot.tar.gz"
        mem0_db = backup_dir / "mem0.db"

        print(f"[restore] {customer_id}: Restoring to {target_ip} (Tier {tier})")

        if not clawd_tar.exists():
            return {
                "success": False,
                "customer_id": customer_id,
                "error": "No backup found — clawd.tar.gz missing",
            }

        result = self._scp_to(str(clawd_tar), target_ip, "/tmp/clawd-backup.tar.gz")
        if result.returncode != 0:
            return {
                "success": False,
                "customer_id": customer_id,
                "error": f"SCP clawd.tar.gz failed: {result.stderr[:200]}",
            }

        result = self._ssh_cmd(
            target_ip,
            "rm -rf ~/clawd && tar -xzf /tmp/clawd-backup.tar.gz -C ~/",
            timeout=300,
        )
        if result.returncode != 0:
            return {
                "success": False,
                "customer_id": customer_id,
                "error": f"Extract clawd failed: {result.stderr[:200]}",
            }

        if tier >= 2 and qdrant_snap.exists():
            result = self._scp_to(str(qdrant_snap), target_ip, "/tmp/qdrant-restore.snapshot")
            if result.returncode != 0:
                return {
                    "success": False,
                    "customer_id": customer_id,
                    "error": f"SCP Qdrant snapshot failed: {result.stderr[:200]}",
                }
            result = self._ssh_cmd(
                target_ip,
                f'curl -s -X PUT "http://localhost:6333/collections/client-{customer_id}-memories/snapshots/recover" '
                '-H "Content-Type: application/json" '
                '-d \'{"location": "/tmp/qdrant-restore.snapshot"}\'',
            )
            if result.returncode != 0:
                return {
                    "success": False,
                    "customer_id": customer_id,
                    "error": f"Qdrant restore failed: {result.stderr[:200]}",
                }

        if tier >= 2 and mem0_db.exists():
            result = self._scp_to(str(mem0_db), target_ip, "~/clawd/mem0-history.db")
            if result.returncode != 0:
                return {
                    "success": False,
                    "customer_id": customer_id,
                    "error": f"SCP mem0.db failed: {result.stderr[:200]}",
                }

        self._ssh_cmd(target_ip, "export XDG_RUNTIME_DIR=/run/user/$(id -u) && systemctl --user restart openclaw-gateway.service")
        cleanup = "rm -f /tmp/clawd-backup.tar.gz"
        if tier >= 2:
            cleanup += " /tmp/qdrant-restore.snapshot"
        self._ssh_cmd(target_ip, cleanup)

        print(f"[restore] {customer_id}: Restore complete to {target_ip}")
        self.notifier.send(f"{customer_id}: Restored to {target_ip} from backup")

        return {"success": True, "customer_id": customer_id}


if __name__ == "__main__":
    import sys

    if len(sys.argv) < 3:
        print("Usage: python3 -m restore <CUSTOMER_ID> <TARGET_IP> [SOURCE_DIR]")
        sys.exit(1)

    customer_id = sys.argv[1]
    target_ip = sys.argv[2]
    source_dir = sys.argv[3] if len(sys.argv) > 3 else None

    notifier = Notifier(config.OWNER_TELEGRAM_BOT_TOKEN, config.OWNER_TELEGRAM_CHAT_ID)
    helper = RestoreHelper(notifier)
    result = helper.restore(customer_id, target_ip, source_dir)

    if not result["success"]:
        print(f"FAILED: {result['error']}")
        sys.exit(1)
    print("OK")
