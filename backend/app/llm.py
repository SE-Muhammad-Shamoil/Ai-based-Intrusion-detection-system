"""LLM provider interface and Anthropic implementation with in-memory rate limiting."""

from abc import ABC, abstractmethod
from collections import defaultdict
import time
from anthropic import Anthropic

from .config import settings

SYSTEM_PROMPT = """You are a network-security analyst assistant inside an intrusion-detection demo. You receive the model evidence for ONE network flow: the predicted class, the class probabilities, an attack probability from a separate binary model, and the top features with their values, plain-English descriptions and influence scores (positive means it pushed toward the predicted class). Write a short explanation for a junior analyst.

Rules:

- Use ONLY the evidence provided. Do not invent packet contents, IP addresses, CVEs, tools or causes that the evidence does not imply.
- Use the feature descriptions. Say suggests or is consistent with, never proves.
- Always state the confidence. If the top two class probabilities are close, or the two models disagree, say the call is uncertain.
- 120 to 180 words, in four short parts with these bold headings: What was flagged, Why the model thinks so, How sure it is, What to check next.
- What to check next must be generic, practical analyst steps appropriate to the predicted class (for example, review other flows from the same source), not claims about this specific network.
- If the predicted class is Normal, explain why the flow looks benign instead.
- End with exactly: AI-generated summary of model evidence, not confirmed ground truth."""


class RateLimiter:
    """In-memory rate limiter per IP address (10 calls per minute per IP)."""

    def __init__(self, max_calls: int = 10, window_seconds: float = 60.0) -> None:
        self.max_calls = max_calls
        self.window_seconds = window_seconds
        self.history: dict[str, list[float]] = defaultdict(list)

    def is_allowed(self, client_ip: str) -> bool:
        now = time.time()
        calls = self.history[client_ip]
        # Discard calls outside sliding window
        valid_calls = [t for t in calls if now - t < self.window_seconds]
        if len(valid_calls) >= self.max_calls:
            self.history[client_ip] = valid_calls
            return False
        valid_calls.append(now)
        self.history[client_ip] = valid_calls
        return True


rate_limiter = RateLimiter(max_calls=10, window_seconds=60.0)


class LLMProvider(ABC):
    @abstractmethod
    def generate(self, user_content: str) -> str:
        """Generate markdown explanation from user prompt content."""
        pass


class AnthropicProvider(LLMProvider):
    def __init__(self, api_key: str, model: str) -> None:
        self.client = Anthropic(api_key=api_key, timeout=20.0)
        self.model = model

    def generate(self, user_content: str) -> str:
        response = self.client.messages.create(
            model=self.model,
            max_tokens=500,
            temperature=0.2,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_content}],
        )
        # Extract text from response blocks
        text_parts = [
            block.text for block in response.content if getattr(block, "text", None)
        ]
        return "\n".join(text_parts).strip()


def get_llm_provider() -> LLMProvider | None:
    """Return active LLM provider if API key and model are configured, else None."""
    if settings.ANTHROPIC_API_KEY and settings.LLM_MODEL:
        try:
            return AnthropicProvider(
                api_key=settings.ANTHROPIC_API_KEY,
                model=settings.LLM_MODEL,
            )
        except Exception:
            return None
    return None
