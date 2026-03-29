#!/usr/bin/env python3
"""E2E integration test: full backup/restore cycle against a REAL VPS over SSH.

This is NOT a unit test. It runs against a live VPS and performs real SSH
operations. Run manually on Pi5 when ready to validate the backup pipeline.

Usage:
    # Full backup/restore cycle
    python test_e2e_backup_restore.py --vps-ip 1.2.3.4 --customer-id T001 --tier 2

    # SSH connectivity check only
    python test_e2e_backup_restore.py --dry-run --vps-ip 1.2.3.4

    # Override SSH key path
    python test_e2e_backup_restore.py --vps-ip 1.2.3.4 --customer-id T001 --tier 2 \
        --ssh-key ~/.ssh/nexgen_automation

Environment variables (alternative to CLI args):
    E2E_VPS_IP          VPS IP address
    E2E_CUSTOMER_ID     Customer ID (e.g. T001)
    E2E_TIER            Service tier (1, 2, or 3)
    SSH_KEY_PATH         SSH private key path
"""

import argparse
import json
import os
import shutil
import subprocess
import sys
import tempfile
import time
from datetime import datetime, timezone
from pathlib import Path

# ---------------------------------------------------------------------------
# Ensure pi5-worker package is importable (tests/ is one level down)
# ---------------------------------------------------------------------------
_WORKER_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_WORKER_DIR))

# Set env defaults so config module loads without crashing.
# These are NOT used for real API calls -- the E2E test only exercises
# BackupOrchestrator (SSH/SCP) and RestoreHelper, not the CF Worker API.
_ENV_DEFAULTS = {
    "CF_WORKER_URL": "http://localhost:9999",
    "WORKER_TOKEN": "e2e-test-token",
    "OWNER_TELEGRAM_BOT_TOKEN": "000000000:fake",
    "OWNER_TELEGRAM_CHAT_ID": "0",
    "CONTABO_CLIENT_ID": "unused",
    "CONTABO_CLIENT_SECRET": "unused",
    "CONTABO_API_USER": "unused",
    "CONTABO_API_PASSWORD": "unused",
}
for k, v in _ENV_DEFAULTS.items():
    os.environ.setdefault(k, v)

from backup import BackupOrchestrator  # noqa: E402
from restore import RestoreHelper       # noqa: E402

# ---------------------------------------------------------------------------
# Test result tracking
# ---------------------------------------------------------------------------
_results: list[dict] = []


def record(name: str, passed: bool, detail: str = ""):
    status = "PASS" if passed else "FAIL"
    _results.append({"name": name, "passed": passed, "detail": detail})
    tag = f"[{status}]"
    msg = f"  {tag:6s} {name}"
    if detail:
        msg += f"  -- {detail}"
    print(msg)


def print_summary():
    total = len(_results)
    passed = sum(1 for r in _results if r["passed"])
    failed = total - passed
    print()
    print("=" * 60)
    print(f"  Results: {passed}/{total} passed, {failed} failed")
    print("=" * 60)
    if failed:
        print()
        print("  Failed tests:")
        for r in _results:
            if not r["passed"]:
                print(f"    - {r['name']}: {r['detail']}")
    print()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

class StubNotifier:
    """Drop-in for Notifier that captures messages instead of sending Telegram."""

    def __init__(self):
        self.messages: list[str] = []

    def send(self, message: str):
        self.messages.append(message)
        print(f"  [notifier-stub] {message}")


class StubApiClient:
    """Minimal stand-in for ApiClient -- E2E tests don't call the CF Worker."""
    pass


def build_vps_dict(customer_id: str, vps_ip: str, tier: int) -> dict:
    """Build the VPS dict that BackupOrchestrator.backup_single_vps expects."""
    return {
        "customer_id": customer_id,
        "contabo_ip": vps_ip,
        "tier": tier,
    }


# ---------------------------------------------------------------------------
# Individual test steps
# ---------------------------------------------------------------------------

