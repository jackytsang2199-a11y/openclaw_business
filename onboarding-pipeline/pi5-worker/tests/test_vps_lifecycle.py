import unittest
from unittest.mock import patch, MagicMock, call
import os

os.environ.setdefault("CF_WORKER_URL", "http://test")
os.environ.setdefault("WORKER_TOKEN", "test")
os.environ.setdefault("OWNER_TELEGRAM_BOT_TOKEN", "test")
os.environ.setdefault("OWNER_TELEGRAM_CHAT_ID", "test")
os.environ.setdefault("DEEPSEEK_API_KEY", "test")
os.environ.setdefault("OPENAI_API_KEY", "test")
os.environ.setdefault("BOT_POOL_DIR", "/tmp/test-pool")
os.environ.setdefault("CONTABO_CLIENT_ID", "test")
os.environ.setdefault("CONTABO_CLIENT_SECRET", "test")
os.environ.setdefault("CONTABO_API_USER", "test")
os.environ.setdefault("CONTABO_API_PASSWORD", "test")

from vps_lifecycle import VpsLifecycle


class TestTryRecycle(unittest.TestCase):
    def setUp(self):
        self.mock_api = MagicMock()
        self.mock_notifier = MagicMock()
        self.lifecycle = VpsLifecycle(self.mock_api, self.mock_notifier)

    def test_no_recyclable_vps_returns_none(self):
        self.mock_api.get_recyclable_vps.return_value = None
        result = self.lifecycle.try_recycle("T1050", 2)
        self.assertIsNone(result)
        self.mock_api.get_recyclable_vps.assert_called_once()

    @patch("vps_lifecycle.subprocess.run")
    def test_recycle_success(self, mock_run):
        self.mock_api.get_recyclable_vps.return_value = {
            "vps_id": "inst-abc123",
            "contabo_contract_id": "ctr-xyz789",
            "contabo_ip": "203.0.113.50",
            "reinstall_count": 1,
        }
        mock_run.return_value = MagicMock(returncode=0, stdout="203.0.113.50\n")

        result = self.lifecycle.try_recycle("T1050", 2)

        self.assertEqual(result, "203.0.113.50")
        calls = mock_run.call_args_list
        self.assertEqual(len(calls), 2)
        self.assertIn("contabo-revoke.sh", str(calls[0]))
        self.assertIn("contabo-reinstall.sh", str(calls[1]))
        self.mock_api.update_vps_instance.assert_called_once_with(
            "inst-abc123",
            status="active",
            customer_id="T1050",
            tier=2,
            reinstall_count=2,
            cancel_date=None,
            cancel_deadline=None,
        )

    @patch("vps_lifecycle.subprocess.run")
    def test_recycle_revoke_fails(self, mock_run):
        self.mock_api.get_recyclable_vps.return_value = {
            "vps_id": "inst-abc123",
            "contabo_contract_id": "ctr-xyz789",
            "contabo_ip": "203.0.113.50",
            "reinstall_count": 0,
        }
        mock_run.return_value = MagicMock(returncode=1, stderr="HTTP 404")

        result = self.lifecycle.try_recycle("T1050", 2)

        self.assertIsNone(result)
        self.mock_api.update_vps_instance.assert_not_called()
        self.mock_notifier.send.assert_called()


class TestHandleCancel(unittest.TestCase):
    def setUp(self):
        self.mock_api = MagicMock()
        self.mock_notifier = MagicMock()
        self.lifecycle = VpsLifecycle(self.mock_api, self.mock_notifier)

    @patch("vps_lifecycle.subprocess.run")
    def test_cancel_success(self, mock_run):
        mock_run.side_effect = [
            MagicMock(returncode=0, stdout=""),
            MagicMock(returncode=0, stdout="2026-04-25"),
        ]
        job = {
            "id": "T1043",
            "vps_id": "inst-abc123",
            "contabo_contract_id": "ctr-xyz789",
        }

        self.lifecycle.handle_cancel(job)

        self.mock_api.update_vps_instance.assert_called_once_with(
            "inst-abc123",
            status="cancelling",
            customer_id=None,
            cancel_date=unittest.mock.ANY,
            cancel_deadline="2026-04-25",
        )
        self.mock_api.update_job.assert_called_with("T1043", "complete")
        self.mock_notifier.send.assert_called()

    @patch("vps_lifecycle.subprocess.run")
    def test_cancel_api_failure(self, mock_run):
        mock_run.side_effect = [
            MagicMock(returncode=0, stdout=""),
            MagicMock(returncode=1, stderr="API error"),
        ]
        job = {
            "id": "T1043",
            "vps_id": "inst-abc123",
            "contabo_contract_id": "ctr-xyz789",
        }

        self.lifecycle.handle_cancel(job)

        self.mock_api.update_vps_instance.assert_not_called()
        self.mock_api.update_job.assert_called_with(
            "T1043", "failed", error_log=unittest.mock.ANY
        )


if __name__ == "__main__":
    unittest.main()
