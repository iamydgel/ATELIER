"""Smoke test — models catalog endpoint."""
import pytest


TEST_EMAIL = "catalog@atelier.test"
TEST_PASSWORD = "catalog-password-123"


async def _authenticate(client) -> None:
    """Helper : crée un utilisateur et ouvre une session."""
    await client.post(
        "/api/v1/auth/signup",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD},
    )
    await client.post(
        "/api/v1/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD},
    )


@pytest.mark.asyncio
async def test_models_catalog_authenticated(client):
    """GET /api/v1/models/catalog authentifié → 200 + liste (peut être vide si LM Studio off)."""
    await _authenticate(client)
    response = await client.get("/api/v1/models/catalog")
    assert response.status_code == 200
    data = response.json()
    # La liste peut être vide si aucun moteur d'inférence n'est actif (CI offline)
    assert isinstance(data, list)


@pytest.mark.asyncio
async def test_models_catalog_unauthenticated(client):
    """GET /api/v1/models/catalog sans session → 401."""
    response = await client.get("/api/v1/models/catalog")
    assert response.status_code == 401
