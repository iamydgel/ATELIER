import json
import time
from collections.abc import AsyncGenerator

import httpx
from pydantic import BaseModel

from app.core.config import settings


class ChatChoiceMessage(BaseModel):
    role: str
    content: str

class ChatChoice(BaseModel):
    message: ChatChoiceMessage
    finish_reason: str | None = None

class ChatUsage(BaseModel):
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0

class ChatResponse(BaseModel):
    choices: list[ChatChoice]
    usage: ChatUsage
    latency_ms: int = 0

class StreamChoiceDelta(BaseModel):
    role: str | None = None
    content: str | None = ""

class StreamChoice(BaseModel):
    delta: StreamChoiceDelta
    finish_reason: str | None = None

class StreamChunk(BaseModel):
    choices: list[StreamChoice]
    usage: ChatUsage | None = None

class InferenceDriver:
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip("/")
        self.client = httpx.AsyncClient(timeout=60.0)

    async def get_models(self) -> list[str]:
        # Try OpenAI standard /v1/models first, fallback to /api/v1/models
        url = f"{self.base_url}/v1/models"
        try:
            response = await self.client.get(url, timeout=5.0)
            if response.status_code == 200:
                data = response.json()
                if "data" in data and isinstance(data["data"], list):
                    return [m["id"] for m in data["data"] if "id" in m]
                if "models" in data and isinstance(data["models"], list):
                    return [m["id"] for m in data["models"] if "id" in m]
        except Exception:
            # Fallback to /api/v1/models (LM Studio specific)
            url_lm = f"{self.base_url}/api/v1/models"
            try:
                response = await self.client.get(url_lm, timeout=5.0)
                if response.status_code == 200:
                    data = response.json()
                    if "data" in data and isinstance(data["data"], list):
                        return [m["id"] for m in data["data"] if "id" in m]
                    if "models" in data and isinstance(data["models"], list):
                        return [m["id"] for m in data["models"] if "id" in m]
            except Exception:
                pass
        
        # Fallback to hardcoded list if server is unreachable
        return ["llama3.1-8b-instruct-q4", "mistral-7b-instruct-v0.3"]

    async def chat(self, model: str, messages: list[dict[str, str]], temperature: float = 0.7, max_tokens: int = 2048) -> ChatResponse:
        url = f"{self.base_url}/v1/chat/completions"
        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": False
        }
        
        start_time = time.time()
        response = await self.client.post(url, json=payload)
        latency_ms = int((time.time() - start_time) * 1000)
        
        if response.status_code != 200:
            raise Exception(f"Inference error ({response.status_code}): {response.text}")
            
        data = response.json()
        
        choices = []
        for choice_data in data.get("choices", []):
            msg = choice_data.get("message", {})
            choices.append(ChatChoice(
                message=ChatChoiceMessage(
                    role=msg.get("role", "assistant"),
                    content=msg.get("content", "")
                ),
                finish_reason=choice_data.get("finish_reason")
            ))
            
        usage_data = data.get("usage", {})
        usage = ChatUsage(
            prompt_tokens=usage_data.get("prompt_tokens", 0),
            completion_tokens=usage_data.get("completion_tokens", 0),
            total_tokens=usage_data.get("total_tokens", 0)
        )
        
        return ChatResponse(choices=choices, usage=usage, latency_ms=latency_ms)

    async def chat_stream(self, model: str, messages: list[dict[str, str]], temperature: float = 0.7, max_tokens: int = 2048) -> AsyncGenerator[StreamChunk, None]:
        url = f"{self.base_url}/v1/chat/completions"
        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": True
        }
        
        async with self.client.stream("POST", url, json=payload) as response:
            if response.status_code != 200:
                body = await response.aread()
                raise Exception(f"Inference streaming error ({response.status_code}): {body.decode()}")
                
            async for line in response.aiter_lines():
                if not line.strip():
                    continue
                if line.startswith("data: "):
                    data_str = line[len("data: "):].strip()
                    if data_str == "[DONE]":
                        break
                    try:
                        data = json.loads(data_str)
                        choices = []
                        for choice_data in data.get("choices", []):
                            delta_data = choice_data.get("delta", {})
                            choices.append(StreamChoice(
                                delta=StreamChoiceDelta(
                                    role=delta_data.get("role"),
                                    content=delta_data.get("content", "")
                                ),
                                finish_reason=choice_data.get("finish_reason")
                            ))
                        usage = None
                        if data.get("usage"):
                            u = data["usage"]
                            usage = ChatUsage(
                                prompt_tokens=u.get("prompt_tokens", 0),
                                completion_tokens=u.get("completion_tokens", 0),
                                total_tokens=u.get("total_tokens", 0)
                            )
                        yield StreamChunk(choices=choices, usage=usage)
                    except json.JSONDecodeError:
                        continue

def get_inference_driver() -> InferenceDriver:
    if settings.LOCALAI_INFERENCE_BACKEND == "ollama":
        base_url = "http://localhost:11434"
    elif settings.LOCALAI_INFERENCE_BACKEND == "lmstudio":
        base_url = f"http://{settings.LMSTUDIO_HOST}:{settings.LMSTUDIO_PORT}"
    else:
        # Default is llamacpp
        base_url = f"http://{settings.LLAMACPP_HOST}:{settings.LLAMACPP_PORT}"
    return InferenceDriver(base_url)
