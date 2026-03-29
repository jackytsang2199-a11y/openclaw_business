#!/usr/bin/env python3
"""E2E integration test for VPS lifecycle (cancel + recycle flows).

This is NOT a unit test. It runs against REAL Contabo API and REAL CF Worker.
Run manually on Pi5 when ready to validate the full recycling flow.

Usage:
    # Dry run — check API connectivity only, no mutations
    python test_e2e_vps_lifecycle.py --dry-run

    # Full cancel flow test
    python test_e2e_vps_lifecycle.py --vps-id <INSTANCE_ID> --job-id <TEST_JOB_ID> --test cancel

    # Full recycle flow test (VPS must already be in 'cancelling' status)
    python test_e2e_vps_lifecycle.py --vps-id <INSTANCE_ID> --job-id <TEST_JOB_ID> --test recycle

    # Full cycle: cancel then recycle
    python test_e2e_vps_lifecycle.py --vps-id <INSTANCE_ID> --job-id <TEST_JOB_ID> --test full

Environment:
    Requires the same .env as pi5-worker (CF_WORKER_URL, WORKER_TOKEN, Contabo creds, etc.)
    Or set these env vars directly before running.
"""

import argparse
import os
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

# Add parent directory to path so we can import pi5-worker modules
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import config
from api_client import ApiClient
from notifier import Notifier
from vps_lifecycle import VpsLifecycle


# ---------------------------------------------------------------------------
# Formatting helpers
# ---------------------------------------------------------------------------

class Colors:
    GREEN = "\033[92m"
    RED = "\033[91m"
    YELLOW = "\033[93m"
    CYAN = "\033[96m"
    BOLD = "\033[1m"
    RESET = "\033[0m"


def print_pass(label: str, detail: str = ""):
    msg = f"  {Colors.GREEN}PASS{Colors.RESET}  {label}"
    if detail:
        msg += f"  ({detail})"
    print(msg)


def print_fail(label: str, detail: str = ""):
    msg = f"  {Colors.RED}FAIL{Colors.RESET}  {label}"
    if detail:
        msg += f"  ({detail})"
    print(msg)


def print_skip(label: str, detail: str = ""):
    msg = f"  {Colors.YELLOW}SKIP{Colors.RESET}  {label}"
    if detail:
        msg += f"  ({detail})"
    print(msg)


def print_header(title: str):
    print(f"\n{Colors.BOLD}{Colors.CYAN}{'=' * 60}")
    print(f"  {title}")
    print(f"{'=' * 60}{Colors.RESET}\n")


def confirm(prompt: str) -> bool:
    """Prompt user for Y/N confirmation. Returns True if confirmed."""
    answer = input(f"  {Colors.YELLOW}>>> {prompt} [y/N]: {Colors.RESET}").strip().lower()
    return answer in ("y", "yes")


# ---------------------------------------------------------------------------
# Test result tracking
# ---------------------------------------------------------------------------

class TestResults:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.skipped = 0
        self.errors: list[str] = []

    def record_pass(self, label: str, detail: str = ""):
        self.passed += 1
        print_pass(label, detail)

    def record_fail(self, label: str, detail: str = ""):
        self.failed += 1
        self.errors.append(f"{label}: {detail}")
        print_fail(label, detail)

    def record_skip(self, label: str, detail: str = ""):
        self.skipped += 1
        print_skip(label, detail)

    def summary(self):
        total = self.passed + self.failed + self.skipped
        print_header("Test Summary")
        print(f"  Total:   {total}")
        print(f"  Passed:  {Colors.GREEN}{self.passed}{Colors.RESET}")
        print(f"  Failed:  {Colors.RED}{self.failed}{Colors.RESET}")
        print(f"  Skipped: {Colors.YELLOW}{self.skipped}{Colors.RESET}")
        if self.errors:
            print(f"\n  {Colors.RED}Failures:{Colors.RESET}")
            for err in self.errors:
                print(f"    - {err}")
        print()
        return self.failed == 0