def test_ssh_connectivity(vps_ip: str, ssh_key: str) -> bool:
    """Step 1: Verify SSH to the test VPS works."""
    print()
    print("--- Step 1: SSH connectivity ---")
    ssh_opts = [
        "-o", "StrictHostKeyChecking=no",
        "-o", "UserKnownHostsFile=/dev/null",
        "-o", "ConnectTimeout=15",
        "-i", ssh_key,
    ]
    try:
        result = subprocess.run(
            ["ssh", *ssh_opts, f"deploy@{vps_ip}", "echo SSH_OK && hostname"],
            capture_output=True, text=True, timeout=30,
        )
        stdout = result.stdout.strip()
        if result.returncode == 0 and "SSH_OK" in stdout:
            hostname = stdout.split("\n")[-1] if "\n" in stdout else "unknown"
            record("ssh_connectivity", True, f"host={hostname}")
            return True
        else:
            record("ssh_connectivity", False,
                   f"rc={result.returncode} stderr={result.stderr[:200]}")
            return False
    except subprocess.TimeoutExpired:
        record("ssh_connectivity", False, "Connection timed out after 30s")
        return False
    except FileNotFoundError:
        record("ssh_connectivity", False, "ssh binary not found")
        return False


def test_backup_single_vps(orchestrator: BackupOrchestrator,
                           vps_ip: str, customer_id: str,
                           tier: int, backups_dir: Path) -> bool:
    """Step 2: Run backup_single_vps and verify files."""
    print()
    print("--- Step 2: Backup single VPS ---")

    vps = build_vps_dict(customer_id, vps_ip, tier)
    result = orchestrator.backup_single_vps(vps)

    if not result.get("success"):
        record("backup_single_vps", False,
               f"backup_single_vps returned failure: {result.get('error', 'unknown')}")
        return False
    record("backup_execution", True, "backup_single_vps returned success")

    customer_dir = backups_dir / "active" / customer_id

    # Verify clawd.tar.gz
    clawd_tar = customer_dir / "clawd.tar.gz"
    if clawd_tar.exists() and clawd_tar.stat().st_size > 0:
        record("file_clawd_tar_gz", True,
               f"size={clawd_tar.stat().st_size} bytes")
    else:
        record("file_clawd_tar_gz", False,
               f"exists={clawd_tar.exists()}, size={clawd_tar.stat().st_size if clawd_tar.exists() else 'N/A'}")

    # Verify mem0.db (Tier 2+, optional -- VPS may not have stored memories yet)
    if tier >= 2:
        mem0_db = customer_dir / "mem0.db"
        if mem0_db.exists():
            if mem0_db.stat().st_size > 0:
                record("file_mem0_db", True,
                       f"size={mem0_db.stat().st_size} bytes")
            else:
                record("file_mem0_db", False, "file exists but 0 bytes")
        else:
            record("file_mem0_db", True,
                   "not present (VPS has no mem0-history.db yet -- acceptable)")

    # Verify Qdrant snapshot (Tier 2+, optional -- collection may not exist)
    if tier >= 2:
        qdrant_snap = customer_dir / "qdrant-snapshot.tar.gz"
        if qdrant_snap.exists():
            if qdrant_snap.stat().st_size > 0:
                record("file_qdrant_snapshot", True,
                       f"size={qdrant_snap.stat().st_size} bytes")
            else:
                record("file_qdrant_snapshot", False, "file exists but 0 bytes")
        else:
            record("file_qdrant_snapshot", True,
                   "not present (no Qdrant collection yet -- acceptable)")

    # Verify backup-meta.json exists and is non-empty
    meta_path = customer_dir / "backup-meta.json"
    if meta_path.exists() and meta_path.stat().st_size > 0:
        record("file_backup_meta_json", True,
               f"size={meta_path.stat().st_size} bytes")
    else:
        record("file_backup_meta_json", False,
               f"exists={meta_path.exists()}")

    # Verify all backup files have size > 0
    zero_files = [
        f.name for f in customer_dir.iterdir()
        if f.is_file() and f.stat().st_size == 0
    ]
    if zero_files:
        record("no_zero_byte_files", False, f"zero-byte files: {zero_files}")
    else:
        record("no_zero_byte_files", True)

    return True


