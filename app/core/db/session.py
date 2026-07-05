from sqlalchemy import text
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlmodel import SQLModel
from sqlmodel.ext.asyncio.session import AsyncSession

DATABASE_URL = "sqlite+aiosqlite:///./localai.db"

engine = create_async_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
)

# Use async_sessionmaker for async engine to resolve Pyright overload mismatch
async_session_maker = async_sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

async def get_session():
    async with async_session_maker() as session:
        yield session

async def init_db(db_engine=None):
    if db_engine is None:
        db_engine = engine
    async with db_engine.begin() as conn:
        from app.core.db.models import (
            Model,
        )
        await conn.run_sync(SQLModel.metadata.create_all)
        
        await conn.execute(text("PRAGMA journal_mode=WAL;"))
        await conn.execute(text("PRAGMA foreign_keys=ON;"))

        # Vérification et migration à chaud pour la colonne 'truncated' dans la table 'message'
        cursor = await conn.execute(text("PRAGMA table_info(message);"))
        columns = [row[1] for row in cursor.fetchall()]
        if columns and "truncated" not in columns:
            await conn.execute(text("ALTER TABLE message ADD COLUMN truncated BOOLEAN DEFAULT 0;"))

    # Seed default models if not already present
    from sqlmodel import select

    from app.core.db.models import Model
    async with async_session_maker() as session:
        result = await session.exec(select(Model))
        if not result.first():
            models_seed = [
                Model(
                    id="llama3.1-8b-instruct-q4",
                    family="Llama 3.1",
                    version="8B",
                    quant="Q4_K_M",
                    modality="text",
                    license="Llama 3.1 Community",
                    source_url="https://huggingface.co/lmstudio-community/Meta-Llama-3.1-8B-Instruct-GGUF",
                    size_bytes=4780000000,
                    requires_vram_gb=8
                ),
                Model(
                    id="mistral-7b-instruct-v0.3",
                    family="Mistral",
                    version="7B",
                    quant="Q4_K_M",
                    modality="text",
                    license="Apache 2.0",
                    source_url="https://huggingface.co/lmstudio-community/Mistral-7B-Instruct-v0.3-GGUF",
                    size_bytes=4140000000,
                    requires_vram_gb=6
                ),
                Model(
                    id="gemma-2-9b-it",
                    family="Gemma 2",
                    version="9B",
                    quant="Q4_K_M",
                    modality="text",
                    license="Gemma License",
                    source_url="https://huggingface.co/lmstudio-community/gemma-2-9b-it-GGUF",
                    size_bytes=5500000000,
                    requires_vram_gb=10
                ),
                Model(
                    id="phi-3-mini-128k-instruct",
                    family="Phi 3",
                    version="3.8B",
                    quant="Q4_K_M",
                    modality="text",
                    license="MIT",
                    source_url="https://huggingface.co/lmstudio-community/Phi-3-mini-128k-instruct-GGUF",
                    size_bytes=2200000000,
                    requires_vram_gb=4
                )
            ]
            for m in models_seed:
                session.add(m)
            await session.commit()

