"""Configuration settings for NetSentinel backend."""

import os
from pathlib import Path
from pydantic import BaseModel
from dotenv import load_dotenv

# Load local environment variables if available
load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent
DEFAULT_ARTIFACTS_DIR = BASE_DIR / "artifacts"


class Settings(BaseModel):
    FRONTEND_ORIGIN: str = os.getenv("FRONTEND_ORIGIN", "http://localhost:3000")
    MAX_UPLOAD_MB: int = int(os.getenv("MAX_UPLOAD_MB", "25"))
    MAX_ROWS: int = int(os.getenv("MAX_ROWS", "5000"))
    ANTHROPIC_API_KEY: str | None = os.getenv("ANTHROPIC_API_KEY", None)
    LLM_MODEL: str | None = os.getenv("LLM_MODEL", None)
    ARTIFACTS_DIR: Path = Path(os.getenv("ARTIFACTS_DIR", str(DEFAULT_ARTIFACTS_DIR)))


settings = Settings()
