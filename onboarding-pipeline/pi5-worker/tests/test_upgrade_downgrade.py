import os
os.environ.setdefault("CF_WORKER_URL", "http://test")
os.environ.setdefault("WORKER_TOKEN", "test")
os.environ.setdefault("OWNER_TELEGRAM_BOT_TOKEN", "test")
os.environ.setdefault("OWNER_TELEGRAM_CHAT_ID", "0")
os.environ.setdefault("CONTABO_CLIENT_ID", "test")
os.environ.setdefault("CONTABO_CLIENT_SECRET", "test")
os.environ.setdefault("CONTABO_API_USER", "test")
os.environ.setdefault("CONTABO_API_PASSWORD", "test")
os.environ.setdefault("CONFIRM_API_KEY", "test_admin_key")

import unittest
from unittest.mock import MagicMock
from nexgen_cli import handle_upgrade, handle_downgrade, handle_block, handle_unblock, handle_reset_budget


class TestUpgrade(unittest.TestCase):
    def setUp(self):
        self.api = MagicMock()

    def test_upgrade_1_to_2(self):
        self.api.get_usage_single.return_value = {"tier": 1, "customer_id": "1001"}
        self.api.update_usage.return_value = {}
        result = handle_upgrade(self.api, "1001", 2)
        self.assertIn("Upgrade", result)
        self.assertIn("70", result)
        self.api.update_usage.assert_called_once()

    def test_upgrade_same_tier_fails(self):
        self.api.get_usage_single.return_value = {"tier": 2, "customer_id": "1001"}
        result = handle_upgrade(self.api, "1001", 2)
        self.assertIn("Cannot", result)
        self.api.update_usage.assert_not_called()

    def test_upgrade_invalid_tier_fails(self):
        self.api.get_usage_single.return_value = {"tier": 1, "customer_id": "1001"}
        result = handle_upgrade(self.api, "1001", 5)
        self.assertIn("Cannot", result)

    def test_upgrade_customer_not_found(self):
        self.api.get_usage_single.return_value = None
        result = handle_upgrade(self.api, "9999", 2)
        self.assertIn("not found", result)


class TestDowngrade(unittest.TestCase):
    def setUp(self):
        self.api = MagicMock()

    def test_downgrade_3_to_1(self):
        self.api.get_usage_single.return_value = {"tier": 3, "customer_id": "1001"}
        self.api.update_usage.return_value = {}
        result = handle_downgrade(self.api, "1001", 1)
        self.assertIn("Downgrade", result)
        self.assertIn("40", result)
        self.assertIn("plugins stay installed", result)

    def test_downgrade_to_higher_shows_upgrade(self):
        self.api.get_usage_single.return_value = {"tier": 1, "customer_id": "1001"}
        self.api.update_usage.return_value = {}
        result = handle_downgrade(self.api, "1001", 3)
        self.assertIn("Upgrade", result)


class TestBlockUnblock(unittest.TestCase):
    def setUp(self):
        self.api = MagicMock()

    def test_block_sets_budget_zero(self):
        self.api.update_usage.return_value = {}
        result = handle_block(self.api, "1001")
        self.assertIn("BLOCKED", result)
        self.api.update_usage.assert_called_once()
        _, kwargs = self.api.update_usage.call_args
        self.assertEqual(kwargs["monthly_budget_hkd"], 0)

    def test_unblock_restores_budget(self):
        self.api.get_usage_single.return_value = {"tier": 2, "customer_id": "1001"}
        self.api.update_usage.return_value = {}
        self.api.reset_usage.return_value = {}
        result = handle_unblock(self.api, "1001")
        self.assertIn("Unblocked", result)
        self.assertIn("70", result)

    def test_reset_budget(self):
        self.api.reset_usage.return_value = {}
        result = handle_reset_budget(self.api, "1001")
        self.assertIn("Reset", result)


if __name__ == "__main__":
    unittest.main()
