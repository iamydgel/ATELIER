import asyncio
import uuid
from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from pydantic import BaseModel
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.auth import current_user
from app.core.db.models import InstalledModel, Model, User
from app.core.db.session import get_session
from app.inference.driver import get_inference_driver

router = APIRouter(prefix="/api/v1/models", tags=["models"])

# In-memory store for installations progress
INSTALL_PROGRESS: dict[str, dict[str, Any]] = {}

class InstallRequest(BaseModel):
    model_id: str

class InstallResponse(BaseModel):
    install_id: str
    status: str

class InstallStatusResponse(BaseModel):
    status: str
    progress: int
    error: str | None = None

async def simulate_install_task(install_id: str, model_id: str, db_session_maker: Any):
    try:
        # Simulate download/copy steps
        INSTALL_PROGRESS[install_id]["status"] = "downloading"
        for p in range(0, 101, 10):
            await asyncio.sleep(0.5)
            INSTALL_PROGRESS[install_id]["progress"] = p
            
        INSTALL_PROGRESS[install_id]["status"] = "verifying"
        await asyncio.sleep(0.5)
        
        # Add entry to database
        async with db_session_maker() as session:
            # Check if already exists to prevent duplicate key
            existing = await session.get(InstalledModel, model_id)
            if not existing:
                path = f"~/.localai/models/{model_id}/"
                db_inst = InstalledModel(
                    model_id=model_id,
                    path=path,
                    installed_at=datetime.now(UTC)
                )
                session.add(db_inst)
                await session.commit()
                
        INSTALL_PROGRESS[install_id]["status"] = "done"
        INSTALL_PROGRESS[install_id]["progress"] = 100
    except Exception as e:
        INSTALL_PROGRESS[install_id]["status"] = "error"
        INSTALL_PROGRESS[install_id]["error"] = str(e)

@router.get("/catalog")
async def get_models_catalog(
    user: User = Depends(current_user),  # noqa: B008
    db: AsyncSession = Depends(get_session)  # noqa: B008
):
    if user.id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Identifiant utilisateur non trouvé."
        )

    # 1. Fetch all models from DB
    models_result = await db.exec(select(Model))
    models = models_result.all()

    # 2. Fetch all installed models from DB
    installed_result = await db.exec(select(InstalledModel))
    installed_models = {im.model_id: im for im in installed_result.all()}

    # 3. Fetch loaded models from inference driver
    driver = get_inference_driver()
    loaded_model_ids = []
    try:
        loaded_model_ids = await driver.get_models()
    except Exception:  # noqa: S110
        # If driver is offline, we just continue with empty loaded list
        pass

    # 4. Map statuses
    catalog = []
    for m in models:
        # Determine status
        if m.id in loaded_model_ids:
            installed_status = "loaded"
        elif m.id in installed_models:
            installed_status = "installed"
        else:
            installed_status = "not_installed"

        # Check if there is an ongoing install
        # If there is one active in memory, mark it
        for info in INSTALL_PROGRESS.values():
            active_statuses = ["started", "downloading", "verifying"]
            if info["model_id"] == m.id and info["status"] in active_statuses:
                installed_status = "installing"
                break

        catalog.append({
            "id": m.id,
            "family": m.family,
            "version": m.version,
            "quant": m.quant,
            "modality": m.modality,
            "license": m.license,
            "source_url": m.source_url,
            "size_bytes": m.size_bytes,
            "sha256": m.sha256,
            "requires_vram_gb": m.requires_vram_gb,
            "installed_status": installed_status
        })

    return catalog

@router.post("/install", response_model=InstallResponse)
async def install_model(
    req: InstallRequest,
    background_tasks: BackgroundTasks,
    user: User = Depends(current_user),  # noqa: B008
    db: AsyncSession = Depends(get_session)  # noqa: B008
):
    if user.id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Identifiant utilisateur non trouvé."
        )

    # Verify model exists in catalog
    model = await db.get(Model, req.model_id)
    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Modèle {req.model_id} non trouvé dans le catalogue."
        )

    # Check if already installed
    existing = await db.get(InstalledModel, req.model_id)
    if existing:
        # Already installed, just return a mock done install status
        install_id = str(uuid.uuid4())
        INSTALL_PROGRESS[install_id] = {
            "model_id": req.model_id,
            "status": "done",
            "progress": 100
        }
        return InstallResponse(install_id=install_id, status="done")

    # Start installation
    install_id = str(uuid.uuid4())
    INSTALL_PROGRESS[install_id] = {
        "model_id": req.model_id,
        "status": "started",
        "progress": 0
    }

    # Pass the async session maker to the background task to isolate database sessions
    from app.core.db.session import async_session_maker
    background_tasks.add_task(
        simulate_install_task,
        install_id,
        req.model_id,
        async_session_maker
    )

    return InstallResponse(install_id=install_id, status="started")

@router.get("/install/{install_id}/status", response_model=InstallStatusResponse)
async def get_install_status(
    install_id: str,
    user: User = Depends(current_user)  # noqa: B008
):
    if user.id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Identifiant utilisateur non trouvé."
        )

    if install_id not in INSTALL_PROGRESS:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Identifiant d'installation introuvable."
        )

    info = INSTALL_PROGRESS[install_id]
    return InstallStatusResponse(
        status=info["status"],
        progress=info["progress"],
        error=info.get("error")
    )

@router.delete("/{model_id}", status_code=status.HTTP_204_NO_CONTENT)
async def uninstall_model(
    model_id: str,
    user: User = Depends(current_user),  # noqa: B008
    db: AsyncSession = Depends(get_session)  # noqa: B008
):
    if user.id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Identifiant utilisateur non trouvé."
        )

    installed = await db.get(InstalledModel, model_id)
    if not installed:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Modèle non installé."
        )

    await db.delete(installed)
    await db.commit()
    return None
