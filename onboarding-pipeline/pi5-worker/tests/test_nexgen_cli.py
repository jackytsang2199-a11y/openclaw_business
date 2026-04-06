# tests/test_nexgen_cli.py
import os
os.environ.setdefault("CF_WORKER_URL", "http://test")
os.environ.setdefault("WORKER_TOKEN", "test")
os.environ.setdefault("OWNER_TELEGRAM_BOT_TOKEN", "test")
os.environ.setdefault("OWNER_TELEGRAM_CHAT_ID", "0")
os.environ.setdefault("CONTABO_CLIENT_ID", "test")
os.environ.setdefault("CONTABO_CLIENT_SECRET", "test")
os.environ.setdefault("CONTABO_API_USER", "test")
os.environ.setdefault("CONTABO_API_PASSWORD", "test")

import unittest
import time
from unittest.mock import MagicMock, patch


class TestNotificationDedup(unittest.TestCase):
    """Test the notification deduplication logic from worker.py."""

    def test_first_notification_sends(self):
        from worker import _should_notify
        notified = {}
        result = _should_notify("1003", notified, time.time)
        self.assertEqual(result, "new")
        self.assertIn("1003", notified)

    def test_second_notification_suppressed(self):
        from worker import _should_notify
        notified = {"1003": time.time()}
        result = _should_notify("1003", notified, time.time)
        self.assertEqual(result, "skip")

    def test_reminder_after_2_hours(self):
        from worker import _should_notify
        two_hours_ago = time.time() - 7201
        notified = {"1003": two_hours_ago}
        result = _should_notify("1003", notified, time.time)
        self.assertEqual(result, "reminder")


class TestCLIDispatch(unittest.TestCase):
    def test_jobs_empty(self):
        from nexgen_cli import handle_jobs
        mock_api = MagicMock()
        mock_api.get_pending_jobs.return_value = []
        result = handle_jobs(mock_api)
        self.assertIn("pending", result.lower())

    def test_pool_empty(self):
        from nexgen_cli import handle_pool
        mock_api = MagicMock()
        mock_api.get_recyclable_vps.return_value = None
        mock_api.get_vps_by_status.return_value = []
        result = handle_pool(mock_api)
        self.assertIn("empty", result.lower())


class TestUpgradeDowngrade(unittest.TestCase):
    def test_validate_upgrade(self):
        from nexgen_cli import validate_tier_change
        ok, msg = validate_tier_change(current_tier=1, new_tier=2)
        self.assertTrue(ok)
        self.assertIn("40", msg)
        self.assertIn("70", msg)

    def test_validate_downgrade(self):
        from nexgen_cli import validate_tier_change
        ok, msg = validate_tier_change(current_tier=3, new_tier=1)
        self.assertTrue(ok)
        self.assertIn("100", msg)
        self.assertIn("40", msg)

    def test_validate_same_tier(self):
        from nexgen_cli import validate_tier_change
        ok, msg = validate_tier_change(current_tier=2, new_tier=2)
        self.assertFalse(ok)

    def test_validate_invalid_tier(self):
        from nexgen_cli import validate_tier_change
        ok, msg = validate_tier_change(current_tier=1, new_tier=5)
        self.assertFalse(ok)


class TestCancelCommand(unittest.TestCase):
    """Test cancel CLI command — finds VPS, calls lifecycle, revokes token."""

    def setUp(self):
        self.api = MagicMock()
        self.notifier = MagicMock()

    def test_cancel_finds_vps_and_calls_lifecycle(self):
        from nexgen_cli import handle_cancel
        # Customer has an active VPS
        self.api.get_vps_by_status.return_value = [
            {"vps_id": "203187256", "contabo_ip": "161.97.88.8",
             "customer_id": "1001", "status": "active",
             "contabo_contract_id": "contract_123"},
        ]
        self.api.revoke_usage.return_value = {}
        # Mock the lifecycle so it doesn't actually call Contabo
        with patch("nexgen_cli.VpsLifecycle") as mock_lifecycle_cls:
            mock_lifecycle = MagicMock()
            mock_lifecycle_cls.return_value = mock_lifecycle
            result = handle_cancel(self.api, self.notifier, "1001")
        self.assertIn("1001", result)
        self.assertIn("cancelled", result.lower())
        mock_lifecycle.handle_cancel.assert_called_once()
        # Verify gateway token was revoked
        self.api.revoke_usage.assert_called_once()

    def test_cancel_customer_no_vps(self):
        from nexgen_cli import handle_cancel
        self.api.get_vps_by_status.return_value = []
        result = handle_cancel(self.api, self.notifier, "9999")
        self.assertIn("No active VPS", result)

    def test_cancel_revokes_gateway_token(self):
        from nexgen_cli import handle_cancel
        self.api.get_vps_by_status.return_value = [
            {"vps_id": "203187256", "contabo_ip": "161.97.88.8",
             "customer_id": "1001", "status": "active",
             "contabo_contract_id": "contract_123"},
        ]
        self.api.revoke_usage.return_value = {}
        with patch("nexgen_cli.VpsLifecycle") as mock_lifecycle_cls:
            mock_lifecycle = MagicMock()
            mock_lifecycle_cls.return_value = mock_lifecycle
            handle_cancel(self.api, self.notifier, "1001")
        self.api.revoke_usage.assert_called_once_with("1001", unittest.mock.ANY)

    def test_cancel_multiple_vps_uses_first_active(self):
        from nexgen_cli import handle_cancel
        self.api.get_vps_by_status.return_value = [
            {"vps_id": "VPS_A", "contabo_ip": "1.1.1.1",
             "customer_id": "1001", "status": "active",
             "contabo_contract_id": "contract_A"},
            {"vps_id": "VPS_B", "contabo_ip": "2.2.2.2",
             "customer_id": "1001", "status": "active",
             "contabo_contract_id": "contract_B"},
        ]
        self.api.revoke_usage.return_value = {}
        with patch("nexgen_cli.VpsLifecycle") as mock_lifecycle_cls:
            mock_lifecycle = MagicMock()
            mock_lifecycle_cls.return_value = mock_lifecycle
            handle_cancel(self.api, self.notifier, "1001")
        # Should use first match
        call_args = mock_lifecycle.handle_cancel.call_args[0][0]
        self.assertEqual(call_args["vps_id"], "VPS_A")


if __name__ == "__main__":
    unittest.main()
