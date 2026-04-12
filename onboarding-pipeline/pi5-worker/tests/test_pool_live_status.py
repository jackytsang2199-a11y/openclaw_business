# tests/test_pool_live_status.py — TDD: pool command must show Contabo live state
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
from unittest.mock import MagicMock, patch


class TestContaboClient(unittest.TestCase):
    """A Contabo API client must exist and be callable from the CLI."""

    def test_contabo_client_exists(self):
        """contabo_client module should exist and have get_instances()."""
        from contabo_client import ContaboClient
        self.assertTrue(callable(getattr(ContaboClient, "get_instances", None)))

    def test_get_instances_returns_list_of_dicts(self):
        """get_instances() should return list of dicts with instanceId, status, cancelDate, ip."""
        from contabo_client import ContaboClient
        client = ContaboClient.__new__(ContaboClient)
        # Mock the HTTP call
        with patch("contabo_client.requests.post") as mock_post, \
             patch("contabo_client.requests.get") as mock_get:
            # Mock OAuth token response
            mock_post.return_value = MagicMock(
                status_code=200,
                json=lambda: {"access_token": "fake_token"}
            )
            # Mock instances list
            mock_get.return_value = MagicMock(
                status_code=200,
                json=lambda: {"data": [
                    {
                        "instanceId": 203187256,
                        "status": "running",
                        "cancelDate": None,
                        "ipConfig": {"v4": {"ip": "161.97.88.8"}},
                    },
                    {
                        "instanceId": 203187278,
                        "status": "running",
                        "cancelDate": "2026-04-27",
                        "ipConfig": {"v4": {"ip": "161.97.82.155"}},
                    },
                ]}
            )
            client.__init__()
            instances = client.get_instances()

        self.assertEqual(len(instances), 2)
        self.assertEqual(instances[0]["instanceId"], 203187256)
        self.assertIsNone(instances[0]["cancelDate"])
        self.assertEqual(instances[0]["ip"], "161.97.88.8")
        self.assertEqual(instances[0]["status"], "running")
        self.assertEqual(instances[1]["cancelDate"], "2026-04-27")


class TestPoolShowsLiveState(unittest.TestCase):
    """handle_pool must merge D1 data with Contabo live state."""

    def test_pool_output_includes_contabo_status(self):
        """Pool output should show Contabo live status for each VPS."""
        from nexgen_cli import handle_pool
        mock_api = MagicMock()
        mock_api.get_recyclable_vps.return_value = {
            "vps_id": "203187256", "contabo_ip": "161.97.88.8",
            "status": "cancelling", "cancel_deadline": "2026-04-27",
            "reinstall_count": 1,
        }
        mock_api.get_vps_by_status.return_value = [
            {"vps_id": "203187256", "contabo_ip": "161.97.88.8",
             "status": "cancelling", "cancel_deadline": "2026-04-27",
             "reinstall_count": 1},
            {"vps_id": "203187278", "contabo_ip": "161.97.82.155",
             "status": "cancelling", "cancel_deadline": "2026-04-27",
             "reinstall_count": 0},
        ]

        # Mock Contabo client
        with patch("contabo_client.ContaboClient") as mock_contabo_cls:
            mock_contabo = MagicMock()
            mock_contabo.get_instances.return_value = [
                {"instanceId": 203187256, "status": "running",
                 "cancelDate": None, "ip": "161.97.88.8"},
                {"instanceId": 203187278, "status": "running",
                 "cancelDate": "2026-04-27", "ip": "161.97.82.155"},
            ]
            mock_contabo_cls.return_value = mock_contabo

            result = handle_pool(mock_api)

        # Must show Contabo live state
        self.assertIn("running", result)
        self.assertIn("revoked", result.lower())
        # Must distinguish the two VPS
        self.assertIn("203187256", result)
        self.assertIn("203187278", result)

    def test_pool_shows_revoked_vs_not_revoked(self):
        """Pool must clearly distinguish revoked (cancelDate=None) from
        still-cancelled (cancelDate=2026-04-27) VPS."""
        from nexgen_cli import handle_pool
        mock_api = MagicMock()
        mock_api.get_recyclable_vps.return_value = None
        mock_api.get_vps_by_status.return_value = [
            {"vps_id": "203187256", "contabo_ip": "161.97.88.8",
             "status": "cancelling"},
            {"vps_id": "203187278", "contabo_ip": "161.97.82.155",
             "status": "cancelling"},
        ]

        with patch("contabo_client.ContaboClient") as mock_contabo_cls:
            mock_contabo = MagicMock()
            mock_contabo.get_instances.return_value = [
                {"instanceId": 203187256, "status": "running",
                 "cancelDate": None, "ip": "161.97.88.8"},
                {"instanceId": 203187278, "status": "running",
                 "cancelDate": "2026-04-27", "ip": "161.97.82.155"},
            ]
            mock_contabo_cls.return_value = mock_contabo

            result = handle_pool(mock_api)

        # 203187256 should show as revoked/ready
        self.assertRegex(result, r"203187256.*revoked|203187256.*ready|203187256.*✅")
        # 203187278 should show as still cancelled
        self.assertRegex(result, r"203187278.*cancel|203187278.*⚠|203187278.*not.revoked")

    def test_pool_handles_contabo_failure_gracefully(self):
        """If Contabo API is unreachable, pool still works with D1 data only."""
        from nexgen_cli import handle_pool
        mock_api = MagicMock()
        mock_api.get_recyclable_vps.return_value = None
        mock_api.get_vps_by_status.return_value = [
            {"vps_id": "203187256", "contabo_ip": "161.97.88.8",
             "status": "cancelling"},
        ]

        with patch("contabo_client.ContaboClient") as mock_contabo_cls:
            mock_contabo = MagicMock()
            mock_contabo.get_instances.side_effect = Exception("Network error")
            mock_contabo_cls.return_value = mock_contabo

            result = handle_pool(mock_api)

        # Should still work — D1 data shown, Contabo column shows error/unknown
        self.assertIn("203187256", result)
        # Should not crash
        self.assertNotIn("Traceback", result)


if __name__ == "__main__":
    unittest.main()
