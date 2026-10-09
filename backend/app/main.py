"""FastAPI application for NetSentinel intrusion detection demo."""

from contextlib import asynccontextmanager
import io
import time
import uuid
import pandas as pd
from fastapi import FastAPI, File, HTTPException, Request, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import settings
from .domain import CLASS_DESCRIPTIONS, FEATURE_DESCRIPTIONS
from .explain import build_evidence, get_explanation
from .models import model_registry
from .preprocessing import MissingColumnsError, preprocess_dataframe
from .schemas import (
    ErrorResponse,
    ExplainRequest,
    ExplainResponse,
    HealthResponse,
    MetaLimits,
    MetaResponse,
    PredictResponse,
    PredictRowResponse,
    PredictSummary,
    RowDetailResponse,
)
from .sessions import SessionData, SessionNotFoundError, session_store


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load all models and verify TreeSHAP at startup
    model_registry.load_all(settings.ARTIFACTS_DIR)
    yield


app = FastAPI(
    title="NetSentinel API",
    description="UNSW-NB15 Intrusion Detection API (Random Forest + XGBoost)",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS configuration
origins = [
    settings.FRONTEND_ORIGIN,
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request timing middleware
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time-Sec"] = f"{process_time:.4f}"
    return response


# Exception handlers
@app.exception_handler(MissingColumnsError)
async def handle_missing_columns(request: Request, exc: MissingColumnsError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "code": "MISSING_COLUMNS",
            "message": str(exc),
            "details": exc.missing_columns,
        },
    )


@app.exception_handler(SessionNotFoundError)
async def handle_session_not_found(request: Request, exc: SessionNotFoundError):
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={
            "code": "SESSION_NOT_FOUND",
            "message": str(exc),
            "details": None,
        },
    )


def _process_dataframe(df: pd.DataFrame) -> PredictResponse:
    """Core prediction pipeline for any loaded dataframe."""
    t0 = time.time()
    prep_res, truncated = preprocess_dataframe(
        df=df,
        feature_order=model_registry.feature_order,
        categorical_cols=model_registry.categorical_cols,
        encoder=model_registry.encoder,
        max_rows=settings.MAX_ROWS,
    )

    X = prep_res.X
    n_rows = len(X)

    # 1. Random Forest Binary
    rf_probs = model_registry.predict_rf_proba(X)

    # 2. XGBoost Multiclass
    xgb_probs = model_registry.predict_xgb_proba(X)
    xgb_class_indices = xgb_probs.argmax(axis=1).tolist()
    xgb_classes = [model_registry.classes[idx] for idx in xgb_class_indices]
    xgb_confidences = [float(xgb_probs[i, idx]) for i, idx in enumerate(xgb_class_indices)]

    # Compute summary statistics
    # Default threshold 0.5 for binary RF flag
    n_flagged = int((rf_probs >= 0.5).sum())
    attack_rate = float(n_flagged / n_rows) if n_rows > 0 else 0.0

    counts_per_class: dict[str, int] = {c: 0 for c in model_registry.classes}
    for c in xgb_classes:
        counts_per_class[c] = counts_per_class.get(c, 0) + 1

    processing_ms = round((time.time() - t0) * 1000, 2)

    summary = PredictSummary(
        n_rows=n_rows,
        n_flagged=n_flagged,
        attack_rate=round(attack_rate, 4),
        counts_per_class=counts_per_class,
        processing_ms=processing_ms,
        has_labels=prep_res.has_labels,
        truncated=truncated,
    )

    # Lightweight rows for frontend table
    rows: list[PredictRowResponse] = []
    for i in range(n_rows):
        row_probs = {
            model_registry.classes[c_idx]: round(float(xgb_probs[i, c_idx]), 4)
            for c_idx in range(len(model_registry.classes))
        }
        rows.append(
            PredictRowResponse(
                row_id=i,
                rf_attack_prob=round(float(rf_probs[i]), 4),
                xgb_class=xgb_classes[i],
                xgb_confidence=round(xgb_confidences[i], 4),
                xgb_probs=row_probs,
                true_label=prep_res.true_labels[i] if prep_res.true_labels else None,
                true_attack_cat=prep_res.true_attack_cats[i] if prep_res.true_attack_cats else None,
            )
        )

    # Save session
    session_id = str(uuid.uuid4())
    session_data = SessionData(
        session_id=session_id,
        created_at=time.time(),
        X=X,
        raw_features=prep_res.raw_features,
        rf_attack_probs=rf_probs,
        xgb_probs=xgb_probs,
        xgb_classes=xgb_classes,
        xgb_class_indices=xgb_class_indices,
        xgb_confidences=xgb_confidences,
        true_labels=prep_res.true_labels,
        true_attack_cats=prep_res.true_attack_cats,
        summary=summary,
    )
    session_store.add_session(session_data)

    return PredictResponse(session_id=session_id, summary=summary, rows=rows)


