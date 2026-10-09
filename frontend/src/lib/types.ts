export interface MetaResponse {
  feature_order: string[];
  categorical_cols: string[];
  categories: Record<string, string[]>;
  classes: string[];
  class_descriptions: Record<string, string>;
  feature_descriptions: Record<string, string>;
  metrics_rf: {
    accuracy: number;
    precision_attack: number;
    recall_attack: number;
    f1_attack: number;
    roc_auc: number;
    pr_auc: number;
    false_alarm_rate: number;
    miss_rate: number;
    train_seconds?: number;
    inference_seconds_per_1000_flows?: number;
    by_attack_type?: Array<{
      attack_cat: string;
      share_flagged_as_attack: number;
      n_flows: number;
    }>;
  };
  metrics_xgb: {
    accuracy: number;
    macro_f1: number;
    weighted_f1: number;
    recall_per_class: Record<string, number>;
    classification_report?: Record<string, any>;
    confusion_matrix: number[][];
    train_seconds?: number;
    inference_seconds_per_1000_flows?: number;
    best_iteration?: number;
  };
  versions: Record<string, string>;
  limits: {
    max_upload_mb: number;
    max_rows: number;
  };
  llm_enabled: boolean;
}

export interface PredictRow {
  row_id: number;
  rf_attack_prob: number;
  xgb_class: string;
  xgb_confidence: number;
  xgb_probs: Record<string, number>;
  true_label?: number | null;
  true_attack_cat?: string | null;
}

export interface PredictSummary {
  n_rows: number;
  n_flagged: number;
  attack_rate: number;
  counts_per_class: Record<string, number>;
  processing_ms: number;
  has_labels: boolean;
  truncated: boolean;
}

export interface PredictResponse {
  session_id: string;
  summary: PredictSummary;
  rows: PredictRow[];
}

export interface FeatureContribution {
  name: string;
  description: string | null;
  raw_value: any;
  contribution: number;
}

export interface RowDetailResponse {
  row_id: number;
  rf_attack_prob: number;
  rf_verdict: string;
  xgb_class: string;
  xgb_confidence: number;
  xgb_probs: Record<string, number>;
  true_label?: number | null;
  true_attack_cat?: string | null;
  raw_features: Record<string, any>;
  top_features: FeatureContribution[];
}

export interface ExplainResponse {
  explanation: string;
  source: "llm" | "template";
  disclaimer: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}
