"""Pydantic schemas for request and response models."""

from typing import Any
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str
    models_loaded: bool


class MetaLimits(BaseModel):
    max_upload_mb: int
    max_rows: int


class MetaResponse(BaseModel):
    feature_order: list[str]
    categorical_cols: list[str]
    categories: dict[str, list[str]]
    classes: list[str]
    class_descriptions: dict[str, str]
    feature_descriptions: dict[str, str]
    metrics_rf: dict[str, Any]
    metrics_xgb: dict[str, Any]
    versions: dict[str, str]
    limits: MetaLimits
    llm_enabled: bool


class PredictRowResponse(BaseModel):
    row_id: int
    rf_attack_prob: float
    xgb_class: str
    xgb_confidence: float
    xgb_probs: dict[str, float]
    true_label: int | None = None
    true_attack_cat: str | None = None


class PredictSummary(BaseModel):
    n_rows: int
    n_flagged: int
    attack_rate: float
    counts_per_class: dict[str, int]
    processing_ms: float
    has_labels: bool
    truncated: bool


class PredictResponse(BaseModel):
    session_id: str
    summary: PredictSummary
    rows: list[PredictRowResponse]


class FeatureContribution(BaseModel):
    name: str
    description: str | None = None
    raw_value: Any
    contribution: float


class RowDetailResponse(BaseModel):
    row_id: int
    rf_attack_prob: float
    rf_verdict: str
    xgb_class: str
    xgb_confidence: float
    xgb_probs: dict[str, float]
    true_label: int | None = None
    true_attack_cat: str | None = None
    raw_features: dict[str, Any]
    top_features: list[FeatureContribution]


class ExplainRequest(BaseModel):
    session_id: str
    row_id: int


class ExplainResponse(BaseModel):
    explanation: str
    source: str = Field(description="'llm' or 'template'")
    disclaimer: str = "AI-generated summary of model evidence, not confirmed ground truth."


class ErrorResponse(BaseModel):
    code: str
    message: str
    details: Any | None = None
