#!/bin/bash
# Runs dashboard.py every 15 minutes via cron
set -euo pipefail
cd ~/nexgen-worker
source ~/nexgen-worker-env/bin/activate
source ~/nexgen-worker/.env 2>/dev/null || true
python3 dashboard.py >> ~/nexgen-dashboard.log 2>&1
