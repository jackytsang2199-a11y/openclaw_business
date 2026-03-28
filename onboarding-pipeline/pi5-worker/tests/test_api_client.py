import unittest
from unittest.mock import patch, MagicMock
import os

os.environ.setdefault("CF_WORKER_URL", "https://api.3nexgen.com")
os.environ.setdefault("WORKER_TOKEN", "test-token")
os.environ.setdefault("OWNER_TELEGRAM_BOT_TOKEN", "test")
os.environ.setdefault("OWNER_TELEGRAM_CHAT_ID", "test")
os.environ.setdefault("DEEPSEEK_API_KEY", "test")
os.environ.setdefault("OPENAI_API_KEY", "test")
os.environ.setdefault("BOT_POOL_DIR", "/tmp/test-pool")
os.environ.setdefault("CONTABO_CLIENT_ID", "test")
os.environ.setdefault("CONTABO_CLIENT_SECRET", "test")
os.environ.setdefault("CONTABO_API_USER", "test")
os.environ.setdefault("CONTABO_API_PASSWORD", "test")

from api_client import ApiClient


class TestApiClient(unittest.TestCase):
    def setUp(self):
        self.client = ApiClient("https://api.3nexgen.com", "test-token")

    @patch("api_client.requests.get")
    def test_get_next_job_returns_job(self, mock_get):
        mock_get.return_value = MagicMock(
            status_code=200,
            json=lambda: {"job": {"id": "T1043", "status": "provisioning", "tier": 2}},
        )
        job = self.client.get_next_job()
        self.assertEqual(job["id"], "T1043")
        mock_get.assert_called_once_with(
            "https://api.3nexgen.com/api/jobs/next",
            headers={"X-Worker-Token": "test-token"},
            timeout=10,
        )

    @patch("api_client.requests.get")
    def test_get_next_job_returns_none(self, mock_get):
        mock_get.return_value = MagicMock(
            status_code=200,
            json=lambda: {"job": None},
        )
        job = self.client.get_next_job()
        self.assertIsNone(job)

    @patch("api_client.requests.patch")
    def test_update_job(self, mock_patch):
        mock_patch.return_value = MagicMock(
            status_code=200,
            json=lambda: {"job": {"id": "T1043", "status": "installing"}},
        )
        result = self.client.update_job("T1043", "installing", server_ip="1.2.3.4")
        self.assertEqual(result["status"], "installing")

    @patch("api_client.requests.post")
    def test_send_health_ping(self, mock_post):
        mock_post.return_value = MagicMock(status_code=200)
        self.client.send_health_ping()
        mock_post.assert_called_once()


if __name__ == "__main__":
    unittest.main()
