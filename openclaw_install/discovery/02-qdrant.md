# Qdrant — Discovery Notes

**Script:** scripts/05-setup-qdrant.sh
**Started:** 2026-03-25 19:10 HKT

## Commands Run

```bash
$ docker run -d --name qdrant --restart unless-stopped \
    -p 6333:6333 \
    -v qdrant_data:/qdrant/storage \
    qdrant/qdrant:latest
# Pulled image, started container 563492cc816b

$ curl -s http://localhost:6333/healthz
healthz check passed
```

## Gotchas
- Docker group was already active (no re-login needed — cloud-init had run, and we SCPed from a new session).
- No x86 page size issues (as expected — only ARM64 needed the 4KB kernel fix).
- gRPC port 6334 not mapped to host (not needed for local Mem0 access).

## Verification
```
$ curl -s http://localhost:6333/healthz
healthz check passed

$ docker ps --filter name=qdrant
NAMES   STATUS        PORTS
qdrant  Up 4 minutes  0.0.0.0:6333->6333/tcp, 6334/tcp
```

## Resource Snapshot
Qdrant: 24MB RAM at idle.

## Time Taken
~30 seconds (image pull + start)