def test_backup_meta_validation(backups_dir: Path, customer_id: str,
                                vps_ip: str, tier: int) -> bool:
    """Step 3: Validate backup-meta.json fields."""
    print()
    print("--- Step 3: Backup meta validation ---")

    meta_path = backups_dir / "active" / customer_id / "backup-meta.json"
    if not meta_path.exists():
        record("meta_file_exists", False, "backup-meta.json not found")
        return False

    try:
        meta = json.loads(meta_path.read_text())
    except json.JSONDecodeError as e:
        record("meta_valid_json", False, str(e))
        return False

    record("meta_valid_json", True)

    required_fields = ["timestamp", "customer_id", "vps_ip", "tier", "size_bytes", "status"]
    missing = [f for f in required_fields if f not in meta]
    if missing:
        record("meta_required_fields", False, f"missing: {missing}")
        return False
    record("meta_required_fields", True, f"all {len(required_fields)} fields present")

    # Validate field values
    ok = True

    if meta["customer_id"] != customer_id:
        record("meta_customer_id", False,
               f"expected={customer_id}, got={meta['customer_id']}")
        ok = False
    else:
        record("meta_customer_id", True)

    if meta["vps_ip"] != vps_ip:
        record("meta_vps_ip", False,
               f"expected={vps_ip}, got={meta['vps_ip']}")
        ok = False
    else:
        record("meta_vps_ip", True)

    if meta["tier"] != tier:
        record("meta_tier", False, f"expected={tier}, got={meta['tier']}")
        ok = False
    else:
        record("meta_tier", True)

    if not isinstance(meta["size_bytes"], int) or meta["size_bytes"] <= 0:
        record("meta_size_bytes", False, f"got={meta['size_bytes']}")
        ok = False
    else:
        record("meta_size_bytes", True, f"{meta['size_bytes']} bytes")

    if meta["status"] != "success":
        record("meta_status", False, f"expected=success, got={meta['status']}")
        ok = False
    else:
        record("meta_status", True)

    # Validate timestamp is parseable and recent (within last 5 minutes)
    try:
        ts = datetime.fromisoformat(meta["timestamp"])
        age_seconds = (datetime.now(timezone.utc) - ts).total_seconds()
        if 0 <= age_seconds <= 300:
            record("meta_timestamp_recent", True, f"age={age_seconds:.0f}s")
        else:
            record("meta_timestamp_recent", False,
                   f"age={age_seconds:.0f}s (expected <300s)")
            ok = False
    except (ValueError, TypeError) as e:
        record("meta_timestamp_recent", False, f"parse error: {e}")
        ok = False

    return ok


def test_restore_dry_run(backups_dir: Path, customer_id: str) -> bool:
    """Step 4: Validate RestoreHelper can find and read backup without restoring."""
    print()
    print("--- Step 4: Restore dry-run (validation only) ---")

    notifier = StubNotifier()
    helper = RestoreHelper(notifier, backups_dir=str(backups_dir))

    backup_dir = backups_dir / "active" / customer_id

    # Check backup directory exists
    if not backup_dir.exists():
        record("restore_backup_dir_exists", False, str(backup_dir))
        return False
    record("restore_backup_dir_exists", True)

    # Check clawd.tar.gz is present (minimum required file)
    clawd_tar = backup_dir / "clawd.tar.gz"
    if not clawd_tar.exists():
        record("restore_clawd_tar_present", False)
        return False
    record("restore_clawd_tar_present", True)

    # Read meta to verify tier info would be picked up
    meta_path = backup_dir / "backup-meta.json"
    if meta_path.exists():
        try:
            meta = json.loads(meta_path.read_text())
            tier = meta.get("tier", 1)
            record("restore_meta_readable", True, f"tier={tier}")
        except json.JSONDecodeError:
            record("restore_meta_readable", False, "invalid JSON")
            return False
    else:
        record("restore_meta_readable", True, "no meta file (would default to tier 1)")

    # Verify calling restore with a bogus IP would not crash (just fail gracefully)
    # Use a non-routable IP to avoid actually connecting
    result = helper.restore(customer_id, "192.0.2.1", source_dir=str(backup_dir))
    # This will fail at SCP (connection refused/timeout), but should not raise
    if not result["success"]:
        record("restore_graceful_failure", True,
               f"failed as expected: {result['error'][:80]}")
    else:
        # Extremely unlikely with a bogus IP, but handle it
        record("restore_graceful_failure", True, "unexpectedly succeeded")

    # List available backup files for the customer
    files = sorted(f.name for f in backup_dir.iterdir() if f.is_file())
    record("restore_backup_inventory", True, f"files={files}")

    return True


