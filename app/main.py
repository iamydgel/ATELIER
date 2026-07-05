from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from app.api.v1.auth import router as auth_router
from app.api.v1.chat import router as chat_router
from app.api.v1.models import router as models_router
from app.api.v1.settings import router as settings_router
from app.core.db.session import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initialisation de la base de données SQLite (mode WAL)...")
    await init_db()
    logger.info("Base de données initialisée.")
    yield

app = FastAPI(
    title="L'Atelier Local AI Console",
    version="0.1.0",
    lifespan=lifespan
)

# Configuration CORS pour le développement
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(chat_router)
app.include_router(models_router)
app.include_router(settings_router)

@app.get("/healthz")
async def healthz():
    logger.info("Health check endpoint called")
    return {"status": "ok"}

