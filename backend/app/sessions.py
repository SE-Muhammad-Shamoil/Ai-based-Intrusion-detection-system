"""In-memory session manager for NetSentinel.

Maintains the last 5 uploaded sessions with a 30-minute expiry time.
"""

from dataclasses import dataclass, field
import time
from typing import Any
import numpy as np
import pandas as pd

from .schemas import ExplainResponse, PredictSummary

SESSION_TTL_SECONDS = 30 * 60  # 30 minutes
MAX_SESSIONS = 5


class SessionNotFoundError(Exception):
    """Raised when a requested session is missing or has expired."""

    def __init__(self, message: str = "Session not found or expired. Please upload the file again."):
        super().__init__(message)


@dataclass
class SessionData:
    session_id: str
    created_at: float
    X: pd.DataFrame
    raw_features: list[dict[str, Any]]
    rf_attack_probs: np.ndarray
    xgb_probs: np.ndarray
    xgb_classes: list[str]
    xgb_class_indices: list[int]
    xgb_confidences: list[float]
    true_labels: list[int] | None
    true_attack_cats: list[str] | None
    summary: PredictSummary
    explanation_cache: dict[int, ExplainResponse] = field(default_factory=dict)


class SessionStore:
    def __init__(self) -> None:
        self._sessions: dict[str, SessionData] = {}

    def _cleanup_expired(self) -> None:
        now = time.time()
        expired_ids = [
            sid for sid, s in self._sessions.items()
            if now - s.created_at > SESSION_TTL_SECONDS
        ]
        for sid in expired_ids:
            del self._sessions[sid]

    def add_session(self, session: SessionData) -> None:
        self._cleanup_expired()
        # Enforce maximum 5 uploads in memory (evict oldest if needed)
        while len(self._sessions) >= MAX_SESSIONS:
            oldest_id = min(self._sessions.keys(), key=lambda k: self._sessions[k].created_at)
            del self._sessions[oldest_id]
        self._sessions[session.session_id] = session

    def get_session(self, session_id: str) -> SessionData:
        self._cleanup_expired()
        session = self._sessions.get(session_id)
        if session is None:
            raise SessionNotFoundError()
        return session


session_store = SessionStore()
