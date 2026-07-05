from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlmodel import SQLModel
from sqlmodel.ext.asyncio.session import AsyncSession

DATABASE_URL = "sqlite+aiosqlite:///./localai.db"

engine = create_async_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
)

async_session_maker = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

async def get_session():
    async with async_session_maker() as session:
        yield session

async def init_db():
    async with engine.begin() as conn:
        # Import models to ensure they are registered on SQLModel.metadata
        from app.core.db.models import User, Session, Conversation, Message, Model, InstalledModel, AuditLog
        await conn.run_sync(SQLModel.metadata.create_all)
        
        # Enable WAL mode and check foreign keys enforcement using text()
        await conn.execute(text("PRAGMA journal_mode=WAL;"))
        await conn.execute(text("PRAGMA foreign_keys=ON;"))
