import unittest
from unittest.mock import patch, MagicMock
import os

os.environ.setdefault("CF_WORKER_URL", "http://test")
os.environ.setdefault("WORKER_TOKEN", "test")
os.environ.setdefault("OWNER_TELEGRAM_BOT_TOKEN", "test")
os.environ.setdefault("OWNER_TELEGRAM_CHAT_ID", "test")
os.environ.setdefault("DEEPSEEK_API_KEY", "test")
os.environ.setdefault("OPENAI_API_KEY", "test")
os.environ.setdefault("CONTABO_CLIENT_ID", "test")
os.environ.setdefault("CONTABO_CLIENT_SECRET", "test")
os.environ.setdefault("CONTABO_API_USER", "test")
os.environ.setdefault("CONTABO_API_PASSWORD", "test")

from notifier import Notifier


class TestSetBotDisplayName(unittest.TestCase):
    @patch("notifier.requests.post")
    def test_rename_success(self, mock_post):
        """Display name is set via Telegram setMyName API."""
        mock_post.return_value = MagicMock(ok=True)
        result = Notifier.set_bot_display_name("fake_token", "客戶自選名稱")
        self.assertTrue(result)
        mock_post.assert_called_once_with(
            "https://api.telegram.org/botfake_token/setMyName",
            json={"name": "客戶自選名稱"},
            timeout=10,
        )

    @patch("notifier.requests.post")
    def test_rename_api_error(self, mock_post):
        """Rename returns False on API error (non-blocking)."""
        mock_post.return_value = MagicMock(ok=False)
        result = Notifier.set_bot_display_name("fake_token", "Test Name")
        self.assertFalse(result)

    @patch("notifier.requests.post")
    def test_rename_network_error(self, mock_post):
        """Rename returns False on network timeout (non-blocking)."""
        import requests
        mock_post.side_effect = requests.RequestException("timeout")
        result = Notifier.set_bot_display_name("fake_token", "Test Name")
        self.assertFalse(result)

    @patch("notifier.requests.post")
    def test_send_customer_message(self, mock_post):
        """Customer receives waiting message via their assigned bot."""
        mock_post.return_value = MagicMock(ok=True)
        result = Notifier.send_customer_message("fake_token", "12345", "Please wait...")
        self.assertTrue(result)
        mock_post.assert_called_once_with(
            "https://api.telegram.org/botfake_token/sendMessage",
            json={"chat_id": "12345", "text": "Please wait..."},
            timeout=10,
        )

    @patch("notifier.requests.post")
    def test_set_webhook(self, mock_post):
        """Webhook URL is set for customer bot."""
        mock_post.return_value = MagicMock(ok=True)
        result = Notifier.set_webhook("fake_token", "https://vps.example.com/webhook")
        self.assertTrue(result)


class TestNotifierOwnerMessages(unittest.TestCase):
    @patch("notifier.requests.post")
    def test_notify_new_job(self, mock_post):
        mock_post.return_value = MagicMock(ok=True)
        n = Notifier("owner_token", "owner_chat")
        n.notify_new_job({"id": "T1043", "tier": 2})
        mock_post.assert_called_once()
        call_args = mock_post.call_args
        self.assertIn("T1043", call_args[1]["json"]["text"])
        self.assertIn("Tier 2", call_args[1]["json"]["text"])


if __name__ == "__main__":
    unittest.main()
