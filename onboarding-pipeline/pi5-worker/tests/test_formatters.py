# tests/test_formatters.py
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
from formatters import format_job, format_vps_list, format_usage, format_tier_name, TIER_BUDGETS


class TestFormatJob(unittest.TestCase):
    def test_format_job_basic(self):
        job = {
            "id": "1003", "tier": 2, "job_type": "deploy",
            "bot_username": "test_bot", "email": "test@test.com",
            "status": "ready", "created_at": "2026-04-06T10:00:00Z",
        }
        result = format_job(job)
        self.assertIn("#1003", result)
        self.assertIn("Pro", result)
        self.assertIn("test_bot", result)
        self.assertIn("ready", result)

    def test_format_job_missing_fields(self):
        job = {"id": "1004", "tier": 1, "status": "ready"}
        result = format_job(job)
        self.assertIn("#1004", result)
        self.assertIn("Starter", result)


class TestFormatVpsList(unittest.TestCase):
    def test_format_vps_list_with_instances(self):
        vps_list = [
            {"vps_id": "203187256", "contabo_ip": "161.97.88.8", "status": "cancelling",
             "customer_id": None, "cancel_date": "2026-03-27", "cancel_deadline": "2026-04-27",
             "reinstall_count": 0},
        ]
        result = format_vps_list(vps_list, "Recyclable Pool")
        self.assertIn("203187256", result)
        self.assertIn("161.97.88.8", result)
        self.assertIn("cancelling", result)

    def test_format_vps_list_empty(self):
        result = format_vps_list([], "Recyclable Pool")
        self.assertIn("empty", result.lower())


class TestFormatUsage(unittest.TestCase):
    def test_format_usage_normal(self):
        usage = {
            "customer_id": "1001", "tier": 2,
            "current_spend_hkd": 12.5, "monthly_budget_hkd": 70.0,
            "total_requests": 482, "blocked_at": None, "warned_at": None,
        }
        result = format_usage(usage)
        self.assertIn("1001", result)
        self.assertIn("12.5", result)
        self.assertIn("70", result)
        self.assertIn("17.9%", result)

    def test_format_usage_blocked(self):
        usage = {
            "customer_id": "1002", "tier": 1,
            "current_spend_hkd": 40.0, "monthly_budget_hkd": 40.0,
            "total_requests": 1000,
            "blocked_at": "2026-04-05T12:00:00Z", "warned_at": "2026-04-05T11:00:00Z",
        }
        result = format_usage(usage)
        self.assertIn("BLOCKED", result)


class TestTierHelpers(unittest.TestCase):
    def test_tier_names(self):
        self.assertEqual(format_tier_name(1), "Starter")
        self.assertEqual(format_tier_name(2), "Pro")
        self.assertEqual(format_tier_name(3), "Elite")
        self.assertEqual(format_tier_name(99), "Tier 99")

    def test_tier_budgets(self):
        self.assertEqual(TIER_BUDGETS[1], 40.0)
        self.assertEqual(TIER_BUDGETS[2], 70.0)
        self.assertEqual(TIER_BUDGETS[3], 100.0)


if __name__ == "__main__":
    unittest.main()
