"""Unit test for database migrations."""
import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from app.core.db.session import init_db


@pytest.mark.asyncio
async def test_message_table_migration_adds_column():
    # Setup an in-memory SQLite database
    test_engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
    )

    # Manually create the tables, but construct 'message' without the 'truncated' column
    async with test_engine.begin() as conn:
        await conn.execute(text("""
            CREATE TABLE conversation (
                id VARCHAR PRIMARY KEY,
                user_id INTEGER,
                title VARCHAR,
                model_id VARCHAR,
                system_prompt VARCHAR,
                parent_id VARCHAR,
                created_at DATETIME,
                updated_at DATETIME,
                archived_at DATETIME
            );
        """))
        
        await conn.execute(text("""
            CREATE TABLE message (
                id VARCHAR PRIMARY KEY,
                conversation_id VARCHAR,
                role VARCHAR,
                content VARCHAR,
                attachments VARCHAR,
                tokens_in INTEGER,
                tokens_out INTEGER,
                latency_ms INTEGER,
                created_at DATETIME,
                FOREIGN KEY(conversation_id) REFERENCES conversation(id)
            );
        """))

    # Verify that the column 'truncated' does NOT exist initially
    async with test_engine.connect() as conn:
        cursor = await conn.execute(text("PRAGMA table_info(message);"))
        columns = [row[1] for row in cursor.fetchall()]
        assert "truncated" not in columns

    # Call init_db with our test_engine to trigger the migration
    await init_db(db_engine=test_engine)

    # Verify that the column 'truncated' now exists
    async with test_engine.connect() as conn:
        cursor = await conn.execute(text("PRAGMA table_info(message);"))
        columns = [row[1] for row in cursor.fetchall()]
        assert "truncated" in columns

    await test_engine.dispose()
