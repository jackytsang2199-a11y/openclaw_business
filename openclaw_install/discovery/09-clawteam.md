# ClawTeam — Discovery Notes

**Script:** scripts/13-setup-clawteam.sh
**Started:** 2026-03-25

## Commands Run

```bash
# Install tmux (required for ClawTeam multi-agent sessions)
$ sudo apt install -y tmux

# Create isolated Python venv
$ python3 -m venv ~/clawteam-env

# Install ClawTeam from GitHub
$ ~/clawteam-env/bin/pip install git+https://github.com/win4r/ClawTeam-OpenClaw.git
# Installed ClawTeam v0.3.0

# Create ~/bin and symlink for PATH access
$ mkdir -p ~/bin
$ ln -sf ~/clawteam-env/bin/clawteam ~/bin/clawteam

# Add ~/bin to PATH
$ echo 'export PATH="$HOME/bin:$PATH"' >> ~/.bashrc
$ source ~/.bashrc

$ clawteam --version
ClawTeam v0.3.0
```

## Gotchas
- **tmux is a dependency** — ClawTeam uses tmux for multi-agent terminal sessions. Must be installed first.
- **Python venv isolation** — installed in `~/clawteam-env` to avoid polluting system Python or conflicting with Mem0's dependencies.
- **Symlink approach** — `~/bin/clawteam` symlinks to the venv binary, keeping the venv hidden from users. PATH updated in `.bashrc`.
- **No systemd service** — ClawTeam is an on-demand CLI tool, not a background daemon. Users invoke it manually.
- **Installed from GitHub** — `pip install git+https://...` pulls the latest from the win4r/ClawTeam-OpenClaw repo.

## Verification
```
$ which clawteam
/home/deploy/bin/clawteam

$ clawteam --version
ClawTeam v0.3.0

$ ls -la ~/bin/clawteam
lrwxrwxrwx 1 deploy deploy ... /home/deploy/bin/clawteam -> /home/deploy/clawteam-env/bin/clawteam
```

## Resource Snapshot
Venv: ~50MB disk. No persistent RAM usage (CLI tool).

## Time Taken
~2 minutes
