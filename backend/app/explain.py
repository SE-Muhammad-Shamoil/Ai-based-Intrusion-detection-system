"""Explanation generation and deterministic template fallback."""

import json
from typing import Any
import numpy as np

from .llm import get_llm_provider, rate_limiter
from .models import model_registry
from .schemas import ExplainResponse, FeatureContribution
from .sessions import SessionData


def build_evidence(session: SessionData, row_id: int) -> tuple[dict[str, Any], list[FeatureContribution]]:
    """Build compact evidence for a single row from server-side session data."""
    if row_id < 0 or row_id >= len(session.X):
        raise ValueError(f"Invalid row_id: {row_id}")

    pred_class = session.xgb_classes[row_id]
    pred_idx = session.xgb_class_indices[row_id]
    rf_prob = float(session.rf_attack_probs[row_id])
    xgb_probs_row = session.xgb_probs[row_id]

    # Top-3 class probabilities
    top3_indices = np.argsort(xgb_probs_row)[::-1][:3]
    top_3_probabilities = [
        {"class": model_registry.classes[idx], "prob": round(float(xgb_probs_row[idx]), 4)}
        for idx in top3_indices
    ]

    # Compute top 8 TreeSHAP contributions
    X_row = session.X.iloc[[row_id]]
    raw_vals = session.raw_features[row_id]
    top_features = model_registry.compute_row_contributions(X_row, pred_idx, raw_vals)

    evidence = {
        "predicted_class": pred_class,
        "top_3_probabilities": top_3_probabilities,
        "binary_attack_probability": round(rf_prob, 4),
        "top_features": [
            {
                "name": feat.name,
                "description": feat.description or "network traffic feature",
                "value": feat.raw_value,
                "influence": round(feat.contribution, 4),
            }
            for feat in top_features
        ],
    }

    return evidence, top_features


def generate_template_explanation(evidence: dict[str, Any]) -> str:
    """Generate a high-quality deterministic fallback explanation matching section 9."""
    pred_class = evidence["predicted_class"]
    rf_prob = evidence["binary_attack_probability"]
    top3 = evidence["top_3_probabilities"]
    top_class_prob = top3[0]["prob"]
    second_class_prob = top3[1]["prob"] if len(top3) > 1 else 0.0
    second_class_name = top3[1]["class"] if len(top3) > 1 else "None"

    # Identify top pushing features (positive influence)
    pushing_feats = [f for f in evidence["top_features"] if f["influence"] > 0]
    pushing_summary = []
    for f in pushing_feats[:3]:
        pushing_summary.append(
            f"{f['name']} ({f['description']}) at {f['value']}"
        )
    features_str = ", and ".join(pushing_summary) if pushing_summary else "observed flow metrics"

    # Disagreement / confidence check
    prob_gap = top_class_prob - second_class_prob
    is_rf_attack = rf_prob >= 0.5
    is_xgb_attack = pred_class != "Normal"
    models_disagree = is_rf_attack != is_xgb_attack
    is_uncertain = prob_gap < 0.20 or models_disagree

    if pred_class == "Normal":
        what_flagged = f"This network connection was classified as **Normal traffic** by the multiclass detector, with a binary attack probability of {rf_prob * 100:.1f}%."
        why_thinks = f"The model determined the flow is consistent with routine activity, influenced primarily by {features_str}. These characteristics suggest standard communication behavior rather than malicious anomalies."
    else:
        what_flagged = f"This connection was flagged as **{pred_class}**, with an estimated attack probability of {rf_prob * 100:.1f}% from the binary classifier."
        why_thinks = f"The classification is consistent with known {pred_class} behavioral patterns, driven primarily by {features_str}. Positive log-odds contributions across these indicators suggest atypical traffic dynamics."

    if is_uncertain:
        reasons = []
        if models_disagree:
            reasons.append(f"the binary model ({rf_prob * 100:.1f}% attack probability) and multiclass model disagree")
        if prob_gap < 0.20:
            reasons.append(f"the margin between {pred_class} ({top_class_prob * 100:.1f}%) and {second_class_name} ({second_class_prob * 100:.1f}%) is narrow")
        how_sure = f"The call is uncertain because {'; '.join(reasons)}. Further verification is advised."
    else:
        how_sure = f"The model exhibits solid confidence in this verdict, assigning a {top_class_prob * 100:.1f}% class probability with clear separation from secondary candidates."

    # Practical next steps
    next_steps_map = {
        "Normal": "Review baseline traffic trends and verify destination service availability if unexpected volume was reported.",
        "Generic": "Examine payload patterns and inspect cryptographic block cipher handshakes for anomalous repeated blocks.",
        "Exploits": "Audit endpoint patch levels, inspect web application error logs, and verify whether target daemon crashes occurred.",
        "Fuzzers": "Check application input sanitization logs and watch for sudden spikes in malformed requests or memory exhaustion.",
        "DoS": "Analyze ingress bandwidth, monitor service response latency, and verify connection rate limits on perimeter devices.",
        "Reconnaissance": "Review other connection attempts from the same source address to detect systematic port sweeps or host discovery.",
        "Analysis": "Inspect server access logs for repeated HTTP status 40x/50x spikes, web vulnerability scans, or directory fuzzing.",
        "Backdoor": "Verify host process tables, inspect egress connections on listening ports, and check authentication logs.",
        "Shellcode": "Isolate the target endpoint, inspect memory dumps for injected shellcode payloads, and audit command execution histories.",
        "Worms": "Inspect peer-to-peer traffic across adjacent subnets for self-propagating probes and isolate suspect nodes immediately.",
    }
    next_step = next_steps_map.get(
        pred_class, "Review adjacent flows from the same source address and correlate with host event logs."
    )

    parts = [
        f"**What was flagged**\n{what_flagged}",
        f"**Why the model thinks so**\n{why_thinks}",
        f"**How sure it is**\n{how_sure}",
        f"**What to check next**\n{next_step}",
        "AI-generated summary of model evidence, not confirmed ground truth.",
    ]

    return "\n\n".join(parts)


def get_explanation(session: SessionData, row_id: int, client_ip: str = "127.0.0.1") -> ExplainResponse:
    """Generate or retrieve cached explanation for a specific session row."""
    # Check cache first
    if row_id in session.explanation_cache:
        return session.explanation_cache[row_id]

    evidence, _ = build_evidence(session, row_id)
    provider = get_llm_provider()

    if provider is not None and rate_limiter.is_allowed(client_ip):
        try:
            evidence_json = json.dumps(evidence)
            explanation_md = provider.generate(evidence_json)
            if explanation_md and len(explanation_md.strip()) > 20:
                resp = ExplainResponse(
                    explanation=explanation_md.strip(),
                    source="llm",
                )
                session.explanation_cache[row_id] = resp
                return resp
        except Exception:
            pass

    # Deterministic template fallback
    explanation_md = generate_template_explanation(evidence)
    resp = ExplainResponse(
        explanation=explanation_md,
        source="template",
    )
    session.explanation_cache[row_id] = resp
    return resp
