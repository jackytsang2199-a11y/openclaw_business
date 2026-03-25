#!/bin/bash
set -euo pipefail
SCRIPT_NAME="07-setup-searxng"
log() { echo "[$SCRIPT_NAME] $1"; }
error() { echo "[$SCRIPT_NAME] ERROR: $1" >&2; exit 1; }

# Idempotent check
if docker ps --filter name=searxng --format '{{.Names}}' 2>/dev/null | grep -q searxng; then
  log "SearXNG already running. Skipping."
  exit 0
fi

# Check if stopped container exists
if docker ps -a --filter name=searxng --format '{{.Names}}' 2>/dev/null | grep -q searxng; then
  log "SearXNG container exists but stopped. Starting..."
  docker start searxng
else
  log "Starting SearXNG..."
  docker run -d --name searxng --restart always \
    -p 8888:8080 \
    -e SEARXNG_BASE_URL=http://localhost:8888 \
    searxng/searxng:latest
fi

# Wait for container to be ready
log "Waiting for SearXNG to start..."
for i in $(seq 1 30); do
  if curl -sf http://localhost:8888/ &>/dev/null; then
    break
  fi
  sleep 1
done

# Enable JSON API format and disable rate limiter
log "Configuring SearXNG for JSON API access..."

# Ensure pyyaml is available for settings manipulation
python3 -c "import yaml" 2>/dev/null || sudo apt-get install -y python3-yaml

docker cp searxng:/etc/searxng/settings.yml /tmp/searxng-settings.yml

python3 << 'PYEOF'
import yaml

with open('/tmp/searxng-settings.yml') as f:
    cfg = yaml.safe_load(f)

# Enable JSON format for API access
if 'search' not in cfg:
    cfg['search'] = {}
cfg['search']['formats'] = ['html', 'json', 'csv', 'rss']

# Disable rate limiter (local use only, not exposed to internet)
if 'server' not in cfg:
    cfg['server'] = {}
cfg['server']['limiter'] = False

with open('/tmp/searxng-settings.yml', 'w') as f:
    yaml.dump(cfg, f, default_flow_style=False, allow_unicode=True)
PYEOF

docker cp /tmp/searxng-settings.yml searxng:/etc/searxng/settings.yml
rm -f /tmp/searxng-settings.yml

# Restart to apply config
docker restart searxng
sleep 5

# Verify JSON API
log "Verifying JSON API..."
RESULT_COUNT=$(curl -s 'http://localhost:8888/search?q=test&format=json' | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('results',[])))" 2>/dev/null || echo "0")

if [ "$RESULT_COUNT" -gt 0 ] 2>/dev/null; then
  log "SearXNG JSON API working ($RESULT_COUNT results)."
else
  error "SearXNG JSON API not returning results."
fi

docker ps --filter name=searxng --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
log "SearXNG setup complete."
