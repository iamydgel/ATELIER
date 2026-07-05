import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    LOCALAI_DATA_DIR: str = os.path.expanduser("~/.localai")
    LOCALAI_SECRET_KEY: str = "change-me-32-bytes-min-long-enough-for-security"
    LOCALAI_SESSION_TTL_HOURS: int = 24
    LOCALAI_INFERENCE_BACKEND: str = "lmstudio"
    LLAMACPP_PORT: int = 8081
    LLAMACPP_HOST: str = "127.0.0.1"
    LMSTUDIO_PORT: int = 1234
    LMSTUDIO_HOST: str = "127.0.0.1"
    
    class Config:
        env_file = ".env"

settings = Settings()
