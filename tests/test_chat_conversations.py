"""Tests for conversation history retrieval."""
import pytest
from app.core.db.models import Conversation, User
from sqlmodel import select

TEST_EMAIL = "convo_test@atelier.test"
TEST_PASSWORD = "convo-password-123"


@pytest.mark.asyncio
async def test_get_conversations(client, db_session):
    # 1. Sign up the user
    signup_resp = await client.post(
        "/api/v1/auth/signup",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD},
    )
    assert signup_resp.status_code == 201

    # Get the user ID from DB
    result = await db_session.exec(select(User).where(User.email == TEST_EMAIL))
    user = result.one()
    assert user.id is not None

    # 2. Log in
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD},
    )
    assert login_resp.status_code == 200

    # 3. Create a conversation directly in DB for this user
    convo = Conversation(
        user_id=user.id,
        title="Test Conversation History",
        model_id="llama3.1-8b-instruct-q4",
    )
    db_session.add(convo)
    await db_session.commit()
    await db_session.refresh(convo)

    # 4. Fetch conversations through the endpoint
    resp = await client.get("/api/v1/chat/conversations")
    assert resp.status_code == 200
    
    data = resp.json()
    # The list should contain the created conversation
    convo_ids = [c["id"] for c in data]
    assert convo.id in convo_ids