def test_vps_tmp_cleanup(vps_ip: str, ssh_key: str, customer_id: str,
                         tier: int) -> bool:
    """Step 5: Verify /tmp backup files were cleaned up on VPS."""
    print()
    print("--- Step 5: VPS /tmp cleanup verification ---")

    ssh_opts = [
        "-o", "StrictHostKeyChecking=no",
        "-o", "UserKnownHostsFile=/dev/null",
        "-o", "ConnectTimeout=15",
        "-i", ssh_key,
    ]

    # Check that the backup temp files no longer exist
    tmp_files = ["/tmp/clawd-backup.tar.gz", "/tmp/mem0-backup.db"]
    check_cmd = " && ".join(
        f'test ! -f {f} && echo "CLEAN:{f}"' for f in tmp_files
    )
    # Use || true so partial success still produces output
    check_cmd = " ; ".join(
        f'(test ! -f {f} && echo "CLEAN:{f}" || echo "DIRTY:{f}")' for f in tmp_files
    )

    try:
        result = subprocess.run(
            ["ssh", *ssh_opts, f"deploy@{vps_ip}", check_cmd],
            capture_output=True, text=True, timeout=30,
        )
        stdout = result.stdout.strip()
        dirty = [line for line in stdout.splitlines() if line.startswith("DIRTY:")]
        if dirty:
            record("vps_tmp_cleanup", False, f"leftover files: {dirty}")
            return False
        record("vps_tmp_cleanup", True, "all /tmp backup files removed")
        return True
    except subprocess.TimeoutExpired:
        record("vps_tmp_cleanup", False, "SSH timed out")
        return False


