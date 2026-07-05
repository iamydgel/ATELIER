from datetime import datetime, timezone
import uuid
from sqlmodel import Field, SQLModel

def utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)

class User(SQLModel, table=True):
    __tablename__ = "user"  # type: ignore
    id: int | None = Field(default=None, primary_key=True)
    email: str = Field(unique=True, index=True)
    password_hash: str
    role: str = "user"  # admin, user, viewer
    is_active: bool = True
    quota_tokens_day: int | None = None
    created_at: datetime = Field(default_factory=utc_now)

class Session(SQLModel, table=True):
    __tablename__ = "session"  # type: ignore
    id: str = Field(primary_key=True)  # session identifier (e.g. secure token)
    user_id: int = Field(foreign_key="user.id", index=True)
    created_at: datetime = Field(default_factory=utc_now)
    expires_at: datetime
    ip: str | None = None
    user_agent: str | None = None

class Conversation(SQLModel, table=True):
    __tablename__ = "conversation"  # type: ignore
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    title: str
    model_id: str
    system_prompt: str | None = None
    parent_id: str | None = Field(default=None, foreign_key="conversation.id")
    created_at: datetime = Field(default_factory=utc_now, index=True)
    updated_at: datetime = Field(default_factory=utc_now, index=True)
    archived_at: datetime | None = None

class Message(SQLModel, table=True):
    __tablename__ = "message"  # type: ignore
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    conversation_id: str = Field(foreign_key="conversation.id", index=True)
    role: str  # system, user, assistant, tool
    content: str
    attachments: str = "[]"   # JSON string list
    tokens_in: int = 0
    tokens_out: int = 0
    latency_ms: int = 0
    created_at: datetime = Field(default_factory=utc_now, index=True)

class Model(SQLModel, table=True):
    __tablename__ = "model"  # type: ignore
    id: str = Field(primary_key=True)            # e.g., "llama3.1-8b-instruct-q4"
    family: str
    version: str
    quant: str
    modality: str                                # text | multimodal | embedding
    license: str
    source_url: str
    size_bytes: int
    sha256: str | None = None
    requires_vram_gb: int | None = None

class InstalledModel(SQLModel, table=True):
    __tablename__ = "installed_model"  # type: ignore
    model_id: str = Field(foreign_key="model.id", primary_key=True)
    path: str
    installed_at: datetime = Field(default_factory=utc_now)
    loaded_at: datetime | None = None
    device: str | None = None

class AuditLog(SQLModel, table=True):
    __tablename__ = "audit_log"  # type: ignore
    id: int | None = Field(default=None, primary_key=True)
    ts: datetime = Field(default_factory=utc_now, index=True)
    actor_user_id_hash: str | None = None
    action: str = Field(index=True)
    target_type: str | None = None
    target_id: str | None = None
    ip: str | None = None
    meta: str = "{}"        # JSON string dict
