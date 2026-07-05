import asyncio
import json
import time
import uuid
from datetime import UTC, datetime
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import StreamingResponse
from loguru import logger
from pydantic import BaseModel
from sqlmodel import asc, desc, func, select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.auth import current_user
from app.core.config import settings
from app.core.db.models import Conversation, InstalledModel, Message, User
from app.core.db.session import get_session
from app.inference.driver import get_inference_driver

router = APIRouter(prefix="/api/v1/chat", tags=["chat"])

class ChatRequestMessage(BaseModel):
    role: Literal["system", "user", "assistant"]
    content: str

class ChatRequest(BaseModel):
    model: str
    messages: list[ChatRequestMessage]
    conversation_id: str | None = None
    temperature: float = 0.7
    max_tokens: int = 2048

class ChatResponseChoice(BaseModel):
    role: str
    content: str

class ChatResponse(BaseModel):
    conversation_id: str
    choices: list[ChatResponseChoice]
    latency_ms: int

class ConversationResponse(BaseModel):
    id: str
    title: str
    model_id: str
    created_at: float
    updated_at: float

class MessageResponse(BaseModel):
    id: str
    role: str
    content: str
    created_at: float

@router.get("/models", response_model=list[str])
async def list_models(user: User = Depends(current_user)):
    driver = get_inference_driver()
    return await driver.get_models()

@router.post("/completions", response_model=ChatResponse)
async def chat_completions(
    payload: ChatRequest,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_session)
):
    if user.id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Identifiant utilisateur non trouvé."
        )

    if payload.conversation_id:
        result = await db.exec(
            select(Conversation).where(
                Conversation.id == payload.conversation_id,
                Conversation.user_id == user.id
            )
        )
        conversation = result.first()
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation introuvable."
            )
    else:
        title = "Nouvelle discussion"
        user_msgs = [m.content for m in payload.messages if m.role == "user"]
        if user_msgs:
            title = user_msgs[0][:30] + ("..." if len(user_msgs[0]) > 30 else "")
            
        conversation = Conversation(
            id=str(uuid.uuid4()),
            user_id=user.id,
            title=title,
            model_id=payload.model
        )
        db.add(conversation)
        await db.commit()
        await db.refresh(conversation)

    # Save user message
    last_msg = payload.messages[-1]
    if last_msg.role == "user":
        user_db_message = Message(
            conversation_id=conversation.id,
            role="user",
            content=last_msg.content
        )
        db.add(user_db_message)
        await db.commit()

    driver = get_inference_driver()
    driver_messages = [{"role": m.role, "content": m.content} for m in payload.messages]
    
    try:
        response = await driver.chat(
            model=payload.model,
            messages=driver_messages,
            temperature=payload.temperature,
            max_tokens=payload.max_tokens
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Erreur d'inférence locale : {e!s}"
        )

    assistant_content = response.choices[0].message.content
    
    assistant_db_message = Message(
        conversation_id=conversation.id,
        role="assistant",
        content=assistant_content,
        tokens_in=response.usage.prompt_tokens,
        tokens_out=response.usage.completion_tokens,
        latency_ms=response.latency_ms
    )
    db.add(assistant_db_message)
    
    # Update conversation timestamp
    conversation.updated_at = datetime.now(UTC).replace(tzinfo=None)
    db.add(conversation)
    
    await db.commit()

    return ChatResponse(
        conversation_id=conversation.id,
        choices=[ChatResponseChoice(role="assistant", content=assistant_content)],
        latency_ms=response.latency_ms
    )

@router.post("/stream")
async def chat_stream(
    request: Request,
    payload: ChatRequest,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_session)
):
    if user.id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Identifiant utilisateur non trouvé."
        )

    if payload.conversation_id:
        result = await db.exec(
            select(Conversation).where(
                Conversation.id == payload.conversation_id,
                Conversation.user_id == user.id
            )
        )
        conversation = result.first()
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation introuvable."
            )
    else:
        title = "Nouvelle discussion"
        user_msgs = [m.content for m in payload.messages if m.role == "user"]
        if user_msgs:
            title = user_msgs[0][:30] + ("..." if len(user_msgs[0]) > 30 else "")
            
        conversation = Conversation(
            id=str(uuid.uuid4()),
            user_id=user.id,
            title=title,
            model_id=payload.model
        )
        db.add(conversation)
        await db.commit()
        await db.refresh(conversation)

    # Save user message
    last_msg = payload.messages[-1]
    if last_msg.role == "user":
        user_db_message = Message(
            conversation_id=conversation.id,
            role="user",
            content=last_msg.content
        )
        db.add(user_db_message)
        await db.commit()

    driver = get_inference_driver()
    driver_messages = [{"role": m.role, "content": m.content} for m in payload.messages]

    async def event_generator():
        assistant_content = ""
        tokens_in = 0
        tokens_out = 0
        start_time = time.time()
        
        try:
            # Yield conversation details first
            yield f"data: {json.dumps({'conversation_id': conversation.id})}\n\n"
            
            async for chunk in driver.chat_stream(
                model=payload.model,
                messages=driver_messages,
                temperature=payload.temperature,
                max_tokens=payload.max_tokens
            ):
                content_chunk = chunk.choices[0].delta.content or ""
                assistant_content += content_chunk
                if chunk.usage:
                    tokens_in = chunk.usage.prompt_tokens
                    tokens_out = chunk.usage.completion_tokens
                yield f"data: {json.dumps({'content': content_chunk})}\n\n"
                
            latency_ms = int((time.time() - start_time) * 1000)
            
            # Save assistant message and update conversation
            assistant_db_message = Message(
                conversation_id=conversation.id,
                role="assistant",
                content=assistant_content,
                tokens_in=tokens_in,
                tokens_out=tokens_out,
                latency_ms=latency_ms
            )
            db.add(assistant_db_message)
            conversation.updated_at = datetime.now(UTC).replace(tzinfo=None)
            db.add(conversation)
            await db.commit()
            
            yield "data: [DONE]\n\n"
        except asyncio.CancelledError:
            logger.info("Streaming client disconnected - sauvegarde du message partiel.")
            if assistant_content.strip():
                latency_ms = int((time.time() - start_time) * 1000)
                partial_msg = Message(
                    conversation_id=conversation.id,
                    role="assistant",
                    content=assistant_content,
                    tokens_in=tokens_in,
                    tokens_out=tokens_out,
                    latency_ms=latency_ms,
                    truncated=True,
                )
                db.add(partial_msg)
                conversation.updated_at = datetime.now(UTC).replace(tzinfo=None)
                db.add(conversation)
                await db.commit()
            raise
        except Exception as e:
            yield f"data: {json.dumps({'error': f'Erreur de streaming: {e!s}'})}\n\n"
            yield "data: [DONE]\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@router.get("/conversations", response_model=list[ConversationResponse])