# ---------------------------------------------------------------------------
# Dry-run checks
# ---------------------------------------------------------------------------

def test_dry_run(results: TestResults):
    """Check API connectivity without making any mutations."""
    print_header("Dry Run -- Connectivity Checks")

    # 1. CF Worker health
    print("  Checking CF Worker connectivity...")
    try:
        api = ApiClient(config.CF_WORKER_URL, config.WORKER_TOKEN)
        api.send_health_ping()
        results.record_pass("CF Worker health ping", config.CF_WORKER_URL)
    except Exception as e:
        results.record_fail("CF Worker health ping", str(e))

    # 2. CF Worker VPS list (read-only)
    print("  Checking CF Worker VPS endpoint...")
    try:
        api = ApiClient(config.CF_WORKER_URL, config.WORKER_TOKEN)
        vps_list = api.get_active_vps_list()
        results.record_pass("CF Worker VPS list", f"{len(vps_list)} active VPS(es)")
    except Exception as e:
        results.record_fail("CF Worker VPS list", str(e))

    # 3. CF Worker recyclable endpoint (read-only)
    print("  Checking CF Worker recyclable VPS endpoint...")
    try:
        api = ApiClient(config.CF_WORKER_URL, config.WORKER_TOKEN)
        recyclable = api.get_recyclable_vps()
        if recyclable:
            results.record_pass(
                "CF Worker recyclable VPS",
                f"Found: {recyclable['vps_id']} ({recyclable.get('contabo_ip', '?')})"
            )
        else:
            results.record_pass("CF Worker recyclable VPS", "None available (empty pool)")
    except Exception as e:
        results.record_fail("CF Worker recyclable VPS", str(e))

    # 4. Contabo API auth
    print("  Checking Contabo API authentication...")
    try:
        provision_dir = config.OPENCLAW_INSTALL_DIR / "provision"
        result = subprocess.run(
            ["bash", str(provision_dir / "contabo-auth.sh")],
            capture_output=True, text=True, timeout=30,
            cwd=str(config.OPENCLAW_INSTALL_DIR),
        )
        if result.returncode == 0 and result.stdout.strip():
            token_preview = result.stdout.strip()[:20] + "..."
            results.record_pass("Contabo API auth", f"Token obtained: {token_preview}")
        else:
            results.record_fail("Contabo API auth", result.stderr.strip()[:200])
    except subprocess.TimeoutExpired:
        results.record_fail("Contabo API auth", "Timed out after 30s")
    except FileNotFoundError:
        results.record_fail("Contabo API auth", "contabo-auth.sh not found")
    except Exception as e:
        results.record_fail("Contabo API auth", str(e))

    # 5. Contabo VPS instance query (read-only, uses curl directly)
    print("  Checking Contabo instance list...")
    try:
        provision_dir = config.OPENCLAW_INSTALL_DIR / "provision"
        # Get a fresh token and list instances
        auth_result = subprocess.run(
            ["bash", str(provision_dir / "contabo-auth.sh")],
            capture_output=True, text=True, timeout=30,
            cwd=str(config.OPENCLAW_INSTALL_DIR),
        )
        if auth_result.returncode == 0:
            token = auth_result.stdout.strip()
            import json
            list_result = subprocess.run(
                [
                    "curl", "-s",
                    "-H", f"Authorization: Bearer {token}",
                    "-H", "x-request-id: e2e-test-dry-run",
                    "https://api.contabo.com/v1/compute/instances",
                ],
                capture_output=True, text=True, timeout=30,
            )
            if list_result.returncode == 0:
                data = json.loads(list_result.stdout)
                instances = data.get("data", [])
                results.record_pass(
                    "Contabo instance list",
                    f"{len(instances)} instance(s) found"
                )
            else:
                results.record_fail("Contabo instance list", "curl failed")
        else:
            results.record_skip("Contabo instance list", "Auth failed, skipping")
    except Exception as e:
        results.record_fail("Contabo instance list", str(e))

    # 6. Provision scripts exist
    print("  Checking provision scripts...")
    provision_dir = config.OPENCLAW_INSTALL_DIR / "provision"
    scripts = ["contabo-auth.sh", "contabo-cancel.sh", "contabo-revoke.sh", "contabo-reinstall.sh"]
    missing = [s for s in scripts if not (provision_dir / s).exists()]
    if not missing:
        results.record_pass("Provision scripts", f"All {len(scripts)} scripts found")
    else:
        results.record_fail("Provision scripts", f"Missing: {', '.join(missing)}")

    # 7. Telegram (optional, non-blocking)
    print("  Checking Telegram notification...")
    try:
        notifier = Notifier(config.OWNER_TELEGRAM_BOT_TOKEN, config.OWNER_TELEGRAM_CHAT_ID)
        ok = notifier.send("[E2E dry-run] VPS lifecycle connectivity check passed")
        if ok:
            results.record_pass("Telegram notification", "Message sent to owner")
        else:
            results.record_fail("Telegram notification", "Send returned False")
    except Exception as e:
        results.record_fail("Telegram notification", str(e))


