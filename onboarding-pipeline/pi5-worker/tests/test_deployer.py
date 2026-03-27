import unittest
from unittest.mock import patch, MagicMock
import os

os.environ.setdefault("CF_WORKER_URL", "http://test")
os.environ.setdefault("WORKER_TOKEN", "test")
os.environ.setdefault("OWNER_TELEGRAM_BOT_TOKEN", "test")
os.environ.setdefault("OWNER_TELEGRAM_CHAT_ID", "test")
os.environ.setdefault("DEEPSEEK_API_KEY", "test-dk")
os.environ.setdefault("OPENAI_API_KEY", "test-ok")
os.environ.setdefault("CONTABO_CLIENT_ID", "test")
os.environ.setdefault("CONTABO_CLIENT_SECRET", "test")
os.environ.setdefault("CONTABO_API_USER", "test")
os.environ.setdefault("CONTABO_API_PASSWORD", "test")

from deployer import Deployer
from playbook import build_deployment_prompt, TIER_SCRIPTS


class TestDeployer(unittest.TestCase):
    def test_get_tier_scripts(self):
        scripts = TIER_SCRIPTS[1]
        self.assertIn("00-swap-setup.sh", scripts)
        self.assertNotIn("05-setup-qdrant.sh", scripts)

        scripts2 = TIER_SCRIPTS[2]
        self.assertIn("05-setup-qdrant.sh", scripts2)
        self.assertNotIn("11-setup-chromium.sh", scripts2)

        scripts3 = TIER_SCRIPTS[3]
        self.assertIn("11-setup-chromium.sh", scripts3)

    def test_build_deployment_prompt(self):
        """Verify the playbook prompt includes all critical sections."""
        prompt = build_deployment_prompt(
            job_id="1001",
            tier=2,
            server_ip="203.0.113.50",
            ssh_key_path="/home/pi/.ssh/nexgen_automation",
            install_dir="/home/pi/openclaw_install",
            client_env_content="CLIENT_ID=1001\nTIER=2\nDEEPSEEK_API_KEY=sk-test",
        )
        self.assertIn("203.0.113.50", prompt)
        self.assertIn("nexgen_automation", prompt)
        self.assertIn("05-setup-qdrant.sh", prompt)
        self.assertIn("06-setup-mem0.sh", prompt)
        self.assertNotIn("11-setup-chromium.sh", prompt)
        self.assertIn("GATE CHECK", prompt)
        self.assertIn("01-health-check.sh", prompt)
        self.assertIn("Troubleshooting", prompt)

    def test_build_prompt_tier1_excludes_qdrant(self):
        prompt = build_deployment_prompt(
            job_id="1002",
            tier=1,
            server_ip="10.0.0.1",
            ssh_key_path="/key",
            install_dir="/install",
            client_env_content="CLIENT_ID=1002",
        )
        self.assertNotIn("05-setup-qdrant.sh", prompt)
        self.assertNotIn("06-setup-mem0.sh", prompt)
        self.assertIn("04-install-openclaw.sh", prompt)


class TestGetBotFromJob(unittest.TestCase):
    """Test that _get_bot_from_job reads token from job data."""

    def setUp(self):
        self.mock_api = MagicMock()
        self.mock_notifier = MagicMock()
        self.deployer = Deployer(self.mock_api, self.mock_notifier)

    def test_returns_bot_from_job(self):
        """Bot token and username are read from job data."""
        job = {
            "id": "1001",
            "bot_token": "12345:FAKE",
            "bot_username": "test_helper_bot",
            "tier": 2,
        }
        bot = self.deployer._get_bot_from_job(job)
        self.assertIsNotNone(bot)
        self.assertEqual(bot["token"], "12345:FAKE")
        self.assertEqual(bot["username"], "test_helper_bot")

    def test_returns_none_when_no_token(self):
        """Returns None when job has no bot_token."""
        job = {"id": "1001", "tier": 2}
        bot = self.deployer._get_bot_from_job(job)
        self.assertIsNone(bot)

    def test_failure_does_not_touch_pool(self):
        """On failure, no bot pool operations happen — bot stays with customer."""
        bot = {"token": "12345:FAKE", "username": "test_bot"}
        self.deployer._handle_failure("1001", bot, "999", "test error")
        self.mock_api.update_job.assert_called_with("1001", "failed", error_log="test error")
        # No pool.return_bot call — BotPool doesn't exist


if __name__ == "__main__":
    unittest.main()