async def get_conversations(
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_session)
):
    if user.id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Identifiant utilisateur non trouvé."
        )

    result = await db.exec(
        select(Conversation)
        .where(Conversation.user_id == user.id, Conversation.archived_at is None)
        .order_by(desc(Conversation.updated_at))
    )
    conversations = result.all()
    
    return [
        ConversationResponse(
            id=c.id,
            title=c.title,
            model_id=c.model_id,
            created_at=c.created_at.timestamp(),
            updated_at=c.updated_at.timestamp()
        )
        for c in conversations
    ]

@router.get("/conversations/{conversation_id}/messages", response_model=list[MessageResponse])
async def get_messages(
    conversation_id: str,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_session)
):
    if user.id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Identifiant utilisateur non trouvé."
        )

    # Verify conversation ownership
    convo_result = await db.exec(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.user_id == user.id
        )
    )
    conversation = convo_result.first()
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation introuvable."
        )
        
    result = await db.exec(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(asc(Message.created_at))
    )
    messages = result.all()
    
    return [
        MessageResponse(
            id=m.id,
            role=m.role,
            content=m.content,
            created_at=m.created_at.timestamp()
        )
        for m in messages
    ]

@router.get("/observability")
async def get_observability_stats(
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_session)
):
    if user.id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Identifiant utilisateur non trouvé."
        )

    # 1. Active Backend info
    driver = get_inference_driver()
    backend_url = driver.base_url
    
    # Ping active backend
    backend_ping = False
    loaded_models = []
    try:
        loaded_models = await driver.get_models()
        backend_ping = True
    except Exception:  # noqa: S110
        pass

    # 2. Installed models
    installed_result = await db.exec(select(InstalledModel))
    installed_models = installed_result.all()
    installed_count = len(installed_models)

    # 3. Personal Stats
    # Conversations count
    convo_count_result = await db.exec(
        select(func.count(Conversation.id)).where(  # type: ignore[arg-type]
            Conversation.user_id == user.id,
            Conversation.archived_at.is_(None)  # type: ignore[union-attr]
        )
    )
    conversations_count = convo_count_result.first() or 0

    # Total tokens in/out
    tokens_result = await db.exec(
        select(
            func.sum(Message.tokens_in),
            func.sum(Message.tokens_out)
        ).join(Conversation).where(
            Conversation.user_id == user.id
        )
    )
    tokens_data = tokens_result.first()
    
    total_tokens_in = 0
    total_tokens_out = 0
    if tokens_data:
        total_tokens_in = tokens_data[0] if tokens_data[0] is not None else 0
        total_tokens_out = tokens_data[1] if tokens_data[1] is not None else 0

    # 4. Recent conversations (last 20)
    recent_convo_result = await db.exec(
        select(Conversation)
        .where(Conversation.user_id == user.id, Conversation.archived_at.is_(None))  # type: ignore[union-attr]
        .order_by(desc(Conversation.updated_at))
        .limit(20)
    )
    recent_convos = recent_convo_result.all()
    
    recent_conversations_list = []
    for c in recent_convos:
        # Get count of messages in this convo
        msg_count_result = await db.exec(
            select(func.count(Message.id)).where(Message.conversation_id == c.id)  # type: ignore[arg-type]
        )
        msg_count = msg_count_result.first() or 0
        recent_conversations_list.append({
            "id": c.id,
            "title": c.title,
            "model_id": c.model_id,
            "created_at": c.created_at.timestamp(),
            "message_count": msg_count
        })

    return {
        "backend_active": settings.LOCALAI_INFERENCE_BACKEND,
        "backend_url": backend_url,
        "backend_ping": backend_ping,
        "models_loaded": loaded_models,
        "installed_count": installed_count,
        "installed_models": [
            {
                "model_id": m.model_id,
                "path": m.path,
                "installed_at": m.installed_at.timestamp() if m.installed_at else None
            }
            for m in installed_models
        ],
        "conversations_count": conversations_count,
        "total_tokens_in": total_tokens_in,
        "total_tokens_out": total_tokens_out,
        "recent_conversations": recent_conversations_list
    }
