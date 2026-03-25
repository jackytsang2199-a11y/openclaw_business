#!/bin/bash
set -euo pipefail
SCRIPT_NAME="13-setup-clawteam"
log() { echo "[$SCRIPT_NAME] $1"; }
error() { echo "[$SCRIPT_NAME] ERROR: $1" >&2; exit 1; }

# Install tmux
if ! command -v tmux &>/dev/null; then
  log "Installing tmux..."
  sudo apt-get update -y
  sudo apt-get install -y tmux
fi
log "tmux: $(tmux -V)"

# Create Python venv
if [ -d ~/clawteam-env ]; then
  log "ClawTeam venv already exists. Skipping."
else
  log "Creating ClawTeam venv..."
  python3 -m venv ~/clawteam-env
fi

# Install ClawTeam
if ~/clawteam-env/bin/clawteam --version &>/dev/null; then
  log "ClawTeam already installed: $(~/clawteam-env/bin/clawteam --version)"
else
  log "Installing ClawTeam from GitHub..."
  ~/clawteam-env/bin/pip install git+https://github.com/win4r/ClawTeam-OpenClaw.git
fi

# Create symlink
mkdir -p ~/bin
ln -sf ~/clawteam-env/bin/clawteam ~/bin/clawteam

# Add to PATH if not already
grep -q '$HOME/bin' ~/.bashrc 2>/dev/null || echo 'export PATH="$HOME/bin:$PATH"' >> ~/.bashrc

log "ClawTeam installed. Available at: ~/bin/clawteam"
log "Version: $(~/clawteam-env/bin/clawteam --version 2>/dev/null || echo 'unknown')"