# ---------------------------------------------------------------------------
# Cancel flow
# ---------------------------------------------------------------------------

def test_cancel_flow(vps_id: str, job_id: str, results: TestResults):
    """Test handle_cancel() against a real VPS."""
    print_header(f"Cancel Flow -- VPS {vps_id}")

    api = ApiClient(config.CF_WORKER_URL, config.WORKER_TOKEN)
    notifier = Notifier(config.OWNER_TELEGRAM_BOT_TOKEN, config.OWNER_TELEGRAM_CHAT_ID)
    lifecycle = VpsLifecycle(api, notifier)

    # Pre-check: verify VPS exists in D1
    print("  Pre-check: verifying VPS record in D1...")
    try:
        vps_list = api.get_active_vps_list()
        vps_record = None
        for v in vps_list:
            if v.get("vps_id") == vps_id:
                vps_record = v
                break
        if vps_record:
            results.record_pass(
                "VPS record exists in D1",
                f"status={vps_record.get('status')}, ip={vps_record.get('contabo_ip')}"
            )
        else:
            # Try to get it even if not in active list -- might have a different status
            print(f"    VPS {vps_id} not in active list, proceeding anyway")
            results.record_pass("VPS record check", "Not in active list (may have different status)")
    except Exception as e:
        results.record_fail("VPS record check", str(e))
        print("  Cannot verify VPS record. Aborting cancel flow.")
        return

    # Safety confirmation
    print()
    print(f"  {Colors.BOLD}This will:{Colors.RESET}")
    print(f"    1. Reinstall OS on VPS {vps_id} (WIPES ALL DATA)")
    print(f"    2. Submit Contabo cancellation (billing cancel)")
    print(f"    3. Update D1 record to status=cancelling")
    print()
    if not confirm(f"Proceed with CANCEL of VPS {vps_id}?"):
        results.record_skip("Cancel flow", "User declined confirmation")
        return

    # Create a fake job dict matching what handle_cancel expects
    job = {
        "id": job_id,
        "vps_id": vps_id,
        "type": "cancel",
    }

    # We also need to create the job in D1 so update_job doesn't fail.
    # For the test we'll first create a job, then cancel it.
    print("\n  Creating test job in D1...")
    try:
        created_job = api.update_job(job_id, "processing")
        results.record_pass("Test job created/updated in D1", f"id={job_id}")
    except Exception as e:
        # Job might not exist yet. Try to work around by noting this.
        print(f"    Warning: Could not update job in D1: {e}")
        print("    handle_cancel will attempt update_job -- it may fail at the end.")
        results.record_skip("Test job pre-creation", str(e))

    # Run cancel
    print("\n  Running handle_cancel()...")
    start = time.time()
    try:
        lifecycle.handle_cancel(job)
        elapsed = time.time() - start
        results.record_pass("handle_cancel() completed", f"{elapsed:.1f}s")
    except Exception as e:
        elapsed = time.time() - start
        results.record_fail("handle_cancel() raised exception", f"{e} ({elapsed:.1f}s)")
        return

    # Verify D1 record updated
    print("\n  Verifying D1 record after cancel...")
    try:
        # Re-fetch -- the VPS should now be in 'cancelling' status
        # We can't use get_active_vps_list since it filters by active.
        # Use the recyclable endpoint instead -- if it returns our VPS, it's in cancelling state.
        recyclable = api.get_recyclable_vps()
        if recyclable and recyclable.get("vps_id") == vps_id:
            cancel_deadline = recyclable.get("cancel_deadline", "unknown")
            results.record_pass(
                "D1 status updated to cancelling",
                f"cancel_deadline={cancel_deadline}"
            )
            # Verify cancel_deadline is in the future
            if cancel_deadline and cancel_deadline != "unknown":
                try:
                    deadline_dt = datetime.fromisoformat(cancel_deadline.replace("Z", "+00:00"))
                    now = datetime.now(timezone.utc)
                    if deadline_dt > now:
                        days_left = (deadline_dt - now).days
                        results.record_pass("Cancel deadline is in the future", f"{days_left} days from now")
                    else:
                        results.record_fail("Cancel deadline is in the past", cancel_deadline)
                except ValueError as e:
                    results.record_fail("Cancel deadline parse error", f"{cancel_deadline}: {e}")
            else:
                results.record_skip("Cancel deadline check", "Deadline not returned or unknown")
        else:
            # Could be that another VPS is returned first, or endpoint doesn't show it yet
            results.record_fail(
                "D1 status verification",
                f"Recyclable endpoint did not return VPS {vps_id}"
            )
    except Exception as e:
        results.record_fail("D1 record verification", str(e))