@app.get("/api/health", response_model=HealthResponse)
def get_health():
    """Health check endpoint."""
    return HealthResponse(status="ok", models_loaded=model_registry.is_loaded)


@app.get("/api/meta", response_model=MetaResponse)
def get_meta():
    """Metadata endpoint serving feature ordering, categories, metrics, descriptions, and limits."""
    llm_enabled = bool(settings.ANTHROPIC_API_KEY and settings.LLM_MODEL)
    return MetaResponse(
        feature_order=model_registry.feature_order,
        categorical_cols=model_registry.categorical_cols,
        categories=model_registry.categories,
        classes=model_registry.classes,
        class_descriptions=CLASS_DESCRIPTIONS,
        feature_descriptions=FEATURE_DESCRIPTIONS,
        metrics_rf=model_registry.metrics_rf,
        metrics_xgb=model_registry.metrics_xgb,
        versions=model_registry.versions,
        limits=MetaLimits(
            max_upload_mb=settings.MAX_UPLOAD_MB,
            max_rows=settings.MAX_ROWS,
        ),
        llm_enabled=llm_enabled,
    )


@app.post("/api/predict", response_model=PredictResponse)
async def predict_file(file: UploadFile = File(...)):
    """Run prediction on an uploaded CSV or Parquet file."""
    filename = (file.filename or "").lower()
    if not (filename.endswith(".csv") or filename.endswith(".parquet")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file format. Please upload a .csv or .parquet file.",
        )

    # Check file size
    contents = await file.read()
    max_bytes = settings.MAX_UPLOAD_MB * 1024 * 1024
    if len(contents) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum allowed size of {settings.MAX_UPLOAD_MB}MB.",
        )

    try:
        if filename.endswith(".parquet"):
            df = pd.read_parquet(io.BytesIO(contents))
        else:
            df = pd.read_csv(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to parse file: {str(e)}",
        )

    return _process_dataframe(df)


@app.post("/api/predict/sample", response_model=PredictResponse)
def predict_sample():
    """Run prediction on the sample flows file in artifacts."""
    sample_file = settings.ARTIFACTS_DIR / "sample_flows.csv"
    if not sample_file.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sample flows file (sample_flows.csv) was not found in artifacts.",
        )

    try:
        df = pd.read_csv(sample_file)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load sample flows: {str(e)}",
        )

    return _process_dataframe(df)


@app.get("/api/results/{session_id}/rows/{row_id}", response_model=RowDetailResponse)
def get_row_detail(session_id: str, row_id: int):
    """Retrieve full row details and top 8 TreeSHAP feature contributions."""
    session = session_store.get_session(session_id)
    if row_id < 0 or row_id >= len(session.X):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Row index {row_id} is out of bounds for this session.",
        )

    rf_prob = float(session.rf_attack_probs[row_id])
    rf_verdict = "Attack" if rf_prob >= 0.5 else "Normal"
    pred_class = session.xgb_classes[row_id]
    pred_confidence = session.xgb_confidences[row_id]
    raw_vals = session.raw_features[row_id]

    xgb_probs_map = {
        model_registry.classes[idx]: round(float(session.xgb_probs[row_id, idx]), 4)
        for idx in range(len(model_registry.classes))
    }

    # Top 8 TreeSHAP contributions
    X_row = session.X.iloc[[row_id]]
    top_features = model_registry.compute_row_contributions(
        X_row, session.xgb_class_indices[row_id], raw_vals
    )

    return RowDetailResponse(
        row_id=row_id,
        rf_attack_prob=round(rf_prob, 4),
        rf_verdict=rf_verdict,
        xgb_class=pred_class,
        xgb_confidence=round(pred_confidence, 4),
        xgb_probs=xgb_probs_map,
        true_label=session.true_labels[row_id] if session.true_labels else None,
        true_attack_cat=session.true_attack_cats[row_id] if session.true_attack_cats else None,
        raw_features=raw_vals,
        top_features=top_features,
    )


@app.post("/api/explain", response_model=ExplainResponse)
def explain_row(req: ExplainRequest, request: Request):
    """Generate or retrieve LLM explanation (or template fallback) for a row."""
    session = session_store.get_session(req.session_id)
    client_ip = request.client.host if request.client else "127.0.0.1"
    try:
        return get_explanation(session, req.row_id, client_ip=client_ip)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate explanation: {str(e)}",
        )
