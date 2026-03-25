# Security Hardening — Discovery Notes

**Script:** scripts/09-security-hardening.sh
**Started:** 2026-03-25

## Commands Run

```bash
# UFW firewall
$ sudo ufw default deny incoming
$ sudo ufw default allow outgoing
$ sudo ufw allow OpenSSH
$ sudo ufw --force enable
# Firewall is active and enabled on system startup

$ sudo ufw status
Status: active
To                         Action      From
--                         ------      ----
OpenSSH                    ALLOW       Anywhere
OpenSSH (v6)               ALLOW       Anywhere (v6)

# SSH hardening
$ sudo sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
$ sudo sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
$ sudo sed -i 's/^#\?MaxAuthTries.*/MaxAuthTries 3/' /etc/ssh/sshd_config
$ sudo systemctl restart sshd

# fail2ban
$ sudo apt install -y fail2ban
$ sudo cat > /etc/fail2ban/jail.local << EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
maxretry = 3
EOF
$ sudo systemctl enable --now fail2ban

$ sudo fail2ban-client status sshd
Status for the jail: sshd
|- Filter
|  |- Currently failed: 0
|  `- Total failed:     0
`- Actions
   |- Currently banned: 0
   `- Total banned:     0

# File permissions
$ chmod 700 ~/.openclaw
$ chmod 600 ~/.openclaw/openclaw.json
$ chmod 600 ~/.openclaw/env
```

## Gotchas
- **All commands are idempotent** — safe to re-run. `ufw --force enable` skips the interactive prompt. `sed -i` overwrites existing values whether commented or not.
- **UFW only allows OpenSSH** — no other ports exposed. SearXNG (8888), Qdrant (6333/6334), CDP (9222) are all localhost-only, which is correct.
- **fail2ban jail.local** overrides jail.conf defaults. SSH gets stricter maxretry=3 vs general maxretry=5.
- **chmod 600 on openclaw.json and env** — prevents other users from reading API keys and tokens.

## Verification
```
$ sudo ufw status
Status: active (OpenSSH allowed)

$ sudo fail2ban-client status sshd
Currently banned: 0, Currently failed: 0

$ stat -c '%a' ~/.openclaw ~/.openclaw/openclaw.json ~/.openclaw/env
700
600
600
```

## Resource Snapshot
fail2ban: ~15MB RAM. UFW: kernel-level, negligible.

## Time Taken
~2 minutes
