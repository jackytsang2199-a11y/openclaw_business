# tests/test_deploy_bugs.py — TDD tests for 4 deployment bugs found during E2E 2026-04-11
import os
os.environ.setdefault("CF_WORKER_URL", "http://test")
os.environ.setdefault("WORKER_TOKEN", "test")
os.environ.setdefault("OWNER_TELEGRAM_BOT_TOKEN", "test")
os.environ.setdefault("OWNER_TELEGRAM_CHAT_ID", "0")
os.environ.setdefault("CONTABO_CLIENT_ID", "test")
os.environ.setdefault("CONTABO_CLIENT_SECRET", "test")
os.environ.setdefault("CONTABO_API_USER", "test")
os.environ.setdefault("CONTABO_API_PASSWORD", "test")

import re
import unittest
from unittest.mock import MagicMock, patch


# --- Bug 1: reinstall MAX_ATTEMPTS too short ---

class TestReinstallTimeout(unittest.TestCase):
    """Bug 1: contabo-reinstall.sh has MAX_ATTEMPTS=20 (10 min).
    Contabo reinstalls can take up to 15 min. Should be >= 30."""

    def test_max_attempts_is_at_least_30(self):
        script_path = os.path.join(
            os.path.dirname(__file__), "..", "..", "..", "openclaw_install",
            "provision", "contabo-reinstall.sh"
        )
        with open(script_path) as f:
            content = f.read()
        match = re.search(r"MAX_ATTEMPTS=(\d+)", content)
        self.assertIsNotNone(match, "MAX_ATTEMPTS not found in contabo-reinstall.sh")
        max_attempts = int(match.group(1))
        self.assertGreaterEqual(
            max_attempts, 30,
            f"MAX_ATTEMPTS={max_attempts} gives {max_attempts * 30}s timeout. "
            f"Need >= 30 (15 min) for Contabo reinstall."
        )


# --- Bug 2: --vps override must be honored by deployer ---

class TestVpsOverride(unittest.TestCase):
    """Bug 2: CLI sets job['_override_vps_id'] but deployer._provision_vps
    ignores it. When --vps is set, deployer should pass the specific VPS ID
    to try_recycle so it recycles THAT VPS, not the oldest from the pool."""

    def setUp(self):
        self.mock_api = MagicMock()
        self.mock_notifier = MagicMock()

    @patch("vps_lifecycle.subprocess.run")
    def test_provision_uses_override_vps_id(self, mock_run):
        """_provision_vps should pass override vps_id to try_recycle."""
        from deployer import Deployer
        deployer = Deployer(self.mock_api, self.mock_notifier)

        # Patch try_recycle at the lifecycle level
        with patch("vps_lifecycle.VpsLifecycle.try_recycle") as mock_recycle:
            mock_recycle.return_value = "161.97.88.8"

            job = {
                "id": "1002", "tier": 2,
                "_override_vps_id": "203187256",
                "_override_vps_ip": "161.97.88.8",
            }
            result = deployer._provision_vps("1002", 2, job=job)

        mock_recycle.assert_called_once()
        args, kwargs = mock_recycle.call_args
        # try_recycle should receive vps_id="203187256" as kwarg or 3rd positional
        all_args = list(args) + list(kwargs.values())
        self.assertIn("203187256", all_args,
                      "override vps_id '203187256' not passed to try_recycle")

    @patch("vps_lifecycle.subprocess.run")
    def test_provision_aborts_when_override_recycle_fails(self, mock_run):
        """When --vps is set and try_recycle fails, should abort (return None),
        NOT fall through to contabo-create.sh."""
        from deployer import Deployer
        deployer = Deployer(self.mock_api, self.mock_notifier)

        with patch("vps_lifecycle.VpsLifecycle.try_recycle") as mock_recycle:
            mock_recycle.return_value = None  # recycle failed

            job = {
                "id": "1002", "tier": 2,
                "_override_vps_id": "203187256",
                "_override_vps_ip": "161.97.88.8",
            }
            result = deployer._provision_vps("1002", 2, job=job)

        self.assertIsNone(result)
        # contabo-create.sh should never be called
        for c in mock_run.call_args_list:
            self.assertNotIn("contabo-create", str(c),
                             "contabo-create.sh should NOT run when --vps override is set")


# --- Bug 3: Python stdout buffering hides deploy logs ---

class TestUnbufferedOutput(unittest.TestCase):
    """Bug 3: When CLI is piped to tee, Python block-buffers stdout.
    All print() calls in deployer and vps_lifecycle must use flush=True."""

    def _find_unflushed_prints(self, cls):
        """Find print() calls missing flush=True in source code.
        Handles multi-line print() by joining continuation lines."""
        import inspect
        source = inspect.getsource(cls)
        lines = source.splitlines()
        unflushed = []
        i = 0
        while i < len(lines):
            stripped = lines[i].strip()
            if stripped.startswith("print("):
                # Collect the full print statement (may span multiple lines)
                full = stripped
                while full.count("(") > full.count(")") and i + 1 < len(lines):
                    i += 1
                    full += " " + lines[i].strip()
                if "flush=True" not in full:
                    unflushed.append(full[:120])
            i += 1
        return unflushed

    def test_deployer_prints_are_flushed(self):
        from deployer import Deployer
        unflushed = self._find_unflushed_prints(Deployer)
        self.assertEqual(unflushed, [],
                         f"print() without flush=True in deployer.py:\n" +
                         "\n".join(unflushed))

    def test_lifecycle_prints_are_flushed(self):
        from vps_lifecycle import VpsLifecycle
        unflushed = self._find_unflushed_prints(VpsLifecycle)
        self.assertEqual(unflushed, [],
                         f"print() without flush=True in vps_lifecycle.py:\n" +
                         "\n".join(unflushed))


# --- Bug 4: Deploy falls through to fresh provision on recycle failure ---

class TestNoFreshProvisionFallthrough(unittest.TestCase):
    """Bug 4: When try_recycle() fails and --vps was specified, deployer
    falls through to contabo-create.sh creating unexpected billing."""

    @patch("deployer.subprocess.run")
    @patch("vps_lifecycle.VpsLifecycle.try_recycle")
    def test_fallthrough_allowed_without_override(self, mock_recycle, mock_run):
        """Without --vps, fallthrough to contabo-create.sh IS allowed."""
        from deployer import Deployer
        mock_api = MagicMock()
        mock_notifier = MagicMock()
        deployer = Deployer(mock_api, mock_notifier)

        mock_recycle.return_value = None

        # contabo-create.sh fails (doesn't matter — we just check it was called)
        mock_run.return_value = MagicMock(returncode=1, stderr="test")

        # No override — should attempt fresh provision (and fail, that's fine)
        result = deployer._provision_vps("1002", 2)

        create_calls = [c for c in mock_run.call_args_list
                        if "contabo-create" in str(c)]
        self.assertTrue(len(create_calls) > 0,
                        "contabo-create.sh should be called when no --vps override")


if __name__ == "__main__":
    unittest.main()