# ---------------------------------------------------------------------------
# Recycle flow
# ---------------------------------------------------------------------------

def test_recycle_flow(vps_id: str, job_id: str, results: TestResults):
    """Test try_recycle() against a VPS that is in 'cancelling' status."""
    print_header(f"Recycle Flow -- expecting VPS {vps_id} in pool")

    api = ApiClient(config.CF_WORKER_URL, config.WORKER_TOKEN)
    notifier = Notifier(config.OWNER_TELEGRAM_BOT_TOKEN, config.OWNER_TELEGRAM_CHAT_ID)
    lifecycle = VpsLifecycle(api, notifier)

    # Pre-check: verify recyclable pool has our VPS
    print("  Pre-check: checking recyclable pool...")
    try:
        recyclable = api.get_recyclable_vps()
        if not recyclable:
            results.record_fail("Recyclable pool check", "Pool is empty -- nothing to recycle")
            print("  Cannot proceed with recycle flow. Run cancel flow first.")
            return
        pool_vps_id = recyclable.get("vps_id")
        if pool_vps_id == vps_id:
            old_reinstall_count = recyclable.get("reinstall_count", 0)
            results.record_pass(
                "Target VPS found in recyclable pool",
                f"reinstall_count={old_reinstall_count}, ip={recyclable.get('contabo_ip')}"
            )
        else:
            print(f"    Pool returned VPS {pool_vps_id} instead of {vps_id}")
            print(f"    The recycle flow will use whichever VPS the pool returns.")
            results.record_pass(
                "Recyclable pool has a VPS",
                f"vps_id={pool_vps_id} (not the specified {vps_id})"
            )
            vps_id = pool_vps_id  # Use what the pool gives us
            old_reinstall_count = recyclable.get("reinstall_count", 0)
    except Exception as e:
        results.record_fail("Recyclable pool check", str(e))
        return

    # Safety confirmation
    print()
    print(f"  {Colors.BOLD}This will:{Colors.RESET}")
    print(f"    1. Revoke Contabo cancellation for VPS {vps_id}")
    print(f"    2. Reinstall OS on VPS {vps_id} (full wipe)")
    print(f"    3. Update D1: status=active, reinstall_count incremented")
    print()
    if not confirm(f"Proceed with RECYCLE of VPS {vps_id}?"):
        results.record_skip("Recycle flow", "User declined confirmation")
        return

    # Run recycle
    tier = 2  # Test tier
    print(f"\n  Running try_recycle(job_id={job_id}, tier={tier})...")
    start = time.time()
    try:
        ip = lifecycle.try_recycle(job_id, tier)
        elapsed = time.time() - start

        if ip:
            results.record_pass("try_recycle() returned IP", f"{ip} ({elapsed:.1f}s)")
        else:
            results.record_fail("try_recycle() returned None", f"Expected an IP ({elapsed:.1f}s)")
            return
    except Exception as e:
        elapsed = time.time() - start
        results.record_fail("try_recycle() raised exception", f"{e} ({elapsed:.1f}s)")
        return

    # Verify D1 record updated
    print("\n  Verifying D1 record after recycle...")
    try:
        vps_list = api.get_active_vps_list()
        recycled = None
        for v in vps_list:
            if v.get("vps_id") == vps_id:
                recycled = v
                break

        if recycled:
            status = recycled.get("status")
            reinstall_count = recycled.get("reinstall_count", 0)
            customer_id = recycled.get("customer_id")

            if status == "active":
                results.record_pass("D1 status is active", f"status={status}")
            else:
                results.record_fail("D1 status check", f"Expected 'active', got '{status}'")

            if reinstall_count == old_reinstall_count + 1:
                results.record_pass(
                    "reinstall_count incremented",
                    f"{old_reinstall_count} -> {reinstall_count}"
                )
            else:
                results.record_fail(
                    "reinstall_count check",
                    f"Expected {old_reinstall_count + 1}, got {reinstall_count}"
                )

            if customer_id == job_id:
                results.record_pass("customer_id updated", f"customer_id={customer_id}")
            else:
                results.record_fail(
                    "customer_id check",
                    f"Expected '{job_id}', got '{customer_id}'"
                )

            # Verify cancel fields cleared
            cancel_date = recycled.get("cancel_date")
            cancel_deadline = recycled.get("cancel_deadline")
            if not cancel_date and not cancel_deadline:
                results.record_pass("Cancel fields cleared", "cancel_date=None, cancel_deadline=None")
            else:
                results.record_fail(
                    "Cancel fields not cleared",
                    f"cancel_date={cancel_date}, cancel_deadline={cancel_deadline}"
                )
        else:
            results.record_fail("D1 record not found", f"VPS {vps_id} not in active list after recycle")
    except Exception as e:
        results.record_fail("D1 record verification", str(e))

    # Verify IP is valid
    print("\n  Verifying returned IP...")
    if ip:
        parts = ip.split(".")
        if len(parts) == 4 and all(p.isdigit() and 0 <= int(p) <= 255 for p in parts):
            results.record_pass("IP address format valid", ip)
        else:
            results.record_fail("IP address format invalid", ip)


