"""Contabo API client for querying live VPS state."""

import requests
import config


class ContaboClient:
    """Queries Contabo API for live VPS instance state.

    Used by the CLI pool command to show real cancelDate and status
    alongside D1's tracked state.
    """

    def __init__(self):
        self._token = None

    def _auth(self) -> str:
        """Get OAuth bearer token from Contabo."""
        if self._token:
            return self._token
        resp = requests.post(
            config.CONTABO_AUTH_URL,
            data={
                "client_id": config.CONTABO_CLIENT_ID,
                "client_secret": config.CONTABO_CLIENT_SECRET,
                "username": config.CONTABO_API_USER,
                "password": config.CONTABO_API_PASSWORD,
                "grant_type": "password",
            },
            timeout=15,
        )
        resp.raise_for_status()
        self._token = resp.json()["access_token"]
        return self._token

    def get_instances(self) -> list[dict]:
        """Fetch all Contabo instances. Returns list of dicts with
        instanceId, status, cancelDate, ip."""
        import uuid
        token = self._auth()
        resp = requests.get(
            f"{config.CONTABO_API_URL}/compute/instances",
            params={"size": 50},
            headers={
                "Authorization": f"Bearer {token}",
                "x-request-id": str(uuid.uuid4()),
            },
            timeout=15,
        )
        resp.raise_for_status()
        result = []
        for inst in resp.json().get("data", []):
            result.append({
                "instanceId": inst["instanceId"],
                "status": inst.get("status", "unknown"),
                "cancelDate": inst.get("cancelDate"),
                "ip": inst.get("ipConfig", {}).get("v4", {}).get("ip", "?"),
            })
        return result
