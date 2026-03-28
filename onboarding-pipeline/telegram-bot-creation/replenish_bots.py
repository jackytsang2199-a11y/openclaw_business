"""Replenish Telegram bot pool by automating BotFather conversation.

Creates bots with default display names ("NexGen AI T{number}") and permanent
usernames ("NexGenAI_T{number}_bot"). Tokens are saved directly to the bot pool.

The deployment pipeline later renames the display name to whatever the customer
chose in the order form (via Bot.setMyName API).

Usage:
    # First run — will prompt for phone number + OTP code
    python3 replenish_bots.py --start 1043 --count 20

    # Subsequent runs — reuses saved session
    python3 replenish_bots.py --start 1063 --count 10

    # Dry run — shows what would be created without calling BotFather
    python3 replenish_bots.py --start 1043 --count 5 --dry-run

Requirements:
    pip install pyrogram tgcrypto

Rate limit strategy:
    - BotFather rate-limits /newbot aggressively
    - Sending MORE messages while rate-limited ESCALATES the ban exponentially
    - NEVER retry by sending another /newbot — parse the wait time and respect it
    - 65s between bots is safe for normal operation
    - If rate-limited: wait the FULL time BotFather says, then resume
"""

import asyncio
import argparse
import os
import random
import re
import sys
from pathlib import Path

from pyrogram import Client
from pyrogram.errors import FloodWait

# --- Config ---
# Telegram API credentials — from env vars, or falls back to Telegram Desktop's
# publicly available credentials (open-source GPL code on GitHub).
API_ID = int(os.environ.get("TELEGRAM_API_ID", "2040"))
API_HASH = os.environ.get("TELEGRAM_API_HASH", "b18441a1ff607e10a989891a5462e627")

BOT_POOL_DIR = Path(os.environ.get("BOT_POOL_DIR", str(Path.home() / "bot-pool")))
SESSION_NAME = "nexgen_session"  # Creates nexgen_session.session file in current dir

BOTFATHER_USERNAME = "BotFather"

# Delays between actions (seconds) — BotFather rate-limits aggressively
# Each bot = 3 messages (/newbot + name + username) over ~9s
# BotFather counts /newbot commands in a rolling window
# 70-100s gap between bots = ~80-110s between each /newbot (gap + 9s conversation)
DELAY_BETWEEN_MESSAGES = 3   # Between messages within one bot creation flow
DELAY_BETWEEN_BOTS_MIN = 70  # Min gap between creating different bots
DELAY_BETWEEN_BOTS_MAX = 100 # Max gap (randomized to avoid pattern detection)

# If BotFather says "try again in X seconds" and X exceeds this,
# stop the script entirely instead of waiting (likely a ban escalation)
MAX_WAIT_BEFORE_ABORT = 300  # 5 minutes — anything longer means stop

# Regex to extract bot token from BotFather's response
TOKEN_PATTERN = re.compile(r"\d+:[A-Za-z0-9_-]{35,}")

# Regex to extract wait seconds from "try again in 47 seconds"
WAIT_PATTERN = re.compile(r"try again in (\d+) seconds", re.IGNORECASE)


def parse_rate_limit_seconds(text: str) -> int | None:
    """Extract the wait time from BotFather's rate limit message.
    Returns seconds to wait, or None if not a rate limit message.
    """
    match = WAIT_PATTERN.search(text)
    if match:
        return int(match.group(1))
    if "too many attempts" in text.lower():
        return -1  # Rate limited but couldn't parse duration
    return None


async def wait_for_botfather_reply(app: Client, last_msg_id: int, timeout: int = 15) -> str:
    """Poll for BotFather's next reply after our message."""
    for _ in range(timeout * 2):  # Check every 0.5s
        await asyncio.sleep(0.5)
        async for msg in app.get_chat_history(BOTFATHER_USERNAME, limit=1):
            if msg.id > last_msg_id and not msg.outgoing:
                return msg.text or ""
    return ""


async def get_last_msg_id(app: Client) -> int:
    """Get the ID of the latest message in BotFather chat."""
    async for msg in app.get_chat_history(BOTFATHER_USERNAME, limit=1):
        return msg.id
    return 0


async def create_one_bot(app: Client, number: int) -> dict | str | None:
    """Create a single bot via BotFather conversation.

    Returns:
        dict {"username": str, "token": str} on success
        str "rate_limited:SECONDS" if rate limited (caller decides what to do)
        None on other failures
    """
    display_name = f"NexGen AI T{number}"
    username = f"NexGenAI_T{number}_bot"

    try:
        # Step 1: /newbot
        last_id = await get_last_msg_id(app)
        await app.send_message(BOTFATHER_USERNAME, "/newbot")
        resp = await wait_for_botfather_reply(app, last_id)

        # Check for rate limit — DO NOT retry, return immediately
        wait_secs = parse_rate_limit_seconds(resp)
        if wait_secs is not None:
            return f"rate_limited:{wait_secs}"

        if "new bot" not in resp.lower() and "call it" not in resp.lower():
            print(f"  ✗ T{number} — unexpected /newbot response: {resp[:100]}")
            return None

        # Step 2: Send display name
        await asyncio.sleep(DELAY_BETWEEN_MESSAGES)
        last_id = await get_last_msg_id(app)
        await app.send_message(BOTFATHER_USERNAME, display_name)
        resp = await wait_for_botfather_reply(app, last_id)

        if "username" not in resp.lower():
            print(f"  ✗ T{number} — unexpected name response: {resp[:100]}")
            return None

        # Step 3: Send username
        await asyncio.sleep(DELAY_BETWEEN_MESSAGES)
        last_id = await get_last_msg_id(app)
        await app.send_message(BOTFATHER_USERNAME, username)
        resp = await wait_for_botfather_reply(app, last_id)

        # Check for username conflict
        if "already taken" in resp.lower() or "already been taken" in resp.lower():
            print(f"  ✗ T{number} — @{username} already taken")
            return None

        # Extract token from success response
        token_match = TOKEN_PATTERN.search(resp)
        if token_match and "done" in resp.lower():
            token = token_match.group()
            print(f"  ✓ T{number} — @{username} created")
            return {"username": username, "token": token}

        print(f"  ✗ T{number} — could not extract token: {resp[:150]}")
        return None

    except FloodWait as e:
        return f"rate_limited:{e.value}"


