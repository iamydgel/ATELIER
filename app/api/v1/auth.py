import secrets
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.auth import hash_password, verify_password, sign_session_id, SESSION_COOKIE_NAME, current_user
from app.core.config import settings
from app.core.db.models import Session as DbSession, User
from app.core.db.session import get_session

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

class UserRegister(BaseModel):
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: int
    email: str
    role: str

@router.post("/signup", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def signup(payload: UserRegister, db: AsyncSession = Depends(get_session)):
    email_lower = payload.email.strip().lower()
    if not email_lower or "@" not in email_lower:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Format de l'adresse email invalide."
        )
    
    if len(payload.password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le mot de passe doit contenir au moins 6 caractères."
        )
    
    result = await db.exec(select(User).where(User.email == email_lower))
    existing_user = result.first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Un utilisateur avec cet email existe déjà."
        )
    
    hashed = hash_password(payload.password)
    user = User(email=email_lower, password_hash=hashed, role="user")
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user

@router.post("/login")
async def login(payload: UserLogin, response: Response, db: AsyncSession = Depends(get_session)):
    email_lower = payload.email.strip().lower()
    result = await db.exec(select(User).where(User.email == email_lower))
    user = result.first()
    
    if not user or not verify_password(user.password_hash, payload.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Identifiants invalides."
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Compte inactif."
        )
    
    # Create new session
    if user.id is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erreur lors de la récupération de l'utilisateur."
        )
        
    session_id = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(hours=settings.LOCALAI_SESSION_TTL_HOURS)
    
    session = DbSession(
        id=session_id,
        user_id=user.id,
        expires_at=expires_at
    )
    db.add(session)
    await db.commit()
    
    # Set HTTP-Only Cookie with signature
    signed_cookie = sign_session_id(session_id)
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=signed_cookie,
        httponly=True,
        samesite="strict",
        secure=False,  # Set to True if using HTTPS in prod
        max_age=settings.LOCALAI_SESSION_TTL_HOURS * 3600
    )
    
    return {
        "status": "success",
        "user": {
            "id": user.id,
            "email": user.email,
            "role": user.role
        }
    }

@router.post("/logout")
async def logout(response: Response, user: User = Depends(current_user)):
    response.delete_cookie(key=SESSION_COOKIE_NAME)
    return {"status": "success", "message": "Déconnexion réussie."}

@router.get("/me", response_model=UserResponse)
async def get_me(user: User = Depends(current_user)):
    return user
