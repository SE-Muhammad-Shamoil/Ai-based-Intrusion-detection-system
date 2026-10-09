"""Tests for preprocessing pipeline parity."""

import numpy as np
import pandas as pd
import pytest

from app.models import model_registry
from app.preprocessing import MissingColumnsError, preprocess_dataframe


@pytest.fixture(scope="module", autouse=True)
def load_models():
    if not model_registry.is_loaded:
        from app.config import settings
        model_registry.load_all(settings.ARTIFACTS_DIR)


def test_preprocessing_feature_order_and_types():
    """Verify that output DataFrame columns exactly match feature_order and are float32."""
    sample_df = pd.read_csv("backend/artifacts/sample_flows.csv").head(10)
    prep_res, truncated = preprocess_dataframe(
        df=sample_df,
        feature_order=model_registry.feature_order,
        categorical_cols=model_registry.categorical_cols,
        encoder=model_registry.encoder,
    )

    assert list(prep_res.X.columns) == model_registry.feature_order
    assert prep_res.X.dtypes.unique().tolist() == [np.dtype("float32")]
    assert len(prep_res.X) == 10
    assert not truncated
    assert prep_res.has_labels is True


def test_unseen_category_encodes_to_minus_one():
    """Verify that categorical values unseen during training become -1 without raising an error."""
    sample_df = pd.read_csv("backend/artifacts/sample_flows.csv").head(5).copy()
    # Insert an unknown protocol and service
    sample_df["proto"] = "quantum_proto"
    sample_df["service"] = "alien_service"

    prep_res, _ = preprocess_dataframe(
        df=sample_df,
        feature_order=model_registry.feature_order,
        categorical_cols=model_registry.categorical_cols,
        encoder=model_registry.encoder,
    )

    # In X, proto and service should be encoded as -1.0
    assert (prep_res.X["proto"] == -1.0).all()
    assert (prep_res.X["service"] == -1.0).all()
    # In raw_features, the original text should be preserved
    assert prep_res.raw_features[0]["proto"] == "quantum_proto"
    assert prep_res.raw_features[0]["service"] == "alien_service"


def test_missing_column_raises_error():
    """Verify that missing a required feature column raises MissingColumnsError with missing column names."""
    sample_df = pd.read_csv("backend/artifacts/sample_flows.csv").head(5).copy()
    sample_df.drop(columns=["sttl", "rate"], inplace=True)

    with pytest.raises(MissingColumnsError) as exc_info:
        preprocess_dataframe(
            df=sample_df,
            feature_order=model_registry.feature_order,
            categorical_cols=model_registry.categorical_cols,
            encoder=model_registry.encoder,
        )

    assert "sttl" in exc_info.value.missing_columns
    assert "rate" in exc_info.value.missing_columns


def test_drop_columns_and_normal_label_handling():
    """Verify non-feature identifier columns are dropped and blank attack_cat with label 0 is Normal."""
    sample_df = pd.read_csv("backend/artifacts/sample_flows.csv").head(5).copy()
    sample_df["id"] = 123
    sample_df["srcip"] = "192.168.1.1"
    sample_df["dstip"] = "10.0.0.1"
    sample_df.loc[0, "attack_cat"] = np.nan
    sample_df.loc[0, "label"] = 0

    prep_res, _ = preprocess_dataframe(
        df=sample_df,
        feature_order=model_registry.feature_order,
        categorical_cols=model_registry.categorical_cols,
        encoder=model_registry.encoder,
    )

    assert "id" not in prep_res.X.columns
    assert "srcip" not in prep_res.X.columns
    assert prep_res.true_attack_cats[0] == "Normal"
