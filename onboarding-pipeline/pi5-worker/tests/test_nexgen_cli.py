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


if __name__ == "__main__":
    unittest.main()
