"""Send Telegram notifications to the owner."""

import requests
from typing import Optional


class Notifier:
    def __init__(self, bot_token: str, chat_id: str):
        self.bot_token = bot_token
        self.chat_id = chat_id
        self.base_url = f"https://api.telegram.org/bot{bot_token}"

    def send(self, message: str) -> bool:
        """Send a message to the owner. Returns True on success."""
        try:
            resp = requests.post(
                f"{self.base_url}/sendMessage",
                json={"chat_id": self.chat_id, "text": message, "parse_mode": "HTML"},
                timeout=10,
            )
            return resp.ok
        except requests.RequestException:
            return False

    def notify_new_job(self, job: dict) -> None:
        tier_names = {1: "Tier 1", 2: "Tier 2", 3: "Tier 3"}
        tier = tier_names.get(job["tier"], f"Tier {job['tier']}")
        self.send(f"New order {job['id']} — {tier} — deploying")

    def notify_gate_pass(self, job_id: str, phase: int) -> None:
        self.send(f"{job_id} Phase {phase} gate passed")

    def notify_gate_fail(self, job_id: str, phase: int) -> None:
        self.send(f"{job_id} Phase {phase} gate failed — agent debugging...")

    def notify_complete(self, job_id: str, checks: str = "28/28") -> None:
        self.send(f"{job_id} deploy complete — {checks} QA passed")

    def notify_failed(self, job_id: str, error: str) -> None:
        self.send(f"{job_id} failed — {error} — manual intervention needed")

    def notify_pool_low(self, count: int, next_number: int = 0) -> None:
        msg = f"Bot pool low — {count} bots remaining."
        if next_number:
            msg += f"\nRun: python3 replenish_bots.py --start {next_number} --count 20"
        else:
            msg += "\nReplenish soon."
        self.send(msg)

    @staticmethod
    def set_bot_display_name(bot_token: str, display_name: str) -> bool:
        """Set a bot's display name via Telegram API."""
        try:
            resp = requests.post(
                f"https://api.telegram.org/bot{bot_token}/setMyName",
                json={"name": display_name},
                timeout=10,
            )
            return resp.ok
        except requests.RequestException:
            return False

    @staticmethod
    def send_customer_message(bot_token: str, chat_id: str, message: str) -> bool:
        """Send a message to a customer via their bot."""
        try:
            resp = requests.post(
                f"https://api.telegram.org/bot{bot_token}/sendMessage",
                json={"chat_id": chat_id, "text": message},
                timeout=10,
            )
            return resp.ok
        except requests.RequestException:
            return False

    @staticmethod
    def set_webhook(bot_token: str, url: str) -> bool:
        """Set webhook URL for a customer's bot."""
        try:
            resp = requests.post(
                f"https://api.telegram.org/bot{bot_token}/setWebhook",
                json={"url": url},
                timeout=10,
            )
            return resp.ok
        except requests.RequestException:
            return False
