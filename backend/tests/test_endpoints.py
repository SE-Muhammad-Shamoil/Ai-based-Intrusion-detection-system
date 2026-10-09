"""Tests for FastAPI endpoints."""

from pathlib import Path
from fastapi.testclient import TestClient
import pytest

from app.main import app

client = TestClient(app)


def test_health_endpoint():
    """Verify /api/health returns ok and models_loaded=true."""
    resp = client.get("/api/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["models_loaded"] is True


def test_meta_endpoint():
    """Verify /api/meta returns complete metadata and metrics."""
    resp = client.get("/api/meta")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["feature_order"]) == 42
    assert len(data["classes"]) == 10
    assert "metrics_rf" in data
    assert "metrics_xgb" in data
    assert data["limits"]["max_upload_mb"] >= 1
    assert data["limits"]["max_rows"] >= 100
    assert "llm_enabled" in data


def test_predict_sample_endpoint():
    """Verify /api/predict/sample produces expected summary and rows."""
    resp = client.post("/api/predict/sample")
    assert resp.status_code == 200
    data = resp.json()
    assert "session_id" in data
    assert data["summary"]["n_rows"] == 300
    assert data["summary"]["has_labels"] is True
    assert len(data["rows"]) == 300

    first_row = data["rows"][0]
    assert "rf_attack_prob" in first_row
    assert "xgb_class" in first_row
    assert "xgb_confidence" in first_row
    assert len(first_row["xgb_probs"]) == 10
    assert first_row["true_label"] is not None
    assert first_row["true_attack_cat"] is not None

    # Test detail endpoint using session_id
    session_id = data["session_id"]
    detail_resp = client.get(f"/api/results/{session_id}/rows/0")
    assert detail_resp.status_code == 200
    detail = detail_resp.json()
    assert detail["row_id"] == 0
    assert len(detail["top_features"]) == 8
    assert "sttl" in detail["raw_features"] or "proto" in detail["raw_features"]

    # Test explanation endpoint (fallback template when no key)
    explain_resp = client.post(
        "/api/explain",
        json={"session_id": session_id, "row_id": 0},
    )
    assert explain_resp.status_code == 200
    exp_data = explain_resp.json()
    assert exp_data["source"] in ("template", "llm")
    assert "What was flagged" in exp_data["explanation"]
    assert "Why the model thinks so" in exp_data["explanation"]
    assert "How sure it is" in exp_data["explanation"]
    assert "What to check next" in exp_data["explanation"]
    assert "AI-generated summary of model evidence, not confirmed ground truth." in exp_data["explanation"]


def test_predict_upload_endpoint():
    """Verify /api/predict with uploaded CSV."""
    sample_path = Path("backend/artifacts/sample_flows.csv")
    with open(sample_path, "rb") as f:
        resp = client.post(
            "/api/predict",
            files={"file": ("sample.csv", f, "text/csv")},
        )
    assert resp.status_code == 200
    data = resp.json()
    assert data["summary"]["n_rows"] == 300


def test_predict_missing_columns_returns_422():
    """Verify /api/predict returns 422 with missing columns list."""
    incomplete_csv = "dur,proto,service\n0.1,tcp,http\n"
    resp = client.post(
        "/api/predict",
        files={"file": ("incomplete.csv", incomplete_csv.encode(), "text/csv")},
    )
    assert resp.status_code == 422
    data = resp.json()
    assert data["code"] == "MISSING_COLUMNS"
    assert isinstance(data["details"], list)
    assert len(data["details"]) > 0


def test_invalid_session_returns_404():
    """Verify 404 for non-existent session."""
    resp = client.get("/api/results/non-existent-session-id/rows/0")
    assert resp.status_code == 404
    data = resp.json()
    assert data["code"] == "SESSION_NOT_FOUND"
