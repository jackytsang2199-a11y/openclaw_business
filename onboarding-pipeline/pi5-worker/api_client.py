"""Client for the CF Worker API at api.3nexgen.com."""

import requests
from typing import Optional


class ApiClient:
    def __init__(self, base_url: str, worker_token: str):
        self.base_url = base_url.rstrip("/")
        self.headers = {"X-Worker-Token": worker_token}

    def get_next_job(self) -> Optional[dict]:
        """Poll for the next ready job. Returns job dict or None."""
        resp = requests.get(
            f"{self.base_url}/api/jobs/next",
            headers=self.headers,
            timeout=10,
        )
        resp.raise_for_status()
        return resp.json().get("job")

    def update_job(self, job_id: str, status: str, **kwargs) -> dict:
        """Update job status and optional fields (server_ip, error_log, re_queue_count)."""
        payload = {"status": status}
        payload.update(kwargs)
        resp = requests.patch(
            f"{self.base_url}/api/jobs/{job_id}",
            headers={**self.headers, "Content-Type": "application/json"},
            json=payload,
            timeout=10,
        )
        resp.raise_for_status()
        return resp.json()["job"]

    def send_health_ping(self) -> None:
        """Send health heartbeat to CF Worker."""
        resp = requests.post(
            f"{self.base_url}/api/health",
            headers=self.headers,
            timeout=10,
        )
        resp.raise_for_status()

    # --- VPS lifecycle methods (added by VPS billing strategy spec) ---

    def get_recyclable_vps(self) -> Optional[dict]:
        """Get the oldest cancelling VPS available for recycling. Returns VPS dict or None."""
        try:
            resp = requests.get(
                f"{self.base_url}/api/vps/recyclable",
                headers=self.headers,
                timeout=10,
            )
            if resp.status_code == 404:
                return None  # Endpoint not deployed yet — no recycling pool
            resp.raise_for_status()
            return resp.json().get("vps")
        except requests.RequestException:
            return None  # Recycling is best-effort; fall through to fresh provision

    def update_vps_instance(self, vps_id: str, **fields) -> dict:
        """Update a VPS instance record in D1 (status, customer_id, tier, etc.)."""
        resp = requests.patch(
            f"{self.base_url}/api/vps/{vps_id}",
            headers={**self.headers, "Content-Type": "application/json"},
            json=fields,
            timeout=10,
        )
        resp.raise_for_status()
        return resp.json()["vps"]

    def create_vps_instance(self, vps_data: dict) -> dict:
        """Insert a new VPS instance record in D1."""
        resp = requests.post(
            f"{self.base_url}/api/vps",
            headers={**self.headers, "Content-Type": "application/json"},
            json=vps_data,
            timeout=10,
        )
        resp.raise_for_status()
        return resp.json()["vps"]

    def get_active_vps_list(self) -> list:
        """Get all active VPSes for backup. Returns list of VPS dicts."""
        resp = requests.get(
            f"{self.base_url}/api/vps?status=active",
            headers=self.headers,
            timeout=10,
        )
        resp.raise_for_status()
        return resp.json().get("vps_list", [])

    def register_gateway_token(self, customer_id: str, gateway_token: str, tier: int, monthly_budget_hkd: float = None) -> dict:
        """Register a gateway token for a customer in the usage tracking system."""
        payload = {
            "customer_id": customer_id,
            "gateway_token": gateway_token,
            "tier": tier,
        }
        if monthly_budget_hkd is not None:
            payload["monthly_budget_hkd"] = monthly_budget_hkd
        resp = requests.post(
            f"{self.base_url}/api/usage",
            headers={**self.headers, "Content-Type": "application/json"},
            json=payload,
            timeout=10,
        )
        resp.raise_for_status()
        return resp.json()["usage"]
