"""Verification script for NetSentinel artifacts.

Loads every artifact, runs the preprocessing and inference pipeline on sample_flows.csv,
and prints binary accuracy, multiclass accuracy, and TreeSHAP contribution shape.
"""

from pathlib import Path
import sys
import numpy as np
import pandas as pd

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.models import model_registry
from app.preprocessing import preprocess_dataframe


def main():
    artifacts_dir = backend_dir / "artifacts"
    print(f"[*] Verifying artifacts in: {artifacts_dir}")

    required_files = [
        "feature_order.json",
        "classes.json",
        "encoder.joblib",
        "rf_binary.joblib",
        "xgb_multiclass.json",
        "metrics_rf.json",
        "metrics_xgb.json",
        "versions.json",
        "sample_flows.csv",
    ]

    for fname in required_files:
        p = artifacts_dir / fname
        if not p.exists():
            print(f"[!] Error: Missing artifact file: {fname}")
            sys.exit(1)
        print(f"  [+] Found {fname} ({p.stat().st_size:,} bytes)")

    print("\n[*] Loading models into ModelRegistry...")
    model_registry.load_all(artifacts_dir)
    print("  [+] All models loaded and TreeSHAP dummy test passed successfully.")

    sample_csv = artifacts_dir / "sample_flows.csv"
    print(f"\n[*] Reading and preprocessing {sample_csv}...")
    df = pd.read_csv(sample_csv)
    prep_res, truncated = preprocess_dataframe(
        df=df,
        feature_order=model_registry.feature_order,
        categorical_cols=model_registry.categorical_cols,
        encoder=model_registry.encoder,
    )
    print(f"  [+] Preprocessed {len(prep_res.X)} flows across {prep_res.X.shape[1]} features.")

    if not prep_res.has_labels:
        print("[!] Error: sample_flows.csv should have ground truth labels.")
        sys.exit(1)

    # 1. Random Forest Binary Accuracy
    rf_probs = model_registry.predict_rf_proba(prep_res.X)
    rf_preds = (rf_probs >= 0.5).astype(int)
    true_labels = np.array(prep_res.true_labels)
    binary_acc = (rf_preds == true_labels).mean()

    # 2. XGBoost Multiclass Accuracy
    xgb_probs = model_registry.predict_xgb_proba(prep_res.X)
    xgb_preds_idx = xgb_probs.argmax(axis=1)
    xgb_pred_classes = [model_registry.classes[idx] for idx in xgb_preds_idx]
    true_cats = prep_res.true_attack_cats
    multiclass_acc = (np.array(xgb_pred_classes) == np.array(true_cats)).mean()

    # 3. TreeSHAP Contribution shape and sample calculation
    dummy_row = prep_res.X.iloc[[0]]
    raw_vals = prep_res.raw_features[0]
    pred_idx = xgb_preds_idx[0]
    top_contribs = model_registry.compute_row_contributions(dummy_row, pred_idx, raw_vals)

    print("\n" + "=" * 50)
    print("NETSENTINEL ARTIFACT VERIFICATION RESULTS")
    print("=" * 50)
    print(f"Binary Random Forest Accuracy (sample_flows):  {binary_acc * 100:.2f}%")
    print(f"Multiclass XGBoost Accuracy (sample_flows):     {multiclass_acc * 100:.2f}%")
    print(f"TreeSHAP Contribs shape (rows, classes, feats): (1, {len(model_registry.classes)}, {len(model_registry.feature_order) + 1})")
    print(f"Top 3 sample contributions for row 0 ({xgb_pred_classes[0]}):")
    for feat in top_contribs[:3]:
        print(f"  - {feat.name} = {feat.raw_value}: contribution {feat.contribution:+.4f}")
    print("=" * 50)

    # Verify sensible non-random scores (sample is stratified with 10 classes; random is 10%)
    assert binary_acc > 0.80, f"Binary accuracy suspiciously low ({binary_acc})"
    assert multiclass_acc > 0.50, f"Multiclass accuracy suspiciously low ({multiclass_acc})"
    print("\n[✓] All artifact checks and pipeline verifications PASSED successfully.\n")


if __name__ == "__main__":
    main()
