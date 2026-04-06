"""Main worker loop: poll CF Worker for jobs, NOTIFY owner, repeat.

Semi-auto mode: the worker detects new jobs and sends Telegram notifications
but does NOT auto-deploy. The owner triggers deployment via nexgen_cli.py
(through Marigold or SSH).
"""

import time
import traceback

import config
from api_client import ApiClient
from notifier import Notifier

REMINDER_INTERVAL = 7200  # 2 hours


def _should_notify(job_id: str, notified: dict, now_fn=time.time) -> str:
    """Decide whether to notify for this job.

    Returns: "new" (first time), "reminder" (2h elapsed), "skip" (already notified).
    """
    now = now_fn()
    if job_id not in notified:
        notified[job_id] = now
        return "new"
    elapsed = now - notified[job_id]
    if elapsed >= REMINDER_INTERVAL:
        notified[job_id] = now  # reset timer after reminder
        return "reminder"
    return "skip"


def _format_age(first_seen: float) -> str:
    """Format elapsed time since first seen."""
    elapsed = time.time() - first_seen
    if elapsed < 3600:
        return f"{int(elapsed / 60)}m"
    return f"{elapsed / 3600:.1f}h"


def main():
    api = ApiClient(config.CF_WORKER_URL, config.WORKER_TOKEN)
    notifier = Notifier(config.OWNER_TELEGRAM_BOT_TOKEN, config.OWNER_TELEGRAM_CHAT_ID)

    last_health_ping = 0
    notified_jobs: dict[str, float] = {}  # job_id -> first_seen timestamp

    print(f"[worker] Started (SEMI-AUTO MODE). Polling {config.CF_WORKER_URL} every {config.POLL_INTERVAL}s")
    print(f"[worker] Jobs will be NOTIFIED only — use nexgen_cli.py to deploy")

    while True:
        try:
            # Health ping every 5 minutes
            now = time.time()
            if now - last_health_ping >= config.HEALTH_INTERVAL:
                api.send_health_ping()
                last_health_ping = now

            # Poll for next job
            job = api.get_next_job()
            if job:
                job_id = job["id"]
                action = _should_notify(job_id, notified_jobs)

                if action == "new":
                    tier = job.get("tier", "?")
                    bot = job.get("bot_username", "N/A")
                    job_type = job.get("job_type", "deploy")
                    notifier.send(
                        f"New {job_type} #{job_id}\n"
                        f"Tier: {tier} | Bot: @{bot}\n"
                        f"Waiting for your command."
                    )
                    print(f"[worker] Notified: new {job_type} #{job_id}")

                elif action == "reminder":
                    age = _format_age(notified_jobs[job_id] - REMINDER_INTERVAL)
                    notifier.send(f"Reminder: Order #{job_id} still pending ({age})")
                    print(f"[worker] Reminder sent for #{job_id}")

                # DO NOT process — wait for nexgen_cli.py to trigger

        except KeyboardInterrupt:
            print("[worker] Shutting down...")
            break
        except Exception:
            print(f"[worker] Error: {traceback.format_exc()}")
            time.sleep(10)
            continue

        time.sleep(config.POLL_INTERVAL)


if __name__ == "__main__":
    main()
