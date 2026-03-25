# SearXNG — Discovery Notes

**Script:** scripts/07-setup-searxng.sh
**Started:** 2026-03-25 19:10 HKT

## Commands Run

```bash
$ docker run -d --name searxng --restart always \
    -p 8888:8080 \
    -e SEARXNG_BASE_URL=http://localhost:8888 \
    searxng/searxng:latest
# Pulled image, started container 35e3b9a7b8ad

# JSON API returned 403 Forbidden — bot detection / format not enabled
$ docker cp searxng:/etc/searxng/settings.yml /tmp/searxng-settings.yml
# Default had: formats: [html] only

# Fixed settings via python3/yaml:
#   search.formats: [html, json, csv, rss]
#   server.limiter: false
$ docker cp /tmp/searxng-settings.yml searxng:/etc/searxng/settings.yml
$ docker restart searxng

$ curl -s 'http://localhost:8888/search?q=test&format=json' | python3 -c "..."
46 results
```

## Gotchas
- **JSON format disabled by default!** SearXNG only allows HTML output unless `search.formats` includes `json`. This was not documented in the Pi5 reference (Pi5 may have had a custom settings.yml).
- **Bot detection (limiter) blocks curl by default.** `server.limiter: false` needed for local API use.
- The settings.yml must be modified inside the container then restart.
- Python `yaml` module available on Ubuntu 24.04 (from python3-yaml package).
- Some engines fail on startup (ahmia, torch) — harmless, they're dark web engines.

## Verification
```
$ curl -s 'http://localhost:8888/search?q=test&format=json' | python3 ...
46 results

$ docker ps --filter name=searxng
NAMES    STATUS        PORTS
searxng  Up 3 minutes  0.0.0.0:8888->8080/tcp
```

## Resource Snapshot
SearXNG: 131MB RAM.

## Time Taken
~2 minutes (image pull + config fix + restart)
