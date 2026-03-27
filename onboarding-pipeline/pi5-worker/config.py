import os
from pathlib import Path

# Load .env file if it exists
_env_path = Path(__file__).parent / ".env"
if _env_path.exists():
    for line in _env_path.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, _, value = line.partition("=")
            os.environ.setdefault(key.strip(), value.strip())

# CF Worker API
CF_WORKER_URL = os.environ["CF_WORKER_URL"]
WORKER_TOKEN = os.environ["WORKER_TOKEN"]

# Telegram
OWNER_TELEGRAM_BOT_TOKEN = os.environ["OWNER_TELEGRAM_BOT_TOKEN"]
OWNER_TELEGRAM_CHAT_ID = os.environ["OWNER_TELEGRAM_CHAT_ID"]

# Paths
OPENCLAW_INSTALL_DIR = Path(os.environ.get("OPENCLAW_INSTALL_DIR", str(Path.home() / "openclaw_install")))
ARCHIVES_DIR = Path(os.environ.get("ARCHIVES_DIR", str(Path.home() / "archives")))
SSH_KEY_PATH = Path(os.environ.get("SSH_KEY_PATH", str(Path.home() / ".ssh" / "nexgen_automation")))

# API Keys
DEEPSEEK_API_KEY = os.environ["DEEPSEEK_API_KEY"]
OPENAI_API_KEY = os.environ["OPENAI_API_KEY"]

# Agent SDK (uses Claude Max plan via ~/.claude/ OAuth — no API key needed)
AGENT_MAX_TURNS = int(os.environ.get("AGENT_MAX_TURNS", "50"))
CLAUDE_AUTH_DIR = Path.home() / ".claude"  # Agent SDK reads OAuth token from here

# Polling
POLL_INTERVAL = int(os.environ.get("POLL_INTERVAL", "30"))
HEALTH_INTERVAL = int(os.environ.get("HEALTH_INTERVAL", "300"))  # 5 min

# Contabo API
CONTABO_CLIENT_ID = os.environ["CONTABO_CLIENT_ID"]
CONTABO_CLIENT_SECRET = os.environ["CONTABO_CLIENT_SECRET"]
CONTABO_API_USER = os.environ["CONTABO_API_USER"]
CONTABO_API_PASSWORD = os.environ["CONTABO_API_PASSWORD"]
CONTABO_AUTH_URL = "https://auth.contabo.com/auth/realms/contabo/protocol/openid-connect/token"
CONTABO_API_URL = "https://api.contabo.com/v1"

# Backup
BACKUPS_DIR = Path(os.environ.get("BACKUPS_DIR", str(Path.home() / "backups")))
BACKUP_STAGGER_SECONDS = int(os.environ.get("BACKUP_STAGGER_SECONDS", "300"))  # 5 min between VPSes
