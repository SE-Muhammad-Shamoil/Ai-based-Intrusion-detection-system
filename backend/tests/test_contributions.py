"""Tests for TreeSHAP contribution shape and extraction."""

import numpy as np
import pandas as pd
import pytest
import xgboost as xgb

from app.models import model_registry


@pytest.fixture(scope="module", autouse=True)
def load_models():
    if not model_registry.is_loaded:
        from app.config import settings
        model_registry.load_all(settings.ARTIFACTS_DIR)


def test_treeshap_raw_shape():
    """Assert TreeSHAP output shape is strictly (rows, classes, features + 1)."""
    assert model_registry.xgb_model is not None
    n_feats = len(model_registry.feature_order)
    n_classes = len(model_registry.classes)

    dummy = np.zeros((2, n_feats), dtype=np.float32)
    dmat = xgb.DMatrix(dummy, feature_names=model_registry.feature_order)
    booster = model_registry.xgb_model.get_booster()
    contribs = booster.predict(dmat, pred_contribs=True)

    assert contribs.shape == (2, n_classes, n_feats + 1)


def test_compute_row_contributions_top_8():
    """Verify compute_row_contributions returns exactly 8 sorted features."""
    sample_df = pd.read_csv("backend/artifacts/sample_flows.csv").head(1)
    from app.preprocessing import preprocess_dataframe
    prep_res, _ = preprocess_dataframe(
        sample_df,
        model_registry.feature_order,
        model_registry.categorical_cols,
        model_registry.encoder,
    )

    top_features = model_registry.compute_row_contributions(
        prep_res.X.iloc[[0]],
        predicted_class_idx=0,
        raw_feature_vals=prep_res.raw_features[0],
    )

    assert len(top_features) == 8
    # Assert contributions are sorted descending by absolute value
    abs_contribs = [abs(f.contribution) for f in top_features]
    assert abs_contribs == sorted(abs_contribs, reverse=True)
    # Check that descriptions and values are present
    assert all(f.name in model_registry.feature_order for f in top_features)
    assert all(isinstance(f.contribution, float) for f in top_features)
