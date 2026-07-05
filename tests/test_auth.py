"""Smoke tests — auth endpoints (signup, login, me)."""
import pytest


TEST_EMAIL = "smoke@atelier.test"
TEST_PASSWORD = "smoke-password-123"


@pytest.mark.asyncio
async def test_signup(client):
    """POST /api/v1/auth/signup → 201."""
    response = await client.post(
        "/api/v1/auth/signup",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD},
    )
    assert response.status_code == 201


@pytest.mark.asyncio
async def test_login(client):
    """POST /api/v1/auth/signup puis /login → 200 avec cookie."""
    # Ensure user exists
    await client.post(
        "/api/v1/auth/signup",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD},
    )
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD},
    )
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_me_authenticated(client):
    """GET /api/v1/auth/me avec session active → 200."""
    # Signup + login pour obtenir un cookie
    await client.post(
        "/api/v1/auth/signup",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD},
    )
    await client.post(
        "/api/v1/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD},
    )
    response = await client.get("/api/v1/auth/me")
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == TEST_EMAIL