async def main(start: int, count: int, dry_run: bool = False):
    pool_dir = BOT_POOL_DIR / "available"
    pool_dir.mkdir(parents=True, exist_ok=True)

    # Check for existing bots in the range to avoid duplicates
    existing = set()
    for f in pool_dir.glob("*.token"):
        existing.add(f.stem)
    assigned_dir = BOT_POOL_DIR / "assigned"
    if assigned_dir.exists():
        for f in assigned_dir.glob("*.token"):
            existing.add(f.stem)

    # Filter out numbers that already have bots
    to_create = []
    for i in range(start, start + count):
        uname = f"NexGenAI_T{i}_bot"
        if uname in existing:
            print(f"  — T{i} already in pool, skipping")
        else:
            to_create.append(i)

    if not to_create:
        print("Nothing to create — all bots already in pool.")
        return

    print(f"Creating {len(to_create)} bots (T{to_create[0]}–T{to_create[-1]})...")
    avg_delay = (DELAY_BETWEEN_BOTS_MIN + DELAY_BETWEEN_BOTS_MAX) // 2
    print(f"Estimated time: ~{len(to_create) * avg_delay // 60} minutes "
          f"({DELAY_BETWEEN_BOTS_MIN}-{DELAY_BETWEEN_BOTS_MAX}s between bots)\n")

    if dry_run:
        print("[DRY RUN — no actual bots will be created]\n")
        for number in to_create:
            print(f"  [dry-run] Would create: NexGen AI T{number} (@NexGenAI_T{number}_bot)")
        print(f"\n[dry-run] Would create {len(to_create)} bots in {pool_dir}")
        return

    # First run: prompts for phone number + OTP → saves session file
    app = Client(SESSION_NAME, api_id=API_ID, api_hash=API_HASH)
    await app.start()

    created = 0
    failed = 0
    for idx, number in enumerate(to_create):
        print(f"[{created}/{len(to_create)}] Creating T{number}...")

        result = await create_one_bot(app, number)

        # Handle rate limit — NEVER send more messages, just wait or abort
        if isinstance(result, str) and result.startswith("rate_limited:"):
            wait_secs = int(result.split(":")[1])

            if wait_secs == -1:
                print(f"  ✗ T{number} — rate limited (unknown duration). Stopping to be safe.")
                print(f"     Resume later: python3 replenish_bots.py --start {number} --count {len(to_create) - idx}")
                break

            if wait_secs > MAX_WAIT_BEFORE_ABORT:
                mins = wait_secs // 60
                print(f"  ✗ T{number} — rate limited for {wait_secs}s (~{mins} min). Stopping.")
                print(f"     Resume later: python3 replenish_bots.py --start {number} --count {len(to_create) - idx}")
                break

            # Short wait — respect it fully, then retry this same bot
            print(f"  ⏳ T{number} — rate limited, waiting {wait_secs}s (not sending anything)...")
            await asyncio.sleep(wait_secs + 5)  # +5s buffer
            print(f"  ↻ T{number} — retrying after cooldown...")
            result = await create_one_bot(app, number)

            # If still rate limited after waiting, stop entirely
            if isinstance(result, str) and result.startswith("rate_limited:"):
                print(f"  ✗ T{number} — still rate limited after waiting. Stopping.")
                print(f"     Resume later: python3 replenish_bots.py --start {number} --count {len(to_create) - idx}")
                break

        if isinstance(result, dict):
            token_file = pool_dir / f"{result['username']}.token"
            token_file.write_text(result["token"])
            created += 1
        else:
            failed += 1

        # Cooldown between bots — skip if this is the last one
        if idx < len(to_create) - 1:
            remaining = len(to_create) - idx - 1
            delay = random.randint(DELAY_BETWEEN_BOTS_MIN, DELAY_BETWEEN_BOTS_MAX)
            print(f"     waiting {delay}s before next bot... ({remaining} remaining)")
            await asyncio.sleep(delay)

    await app.stop()

    print(f"\nDone: {created} created, {failed} failed")
    print(f"Pool directory: {pool_dir}")

    # Show current pool status
    available = len(list(pool_dir.glob("*.token")))
    assigned = len(list(assigned_dir.glob("*.token"))) if assigned_dir.exists() else 0
    print(f"Pool status: {available} available, {assigned} assigned, {available + assigned} total")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Create Telegram bots via BotFather and add to bot pool"
    )
    parser.add_argument(
        "--start", type=int, required=True,
        help="Starting bot number (e.g. 1043)"
    )
    parser.add_argument(
        "--count", type=int, default=10,
        help="Number of bots to create (default: 10)"
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Show what would be created without calling BotFather"
    )
    args = parser.parse_args()
    asyncio.run(main(args.start, args.count, args.dry_run))
