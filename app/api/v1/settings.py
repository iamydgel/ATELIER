from fastapi import APIRouter, Depends

from app.core.auth import current_user
from app.core.config import settings
from app.core.db.models import User
from app.inference.driver import get_inference_driver

router = APIRouter(prefix="/api/v1/settings", tags=["settings"])


@router.get("")
async def get_settings(user: User = Depends(current_user)):
    """Retourne la configuration active de l'environnement local."""
    driver = get_inference_driver()
    backend = settings.LOCALAI_INFERENCE_BACKEND

    if backend == "lmstudio":
        backend_url = f"http://{settings.LMSTUDIO_HOST}:{settings.LMSTUDIO_PORT}"
    elif backend == "llamacpp":
        backend_url = f"http://{settings.LLAMACPP_HOST}:{settings.LLAMACPP_PORT}"
    else:
        backend_url = driver.base_url

    return {
        "backend_active": backend,
        "backend_url": backend_url,
        "session_ttl_hours": settings.LOCALAI_SESSION_TTL_HOURS,
        "data_dir": settings.LOCALAI_DATA_DIR,
    }
