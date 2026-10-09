"""Model loader and inference utilities for NetSentinel."""

import json
from pathlib import Path
from typing import Any
import joblib
import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import OrdinalEncoder

from .domain import get_feature_description
from .schemas import FeatureContribution


class ModelRegistry:
    """Singleton-like registry for pre-loaded models and metadata."""

    def __init__(self) -> None:
        self.rf_model: RandomForestClassifier | None = None
        self.xgb_model: xgb.XGBClassifier | None = None
        self.encoder: OrdinalEncoder | None = None
        self.feature_order: list[str] = []
        self.categorical_cols: list[str] = []
        self.categories: dict[str, list[str]] = {}
        self.classes: list[str] = []
        self.metrics_rf: dict[str, Any] = {}
        self.metrics_xgb: dict[str, Any] = {}
        self.versions: dict[str, str] = {}
        self.is_loaded: bool = False

    def load_all(self, artifacts_dir: Path) -> None:
        """Load all artifacts from the artifacts directory and verify TreeSHAP."""
        # Load feature ordering and categories
        feat_path = artifacts_dir / "feature_order.json"
        with open(feat_path, "r", encoding="utf-8") as f:
            feat_data = json.load(f)
            self.feature_order = feat_data["feature_order"]
            self.categorical_cols = feat_data["categorical_cols"]
            self.categories = feat_data.get("categories", {})

        # Load class labels
        classes_path = artifacts_dir / "classes.json"
        with open(classes_path, "r", encoding="utf-8") as f:
            self.classes = json.load(f)

        # Load metrics
        rf_met_path = artifacts_dir / "metrics_rf.json"
        if rf_met_path.exists():
            with open(rf_met_path, "r", encoding="utf-8") as f:
                self.metrics_rf = json.load(f)

        xgb_met_path = artifacts_dir / "metrics_xgb.json"
        if xgb_met_path.exists():
            with open(xgb_met_path, "r", encoding="utf-8") as f:
                self.metrics_xgb = json.load(f)

        # Load library versions
        ver_path = artifacts_dir / "versions.json"
        if ver_path.exists():
            with open(ver_path, "r", encoding="utf-8") as f:
                self.versions = json.load(f)

        # Load encoder
        enc_path = artifacts_dir / "encoder.joblib"
        self.encoder = joblib.load(enc_path)

        # Load Random Forest (binary)
        rf_path = artifacts_dir / "rf_binary.joblib"
        self.rf_model = joblib.load(rf_path)

        # Load XGBoost (multiclass)
        xgb_path = artifacts_dir / "xgb_multiclass.json"
        self.xgb_model = xgb.XGBClassifier()
        self.xgb_model.load_model(xgb_path)

        # Startup assertion: TreeSHAP contribution shape verification
        self._verify_treeshap_shape()

        self.is_loaded = True

    def _verify_treeshap_shape(self) -> None:
        """Verify XGBoost TreeSHAP output shape with a dummy row."""
        assert self.xgb_model is not None, "XGBoost model not loaded"
        assert len(self.feature_order) > 0, "Feature order is empty"
        assert len(self.classes) > 0, "Classes list is empty"

        dummy = np.zeros((1, len(self.feature_order)), dtype=np.float32)
        dmat = xgb.DMatrix(dummy, feature_names=self.feature_order)
        booster = self.xgb_model.get_booster()
        contribs = booster.predict(dmat, pred_contribs=True)

        expected_shape = (1, len(self.classes), len(self.feature_order) + 1)
        if contribs.shape != expected_shape:
            raise RuntimeError(
                f"TreeSHAP shape mismatch: expected {expected_shape}, got {contribs.shape}"
            )

    def predict_rf_proba(self, X: pd.DataFrame) -> np.ndarray:
        """Return attack probabilities for X (1D array)."""
        if self.rf_model is None:
            raise RuntimeError("Random Forest model is not loaded")
        probs = self.rf_model.predict_proba(X)
        return probs[:, 1]

    def predict_xgb_proba(self, X: pd.DataFrame) -> np.ndarray:
        """Return multiclass probabilities for X (2D array: N x num_classes)."""
        if self.xgb_model is None:
            raise RuntimeError("XGBoost model is not loaded")
        return self.xgb_model.predict_proba(X)

    def compute_row_contributions(
        self, X_row: pd.DataFrame, predicted_class_idx: int, raw_feature_vals: dict[str, Any]
    ) -> list[FeatureContribution]:
        """Compute TreeSHAP contributions for a single row and return the top 8 features.

        Contributions are in log-odds margin units relative to the predicted class.
        Positive values push toward the predicted class; negative values push against.
        """
        if self.xgb_model is None:
            raise RuntimeError("XGBoost model is not loaded")

        dmat = xgb.DMatrix(X_row, feature_names=self.feature_order)
        booster = self.xgb_model.get_booster()
        # Shape: (1, num_classes, num_features + 1)
        contribs = booster.predict(dmat, pred_contribs=True)

        class_contribs = contribs[0, predicted_class_idx, :-1]  # Exclude bias term at index -1
        assert len(class_contribs) == len(self.feature_order)

        # Sort features by absolute contribution magnitude descending
        indices = np.argsort(np.abs(class_contribs))[::-1][:8]

        top_features: list[FeatureContribution] = []
        for idx in indices:
            feat_name = self.feature_order[idx]
            val = raw_feature_vals.get(feat_name, "")
            top_features.append(
                FeatureContribution(
                    name=feat_name,
                    description=get_feature_description(feat_name),
                    raw_value=val,
                    contribution=float(class_contribs[idx]),
                )
            )

        return top_features


# Global singleton instance
model_registry = ModelRegistry()
