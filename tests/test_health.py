"""Smoke test — healthz endpoint."""
import pytest


@pytest.mark.asyncio
async def test_healthz(client):
    """GET /healthz doit retourner 200 {"status": "ok"}."""
    response = await client.get("/healthz")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
