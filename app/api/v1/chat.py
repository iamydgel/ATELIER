import json
import time
import uuid
from typing import List, Dict, Optional, Literal
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.auth import current_user
from app.core.db.models import Conversation, Message, User
from app.core.db.session import get_session
from app.inference.driver import get_inference_driver

router = APIRouter(prefix="/api/v1/chat", tags=["chat"])

class ChatRequestMessage(BaseModel):
    role: Literal["system", "user", "assistant"]
    content: str

class ChatRequest(BaseModel):
    model: str
    messages: List[ChatRequestMessage]
    conversation_id: Optional[str] = None
    temperature: float = 0.7
    max_tokens: int = 2048

class ChatResponseChoice(BaseModel):
    role: str
    content: str

class ChatResponse(BaseModel):
    conversation_id: str
    choices: List[ChatResponseChoice]
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

@router.post("/completions", response_model=ChatResponse)
async def chat_completions(
    payload: ChatRequest,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_session)
):
    if payload.conversation_id:
        result = await db.execute(
            select(Conversation).where(
                Conversation.id == payload.conversation_id,
                Conversation.user_id == user.id
            )
        )
        conversation = result.scalar_one_or_none()
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
            detail=f"Erreur d'inférence locale : {str(e)}"
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
    conversation.updated_at = datetime.utcnow()
    db.add(conversation)
    
    await db.commit()

    return ChatResponse(
        conversation_id=conversation.id,
        choices=[ChatResponseChoice(role="assistant", content=assistant_content)],
        latency_ms=response.latency_ms
    )

@router.post("/stream")
async def chat_stream(
    payload: ChatRequest,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_session)
):
    if payload.conversation_id:
        result = await db.execute(
            select(Conversation).where(
                Conversation.id == payload.conversation_id,
                Conversation.user_id == user.id
            )
        )
        conversation = result.scalar_one_or_none()
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
            conversation.updated_at = datetime.utcnow()
            db.add(conversation)
            await db.commit()
            
            yield "data: [DONE]\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': f'Erreur de streaming: {str(e)}'})}\n\n"
            yield "data: [DONE]\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@router.get("/conversations", response_model=List[ConversationResponse])
async def get_conversations(
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_session)
):
    result = await db.execute(
        select(Conversation)
        .where(Conversation.user_id == user.id, Conversation.archived_at == None)
        .order_by(Conversation.updated_at.desc())
    )
    conversations = result.scalars().all()
    
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

@router.get("/conversations/{conversation_id}/messages", response_model=List[MessageResponse])
async def get_messages(
    conversation_id: str,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_session)
):
    # Verify conversation ownership
    convo_result = await db.execute(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.user_id == user.id
        )
    )
    conversation = convo_result.scalar_one_or_none()
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation introuvable."
        )
        
    result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.asc())
    )
    messages = result.scalars().all()
    
    return [
        MessageResponse(
            id=m.id,
            role=m.role,
            content=m.content,
            created_at=m.created_at.timestamp()
        )
        for m in messages
    ]
