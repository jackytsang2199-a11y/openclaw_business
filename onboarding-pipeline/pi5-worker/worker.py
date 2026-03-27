"""Main worker loop: poll CF Worker for jobs, deploy, repeat.

The worker is intentionally synchronous. The Agent SDK's async nature is
handled inside deployer.deploy() — it calls anyio.run() to bridge into
the async Agent SDK session. This keeps the outer loop simple.
"""

import time
import traceback

import config
from api_client import ApiClient
from notifier import Notifier
from deployer import Deployer


def main():
    api = ApiClient(config.CF_WORKER_URL, config.WORKER_TOKEN)
    notifier = Notifier(config.OWNER_TELEGRAM_BOT_TOKEN, config.OWNER_TELEGRAM_CHAT_ID)
    deployer = Deployer(api, notifier, config.OPENCLAW_INSTALL_DIR)

    last_health_ping = 0
    print(f"[worker] Started. Polling {config.CF_WORKER_URL} every {config.POLL_INTERVAL}s")
    print(f"[worker] Agent: Claude Max plan (Sonnet 4.6), max {config.AGENT_MAX_TURNS} turns")
    print(f"[worker] Claude auth: {'OK' if config.CLAUDE_AUTH_DIR.exists() else 'MISSING — run claude login!'}")

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
                print(f"[worker] Job found: {job['id']} (Tier {job['tier']}, {job['job_type']})")
                notifier.notify_new_job(job)

                if job["job_type"] == "deploy":
                    start = time.time()
                    success = deployer.deploy(job)
                    elapsed = time.time() - start
                    print(f"[worker] {job['id']}: {'SUCCESS' if success else 'FAILED'} in {elapsed:.0f}s")

                elif job["job_type"] == "cancel":
                    from vps_lifecycle import VpsLifecycle
                    lifecycle = VpsLifecycle(api, notifier)
                    lifecycle.handle_cancel(job)

                else:
                    notifier.send(
                        f"{job['id']} — job type '{job['job_type']}' requires manual handling"
                    )
                    api.update_job(job["id"], "failed",
                                   error_log=f"Job type {job['job_type']} not automated yet")
            else:
                pass

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
