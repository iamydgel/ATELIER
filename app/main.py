from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

app = FastAPI(title="L'Atelier Local AI Console", version="0.1.0")

# Configuration CORS pour le développement
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # À restreindre en production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/healthz")
async def healthz():
    logger.info("Health check endpoint called")
    return {"status": "ok"}
