"""Preprocessing module for NetSentinel.

Implements the exact preprocessing contract matching training:
1. Read CSV or Parquet with pandas. Lowercase and strip all column names.
2. Drop these columns if present: id, srcip, dstip, stime, ltime.
   Set label and attack_cat aside (if present) for comparison only; never model inputs.
3. If attack_cat is empty and label is 0, treat it as Normal.
4. Check that every name in feature_order exists. If any are missing, raise MissingColumnsError (HTTP 422).
5. Convert categorical columns to stripped strings, then apply encoder.transform in categorical_cols order.
   Unseen values become -1.
6. Reorder columns to feature_order, cast to float32, and replace NaN or inf with 0.
7. Keep the raw (pre-encoding) values of each row for human-readable inspection.
"""

from dataclasses import dataclass
from typing import Any
import numpy as np
import pandas as pd
from sklearn.preprocessing import OrdinalEncoder

DROP_COLS = ["id", "srcip", "dstip", "stime", "ltime"]


class MissingColumnsError(Exception):
    """Raised when required feature columns are missing from the input."""

    def __init__(self, missing_columns: list[str]):
        self.missing_columns = missing_columns
        super().__init__(f"Missing required columns: {', '.join(missing_columns)}")


@dataclass
class PreprocessingResult:
    X: pd.DataFrame
    raw_features: list[dict[str, Any]]
    true_labels: list[int] | None
    true_attack_cats: list[str] | None
    has_labels: bool
    total_input_rows: int


def preprocess_dataframe(
    df: pd.DataFrame,
    feature_order: list[str],
    categorical_cols: list[str],
    encoder: OrdinalEncoder,
    max_rows: int | None = None,
) -> tuple[PreprocessingResult, bool]:
    """Preprocess a pandas DataFrame according to the contract.

    Args:
        df: Input DataFrame
        feature_order: Ordered list of feature names
        categorical_cols: List of categorical feature names
        encoder: Fitted OrdinalEncoder
        max_rows: Optional row truncation limit

    Returns:
        (PreprocessingResult, truncated_flag)
    """
    total_rows = len(df)
    truncated = False
    if max_rows is not None and total_rows > max_rows:
        df = df.iloc[:max_rows].copy()
        truncated = True
    else:
        df = df.copy()

    # 1. Lowercase and strip all column names
    df.columns = [str(c).strip().lower() for c in df.columns]

    # 2. Extract and set aside label and attack_cat if present
    true_labels: list[int] | None = None
    true_attack_cats: list[str] | None = None
    has_labels = False

    if "label" in df.columns:
        has_labels = True
        true_labels = [
            int(v) if pd.notna(v) and str(v).strip() != "" else 0
            for v in df["label"]
        ]

    if "attack_cat" in df.columns:
        has_labels = True
        # 3. If attack_cat is empty/NaN and label is 0, treat it as Normal
        cats: list[str] = []
        for idx, val in enumerate(df["attack_cat"]):
            s_val = str(val).strip() if pd.notna(val) else ""
            if s_val == "" or s_val.lower() == "nan":
                if true_labels is not None and true_labels[idx] == 0:
                    s_val = "Normal"
                else:
                    s_val = "Unknown"
            cats.append(s_val)
        true_attack_cats = cats
    elif true_labels is not None:
        # If label exists but attack_cat does not
        true_attack_cats = ["Attack" if lbl == 1 else "Normal" for lbl in true_labels]

    # Drop non-feature and label columns
    cols_to_drop = [c for c in DROP_COLS + ["label", "attack_cat"] if c in df.columns]
    df.drop(columns=cols_to_drop, inplace=True, errors="ignore")

    # 4. Check that every name in feature_order exists
    missing = [c for c in feature_order if c not in df.columns]
    if missing:
        raise MissingColumnsError(missing)

    # 7. Keep raw (pre-encoding) values for feature inspection
    raw_features_df = df[feature_order].copy()
    raw_features = raw_features_df.to_dict(orient="records")

    # 5. Convert categorical columns to stripped strings, then apply encoder.transform
    X = df[feature_order].copy()
    for col in categorical_cols:
        X[col] = X[col].astype(str).str.strip()

    # Transform categorical columns in categorical_cols order
    encoded_cats = encoder.transform(X[categorical_cols])
    X[categorical_cols] = encoded_cats

    # 6. Reorder columns to feature_order, cast to float32, replace NaN or inf with 0
    X = X[feature_order].astype(np.float32)
    X.replace([np.inf, -np.inf], np.nan, inplace=True)
    X.fillna(0.0, inplace=True)

    result = PreprocessingResult(
        X=X,
        raw_features=raw_features,
        true_labels=true_labels,
        true_attack_cats=true_attack_cats,
        has_labels=has_labels,
        total_input_rows=total_rows,
    )
    return result, truncated
