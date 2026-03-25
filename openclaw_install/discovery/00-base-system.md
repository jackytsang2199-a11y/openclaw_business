# Base System (Swap, Update, Node, Docker) — Discovery Notes

**Script:** scripts/00-swap-setup.sh, 01-system-update.sh, 02-install-node.sh, 03-install-docker.sh
**Started:** 2026-03-25 18:50 HKT
**VPS:** nexgen-T001 (128.140.70.90) — Hetzner CX33, nbg1

## Pre-check State

```
$ uname -a
Linux nexgen-T001 6.8.0-90-generic #91-Ubuntu SMP PREEMPT_DYNAMIC x86_64 GNU/Linux

$ cat /etc/os-release | head -3
PRETTY_NAME="Ubuntu 24.04.3 LTS"
NAME="Ubuntu"
VERSION_ID="24.04"

$ free -h
               total        used        free      shared  buff/cache   available
Mem:           7.6Gi       460Mi       6.7Gi       4.8Mi       676Mi       7.1Gi
Swap:          2.0Gi          0B       2.0Gi

$ df -h /
Filesystem      Size  Used Avail Use% Mounted on
/dev/sda1        75G  3.5G   69G   5% /

$ swapon --show
NAME      TYPE SIZE USED PRIO
/swapfile file   2G   0B   -2
```

Cloud-init already created 2GB swap. Swap script will detect and skip.

## Commands Run

### 00-swap-setup.sh
Swap already active from cloud-init. Script detects and skips — idempotent.

### 01-system-update.sh
`apt update && apt upgrade` ran clean. No held packages. `python3`, `python3-venv` installed.
debconf warnings about non-interactive terminal — harmless.

### 02-install-node.sh
Installed via nodesource LTS repo.
- Node.js v24.14.0
- npm 11.9.0

### 03-install-docker.sh
Installed via get.docker.com convenience script.
- Docker 29.3.0 (build 5927d80)
- Docker Compose v5.1.1
- Docker Buildx v0.31.1
- `deploy` user added to `docker` group (requires re-login)

## Gotchas
- cloud-init.yaml had `systemctl restart sshd` — fails on Ubuntu 24.04 (service is `ssh` not `sshd`). Fixed.
- `fsn1` location disabled for server creation. Switched to `nbg1` (Nuremberg).
- `PermitRootLogin` sed didn't match — Hetzner default is `#PermitRootLogin prohibit-password`. Fixed sed to handle commented lines.
- Docker group change requires re-login. Scripts running in new SSH sessions will have docker access.

## Verification
All four scripts ran successfully:
- `swapon --show` → 2GB active
- `node --version` → v24.14.0
- `npm --version` → 11.9.0
- `docker --version` → Docker version 29.3.0

## Resource Snapshot
```
$ free -h
               total        used        free      shared  buff/cache   available
Mem:           7.6Gi       542Mi       5.5Gi       4.8Mi       1.8Gi       7.0Gi
Swap:          2.0Gi          0B       2.0Gi

$ df -h /
Filesystem      Size  Used Avail Use% Mounted on
/dev/sda1        75G  4.3G   68G   6% /
```

Disk usage increased from 3.5G to 4.3G (+0.8G for Node.js + Docker).

## Time Taken
Start: 18:50 HKT → End: ~19:00 HKT (~10 minutes)