def test_size_anomaly_no_false_positive(orchestrator: BackupOrchestrator,
                                        notifier: StubNotifier,
                                        vps_ip: str, customer_id: str,
                                        tier: int) -> bool:
    """Step 6: Run backup twice, verify no false positive anomaly alert."""
    print()
    print("--- Step 6: Size anomaly detection (double-backup) ---")

    vps = build_vps_dict(customer_id, vps_ip, tier)

    # First backup already done in Step 2. The meta is written.
    # Read the size from first backup's meta.
    meta_path = orchestrator.backups_dir / "active" / customer_id / "backup-meta.json"
    if not meta_path.exists():
        record("anomaly_first_backup_meta", False, "no meta from first backup")
        return False

    first_meta = json.loads(meta_path.read_text())
    first_size = first_meta["size_bytes"]
    record("anomaly_first_backup_size", True, f"{first_size} bytes")

    # Clear notifier messages before second backup
    notifier.messages.clear()

    # Run second backup
    result = orchestrator.backup_single_vps(vps)
    if not result.get("success"):
        record("anomaly_second_backup", False,
               f"second backup failed: {result.get('error', 'unknown')}")
        return False
    record("anomaly_second_backup", True, f"{result['size_bytes']} bytes")

    # Check that no anomaly notification was sent
    # The anomaly triggers when current_size > previous_size * 2 or current_size == 0
    anomaly_msgs = [m for m in notifier.messages if "anomaly" in m.lower()]
    if anomaly_msgs:
        record("anomaly_no_false_positive", False,
               f"unexpected anomaly alert: {anomaly_msgs}")
        return False

    # Verify sizes are within reasonable range of each other (< 2x)
    second_size = result["size_bytes"]
    if first_size > 0 and second_size > first_size * 2:
        record("anomaly_no_false_positive", False,
               f"size doubled unexpectedly: {first_size} -> {second_size}")
        return False

    record("anomaly_no_false_positive", True,
           f"no false alerts, sizes: {first_size} -> {second_size}")
    return True


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="E2E backup/restore test against a live VPS",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("--vps-ip", default=os.environ.get("E2E_VPS_IP"),
                        help="VPS IP address (or set E2E_VPS_IP)")
    parser.add_argument("--customer-id", default=os.environ.get("E2E_CUSTOMER_ID", "T001"),
                        help="Customer ID (default: T001)")
    parser.add_argument("--tier", type=int, default=int(os.environ.get("E2E_TIER", "2")),
                        choices=[1, 2, 3], help="Service tier (default: 2)")
    parser.add_argument("--ssh-key", default=os.environ.get("SSH_KEY_PATH"),
                        help="SSH private key path (default: from config)")
    parser.add_argument("--dry-run", action="store_true",
                        help="Only check SSH connectivity, skip backup/restore")
    args = parser.parse_args()

    if not args.vps_ip:
        parser.error("--vps-ip is required (or set E2E_VPS_IP env var)")

    # Resolve SSH key: CLI arg > env var > config default
    import config as cfg
    ssh_key = args.ssh_key or str(cfg.SSH_KEY_PATH)

    print("=" * 60)
    print("  E2E Backup/Restore Test")
    print("=" * 60)
    print(f"  VPS IP:       {args.vps_ip}")
    print(f"  Customer ID:  {args.customer_id}")
    print(f"  Tier:         {args.tier}")
    print(f"  SSH Key:      {ssh_key}")
    print(f"  Dry Run:      {args.dry_run}")
    print(f"  Timestamp:    {datetime.now(timezone.utc).isoformat()}")
    print("=" * 60)

    # --- Step 1: SSH connectivity (always runs) ---
    ssh_ok = test_ssh_connectivity(args.vps_ip, ssh_key)
    if not ssh_ok:
        print()
        print("SSH connectivity failed. Cannot proceed with E2E tests.")
        print_summary()
        sys.exit(1)

    if args.dry_run:
        print()
        print("Dry run complete. SSH connectivity verified.")
        print_summary()
        sys.exit(0)

    # --- Set up temp backups directory ---
    test_backups_dir = Path(tempfile.mkdtemp(prefix="e2e_backup_"))
    print(f"\n  Test backups dir: {test_backups_dir}")

    notifier = StubNotifier()
    api = StubApiClient()
    orchestrator = BackupOrchestrator(api, notifier, backups_dir=str(test_backups_dir))
    # Override SSH key if provided via CLI
    orchestrator.ssh_key = ssh_key
    # Rebuild ssh_opts with the correct key
    orchestrator.ssh_opts = [
        "-o", "StrictHostKeyChecking=no",
        "-o", "UserKnownHostsFile=/dev/null",
        "-o", "ConnectTimeout=15",
        "-i", ssh_key,
    ]

    try:
        # --- Step 2: Backup single VPS ---
        backup_ok = test_backup_single_vps(
            orchestrator, args.vps_ip, args.customer_id,
            args.tier, test_backups_dir,
        )

        # --- Step 3: Backup meta validation ---
        if backup_ok:
            test_backup_meta_validation(
                test_backups_dir, args.customer_id,
                args.vps_ip, args.tier,
            )

        # --- Step 4: Restore dry-run ---
        if backup_ok:
            test_restore_dry_run(test_backups_dir, args.customer_id)

        # --- Step 5: VPS /tmp cleanup ---
        if backup_ok:
            test_vps_tmp_cleanup(
                args.vps_ip, ssh_key, args.customer_id, args.tier,
            )

        # --- Step 6: Size anomaly (double backup) ---
        if backup_ok:
            test_size_anomaly_no_false_positive(
                orchestrator, notifier,
                args.vps_ip, args.customer_id, args.tier,
            )

    finally:
        # --- Cleanup test artifacts ---
        print()
        print("--- Cleanup ---")
        try:
            shutil.rmtree(test_backups_dir)
            print(f"  Removed test backups dir: {test_backups_dir}")
        except OSError as e:
            print(f"  Warning: could not remove {test_backups_dir}: {e}")

    print_summary()

    # Exit code: 0 if all passed, 1 if any failed
    failed = sum(1 for r in _results if not r["passed"])
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
