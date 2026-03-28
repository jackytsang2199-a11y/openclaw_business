import unittest
from unittest.mock import patch, MagicMock, call
import os
import json
import tempfile
import shutil

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

from backup import BackupOrchestrator


class TestBackupSingleVps(unittest.TestCase):
    def setUp(self):
        self.mock_api = MagicMock()
        self.mock_notifier = MagicMock()
        self.backups_dir = tempfile.mkdtemp()
        self.orchestrator = BackupOrchestrator(
            self.mock_api, self.mock_notifier, self.backups_dir
        )

    def tearDown(self):
        shutil.rmtree(self.backups_dir)

    @patch("backup.subprocess.run")
    def test_backup_tier2_all_steps(self, mock_run):
        mock_run.return_value = MagicMock(
            returncode=0,
            stdout='{"result":{"name":"mem0-123.snapshot"}}',
        )

        vps = {
            "vps_id": "inst-abc",
            "contabo_ip": "203.0.113.50",
            "customer_id": "T1043",
            "tier": 2,
        }
        result = self.orchestrator.backup_single_vps(vps)

        self.assertTrue(result["success"])
        self.assertEqual(result["customer_id"], "T1043")
        self.assertGreaterEqual(mock_run.call_count, 4)

    @patch("backup.subprocess.run")
    def test_backup_tier1_skips_qdrant_mem0(self, mock_run):
        mock_run.return_value = MagicMock(returncode=0, stdout="")

        vps = {
            "vps_id": "inst-def",
            "contabo_ip": "203.0.113.51",
            "customer_id": "T1044",
            "tier": 1,
        }
        result = self.orchestrator.backup_single_vps(vps)

        self.assertTrue(result["success"])
        all_commands = " ".join(str(c) for c in mock_run.call_args_list)
        self.assertNotIn("sqlite3", all_commands)
        self.assertNotIn("snapshots", all_commands)

    @patch("backup.subprocess.run")
    def test_backup_ssh_failure_returns_error(self, mock_run):
        mock_run.return_value = MagicMock(
            returncode=255, stderr="Connection refused"
        )

        vps = {
            "vps_id": "inst-ghi",
            "contabo_ip": "203.0.113.52",
            "customer_id": "T1045",
            "tier": 2,
        }
        result = self.orchestrator.backup_single_vps(vps)

        self.assertFalse(result["success"])
        self.assertIn("error", result)


class TestBackupMetaJson(unittest.TestCase):
    def setUp(self):
        self.mock_api = MagicMock()
        self.mock_notifier = MagicMock()
        self.backups_dir = tempfile.mkdtemp()
        self.orchestrator = BackupOrchestrator(
            self.mock_api, self.mock_notifier, self.backups_dir
        )

    def tearDown(self):
        shutil.rmtree(self.backups_dir)

    def test_write_meta_creates_valid_json(self):
        customer_dir = os.path.join(self.backups_dir, "active", "T1043")
        os.makedirs(customer_dir, exist_ok=True)

        self.orchestrator.write_meta(
            customer_id="T1043",
            vps_ip="203.0.113.50",
            tier=2,
            size_bytes=1024000,
            status="success",
        )

        meta_path = os.path.join(customer_dir, "backup-meta.json")
        self.assertTrue(os.path.exists(meta_path))
        with open(meta_path) as f:
            meta = json.load(f)
        self.assertEqual(meta["customer_id"], "T1043")
        self.assertEqual(meta["tier"], 2)
        self.assertEqual(meta["status"], "success")
        self.assertIn("timestamp", meta)


class TestBackupRunAll(unittest.TestCase):
    def setUp(self):
        self.mock_api = MagicMock()
        self.mock_notifier = MagicMock()
        self.backups_dir = tempfile.mkdtemp()
        self.orchestrator = BackupOrchestrator(
            self.mock_api, self.mock_notifier, self.backups_dir
        )

    def tearDown(self):
        shutil.rmtree(self.backups_dir)

    @patch.object(BackupOrchestrator, "backup_single_vps")
    def test_run_all_queries_d1_and_processes_each(self, mock_single):
        self.mock_api.get_active_vps_list.return_value = [
            {"vps_id": "inst-1", "contabo_ip": "1.1.1.1", "customer_id": "T1043", "tier": 2},
            {"vps_id": "inst-2", "contabo_ip": "2.2.2.2", "customer_id": "T1044", "tier": 1},
        ]
        mock_single.return_value = {"success": True, "customer_id": "T1043"}

        self.orchestrator.run_all(stagger_seconds=0)

        self.assertEqual(mock_single.call_count, 2)
        self.mock_api.get_active_vps_list.assert_called_once()

    @patch.object(BackupOrchestrator, "backup_single_vps")
    def test_run_all_failure_notifies_and_continues(self, mock_single):
        self.mock_api.get_active_vps_list.return_value = [
            {"vps_id": "inst-1", "contabo_ip": "1.1.1.1", "customer_id": "T1043", "tier": 2},
            {"vps_id": "inst-2", "contabo_ip": "2.2.2.2", "customer_id": "T1044", "tier": 2},
        ]
        mock_single.side_effect = [
            {"success": False, "customer_id": "T1043", "error": "SSH refused"},
            {"success": True, "customer_id": "T1044"},
        ]

        self.orchestrator.run_all(stagger_seconds=0)

        self.assertEqual(mock_single.call_count, 2)
        self.mock_notifier.send.assert_called()

    @patch.object(BackupOrchestrator, "backup_single_vps")
    def test_run_all_size_anomaly_alert(self, mock_single):
        self.mock_api.get_active_vps_list.return_value = [
            {"vps_id": "inst-1", "contabo_ip": "1.1.1.1", "customer_id": "T1043", "tier": 2},
        ]
        mock_single.return_value = {
            "success": True, "customer_id": "T1043", "size_bytes": 0,
        }

        self.orchestrator.run_all(stagger_seconds=0)

        alert_calls = [str(c) for c in self.mock_notifier.send.call_args_list]
        self.assertTrue(any("anomaly" in s.lower() or "0 bytes" in s for s in alert_calls))


if __name__ == "__main__":
    unittest.main()