# ---------------------------------------------------------------------------
# Empty pool test
# ---------------------------------------------------------------------------

def test_empty_pool(results: TestResults):
    """Verify try_recycle returns None when no recyclable VPS exists."""
    print_header("Empty Pool Test")

    api = ApiClient(config.CF_WORKER_URL, config.WORKER_TOKEN)
    notifier = Notifier(config.OWNER_TELEGRAM_BOT_TOKEN, config.OWNER_TELEGRAM_CHAT_ID)
    lifecycle = VpsLifecycle(api, notifier)

    # Check current pool state
    print("  Checking if recyclable pool is empty...")
    try:
        recyclable = api.get_recyclable_vps()
        if recyclable:
            results.record_skip(
                "Empty pool test",
                f"Pool is NOT empty (has VPS {recyclable.get('vps_id')}). "
                "Cannot test empty-pool behavior without draining pool."
            )
            return
        results.record_pass("Pool confirmed empty", "get_recyclable_vps() returned None")
    except Exception as e:
        results.record_fail("Pool check failed", str(e))
        return

    # Call try_recycle -- should return None without making any Contabo API calls
    print("  Running try_recycle() against empty pool...")
    try:
        ip = lifecycle.try_recycle("TEST_EMPTY_POOL", tier=2)
        if ip is None:
            results.record_pass("try_recycle() returned None", "Correct behavior for empty pool")
        else:
            results.record_fail("try_recycle() returned a value", f"Expected None, got {ip}")
    except Exception as e:
        results.record_fail("try_recycle() raised exception", str(e))


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def parse_args():
    parser = argparse.ArgumentParser(
        description="E2E integration test for VPS lifecycle (cancel + recycle flows).",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s --dry-run                              Check connectivity only
  %(prog)s --vps-id 12345 --job-id E2E_TEST_001 --test cancel
  %(prog)s --vps-id 12345 --job-id E2E_TEST_001 --test recycle
  %(prog)s --vps-id 12345 --job-id E2E_TEST_001 --test full
        """,
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Only check API connectivity, no mutations",
    )
    parser.add_argument(
        "--vps-id",
        help="Contabo VPS instance ID to test against",
    )
    parser.add_argument(
        "--job-id",
        help="Test job ID (used as customer_id in D1 records)",
    )
    parser.add_argument(
        "--test",
        choices=["cancel", "recycle", "full", "empty-pool"],
        default="full",
        help="Which flow to test (default: full = cancel + recycle)",
    )
    return parser.parse_args()


def main():
    args = parse_args()
    results = TestResults()

    print_header("E2E VPS Lifecycle Test")
    print(f"  Date:       {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}")
    print(f"  CF Worker:  {config.CF_WORKER_URL}")
    print(f"  Install dir: {config.OPENCLAW_INSTALL_DIR}")
    if args.dry_run:
        print(f"  Mode:       DRY RUN (read-only)")
    else:
        print(f"  Mode:       LIVE (will make real API calls)")
        print(f"  VPS ID:     {args.vps_id or 'not set'}")
        print(f"  Job ID:     {args.job_id or 'not set'}")
        print(f"  Test:       {args.test}")

    # Always run connectivity checks first
    test_dry_run(results)

    if args.dry_run:
        results.summary()
        sys.exit(0 if results.failed == 0 else 1)

    # Validate required args for live tests
    if args.test in ("cancel", "recycle", "full") and (not args.vps_id or not args.job_id):
        print(f"\n  {Colors.RED}ERROR: --vps-id and --job-id are required for {args.test} test{Colors.RESET}")
        sys.exit(2)

    # Run requested test flows
    if args.test == "cancel":
        test_cancel_flow(args.vps_id, args.job_id, results)

    elif args.test == "recycle":
        test_recycle_flow(args.vps_id, args.job_id, results)

    elif args.test == "full":
        test_cancel_flow(args.vps_id, args.job_id, results)
        if results.failed == 0:
            print(f"\n  {Colors.CYAN}Cancel flow passed. Proceeding to recycle...{Colors.RESET}")
            # Brief pause to let D1 propagate
            print("  Waiting 3 seconds for D1 propagation...")
            time.sleep(3)
            test_recycle_flow(args.vps_id, args.job_id, results)
        else:
            print(f"\n  {Colors.RED}Cancel flow had failures. Skipping recycle.{Colors.RESET}")
            results.record_skip("Recycle flow", "Skipped due to cancel failures")

    elif args.test == "empty-pool":
        test_empty_pool(results)

    # Final summary
    all_passed = results.summary()
    sys.exit(0 if all_passed else 1)


if __name__ == "__main__":
    main()
