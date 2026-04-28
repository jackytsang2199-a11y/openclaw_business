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
        # Try repo-relative path first, then Pi5 home directory layout
        script_path = os.path.join(
            os.path.dirname(__file__), "..", "..", "..", "openclaw_install",
            "provision", "contabo-reinstall.sh"
        )
        if not os.path.exists(script_path):
            script_path = os.path.expanduser(
                "~/openclaw_install/provision/contabo-reinstall.sh"
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


# --- Bug 5: Playbook must bootstrap deploy user before scripts ---

class TestDeployUserBootstrap(unittest.TestCase):
    """Bug 5: Contabo reinstall does NOT create the 'deploy' user via cloud-init.
    The playbook must include a Step 0 that SSHs as root to create the user
    before any install scripts run (which assume deploy@ exists)."""

    def test_prompt_includes_deploy_user_creation(self):
        """Deployment prompt must have a step that creates deploy user via root SSH."""
        from playbook import build_deployment_prompt
        prompt = build_deployment_prompt(
            job_id="1002", tier=2, server_ip="161.97.88.8",
            ssh_key_path="/home/pi/.ssh/nexgen_automation",
            install_dir="/home/pi/openclaw_install",
            client_env_content="CLIENT_ID=1002\nTIER=2",
        )
        # Must SSH as root (not deploy) to create the user
        self.assertIn("root@161.97.88.8", prompt)
        # Must create the deploy user
        self.assertIn("useradd", prompt)
        # Must set up SSH key for deploy
        self.assertIn("authorized_keys", prompt)
        # Must set up passwordless sudo
        self.assertIn("NOPASSWD", prompt)

    def test_step0_comes_before_step1(self):
        """User bootstrap must appear BEFORE script upload (which uses deploy@)."""
        from playbook import build_deployment_prompt
        prompt = build_deployment_prompt(
            job_id="1002", tier=2, server_ip="161.97.88.8",
            ssh_key_path="/key",
            install_dir="/install",
            client_env_content="CLIENT_ID=1002",
        )
        # Find positions — both must exist
        bootstrap_pos = prompt.find("useradd")
        upload_pos = prompt.find("mkdir -p ~/scripts")
        self.assertNotEqual(bootstrap_pos, -1, "useradd not found in prompt")
        self.assertNotEqual(upload_pos, -1, "mkdir -p ~/scripts not found in prompt")
        self.assertGreater(upload_pos, bootstrap_pos,
                           "deploy user bootstrap must appear before script upload")


# --- Bug 14: Gateway token registration must include correct budget per tier ---

class TestGatewayBudgetRegistration(unittest.TestCase):
    """Bug 14: deployer._register_gateway_token must pass the correct
    monthly_budget_hkd for each tier to api.register_gateway_token."""

    def test_tier_budgets_are_defined(self):
        """TIER_BUDGETS must map all 3 tiers to correct HKD amounts."""
        from deployer import Deployer
        self.assertEqual(Deployer.TIER_BUDGETS, {1: 40.0, 2: 70.0, 3: 100.0})

    def test_register_sends_budget_for_tier2(self):
        """_register_gateway_token for tier 2 must call api with monthly_budget_hkd=70."""
        from deployer import Deployer
        mock_api = MagicMock()
        mock_notifier = MagicMock()
        deployer = Deployer(mock_api, mock_notifier)

        deployer._register_gateway_token("1002", "fake_token_abc", 2)

        mock_api.register_gateway_token.assert_called_once_with(
            customer_id="1002",
            gateway_token="fake_token_abc",
            tier=2,
            monthly_budget_hkd=70.0,
        )

    def test_register_sends_budget_for_all_tiers(self):
        """_register_gateway_token must send correct budget for tiers 1, 2, 3."""
        from deployer import Deployer
        expected = {1: 40.0, 2: 70.0, 3: 100.0}

        for tier, budget in expected.items():
            mock_api = MagicMock()
            mock_notifier = MagicMock()
            deployer = Deployer(mock_api, mock_notifier)

            deployer._register_gateway_token(f"test_{tier}", "token_x", tier)

            _, kwargs = mock_api.register_gateway_token.call_args
            self.assertEqual(kwargs["monthly_budget_hkd"], budget,
                             f"Tier {tier} should send budget {budget}, got {kwargs.get('monthly_budget_hkd')}")


class TestApiClientSendsBudget(unittest.TestCase):
    """api_client.register_gateway_token must include monthly_budget_hkd in JSON payload."""

    @patch("api_client.requests.post")
    def test_payload_includes_budget(self, mock_post):
        """POST /api/usage payload must contain monthly_budget_hkd when provided."""
        from api_client import ApiClient
        mock_post.return_value = MagicMock(
            status_code=201,
            json=lambda: {"usage": {"id": 1, "monthly_budget_hkd": 70}},
        )
        mock_post.return_value.raise_for_status = MagicMock()

        client = ApiClient("http://test", "test-token")
        client.register_gateway_token("1002", "gw_token", 2, monthly_budget_hkd=70.0)

        call_kwargs = mock_post.call_args
        payload = call_kwargs.kwargs.get("json") or call_kwargs[1].get("json")
        self.assertEqual(payload["monthly_budget_hkd"], 70.0)
        self.assertEqual(payload["tier"], 2)
        self.assertEqual(payload["customer_id"], "1002")

    @patch("api_client.requests.post")
    def test_payload_omits_budget_when_none(self, mock_post):
        """POST /api/usage payload must NOT contain monthly_budget_hkd when None."""
        from api_client import ApiClient
        mock_post.return_value = MagicMock(
            status_code=201,
            json=lambda: {"usage": {"id": 1, "monthly_budget_hkd": None}},
        )
        mock_post.return_value.raise_for_status = MagicMock()

        client = ApiClient("http://test", "test-token")
        client.register_gateway_token("1002", "gw_token", 2)

        call_kwargs = mock_post.call_args
        payload = call_kwargs.kwargs.get("json") or call_kwargs[1].get("json")
        self.assertNotIn("monthly_budget_hkd", payload)


if __name__ == "__main__":
    unittest.main()
