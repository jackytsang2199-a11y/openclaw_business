import unittest
from unittest.mock import patch, MagicMock
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

from restore import RestoreHelper


class TestRestoreTier2(unittest.TestCase):
    def setUp(self):
        self.mock_notifier = MagicMock()
        self.backups_dir = tempfile.mkdtemp()
        self.helper = RestoreHelper(self.mock_notifier, self.backups_dir)
        customer_dir = os.path.join(self.backups_dir, "active", "T1043")
        os.makedirs(customer_dir)
        for fname in ["clawd.tar.gz", "qdrant-snapshot.tar.gz", "mem0.db"]:
            open(os.path.join(customer_dir, fname), "w").close()
        meta = {"tier": 2, "customer_id": "T1043", "status": "success"}
        with open(os.path.join(customer_dir, "backup-meta.json"), "w") as f:
            json.dump(meta, f)

    def tearDown(self):
        shutil.rmtree(self.backups_dir)

    @patch("restore.subprocess.run")
    def test_restore_tier2_full(self, mock_run):
        mock_run.return_value = MagicMock(returncode=0, stdout="")

        result = self.helper.restore(customer_id="T1043", target_ip="203.0.113.50")

        self.assertTrue(result["success"])
        self.assertGreaterEqual(mock_run.call_count, 4)

    @patch("restore.subprocess.run")
    def test_restore_scp_failure(self, mock_run):
        mock_run.return_value = MagicMock(returncode=1, stderr="No route to host")

        result = self.helper.restore(customer_id="T1043", target_ip="203.0.113.50")

        self.assertFalse(result["success"])
        self.assertIn("error", result)


class TestRestoreTier1(unittest.TestCase):
    def setUp(self):
        self.mock_notifier = MagicMock()
        self.backups_dir = tempfile.mkdtemp()
        self.helper = RestoreHelper(self.mock_notifier, self.backups_dir)
        customer_dir = os.path.join(self.backups_dir, "active", "T1044")
        os.makedirs(customer_dir)
        open(os.path.join(customer_dir, "clawd.tar.gz"), "w").close()
        meta = {"tier": 1, "customer_id": "T1044", "status": "success"}
        with open(os.path.join(customer_dir, "backup-meta.json"), "w") as f:
            json.dump(meta, f)

    def tearDown(self):
        shutil.rmtree(self.backups_dir)

    @patch("restore.subprocess.run")
    def test_restore_tier1_clawd_only(self, mock_run):
        mock_run.return_value = MagicMock(returncode=0, stdout="")

        result = self.helper.restore(customer_id="T1044", target_ip="203.0.113.51")

        self.assertTrue(result["success"])
        all_commands = " ".join(str(c) for c in mock_run.call_args_list)
        self.assertNotIn("qdrant", all_commands.lower())
        self.assertNotIn("mem0", all_commands.lower())


class TestRestoreMissingBackup(unittest.TestCase):
    def setUp(self):
        self.mock_notifier = MagicMock()
        self.backups_dir = tempfile.mkdtemp()
        self.helper = RestoreHelper(self.mock_notifier, self.backups_dir)

    def tearDown(self):
        shutil.rmtree(self.backups_dir)

    def test_restore_no_backup_returns_error(self):
        result = self.helper.restore(customer_id="T9999", target_ip="1.1.1.1")

        self.assertFalse(result["success"])
        self.assertIn("no backup found", result["error"].lower())


if __name__ == "__main__":
    unittest.main()
