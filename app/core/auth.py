from datetime import UTC, datetime

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from fastapi import Depends, HTTPException, status
from fastapi.security import APIKeyCookie
from itsdangerous import BadSignature, Signer
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.config import settings
from app.core.db.models import Session, User
from app.core.db.session import get_session

SESSION_COOKIE_NAME = "localai_session"

ph = PasswordHasher()
signer = Signer(settings.LOCALAI_SECRET_KEY)

def hash_password(password: str) -> str:
    return ph.hash(password)

def verify_password(password_hash: str, password: str) -> bool:
    try:
        ph.verify(password_hash, password)
        return True
    except VerifyMismatchError:
        return False

def sign_session_id(session_id: str) -> str:
    return signer.sign(session_id.encode()).decode()

def unsign_session_id(signed_id: str) -> str | None:
    try:
        return signer.unsign(signed_id.encode()).decode()
    except BadSignature:
        return None

# Dependency to check session cookie and fetch the current user
cookie_security = APIKeyCookie(name=SESSION_COOKIE_NAME, auto_error=False)

async def current_user(
    cookie: str | None = Depends(cookie_security),
    db: AsyncSession = Depends(get_session)
) -> User:
    if not cookie:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Non authentifié. Cookie de session manquant."
        )
    
    session_id = unsign_session_id(cookie)
    if not session_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Signature de session invalide."
        )
    
    result = await db.exec(select(Session).where(Session.id == session_id))
    db_session = result.first()
    
    if not db_session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session inexistante ou expirée."
        )
    
    if db_session.expires_at < datetime.now(UTC).replace(tzinfo=None):
        await db.delete(db_session)
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expirée. Veuillez vous reconnecter."
        )
    
    user_result = await db.exec(select(User).where(User.id == db_session.user_id))
    user = user_result.first()
    
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Utilisateur inactif ou introuvable."
        )
        
    return user
