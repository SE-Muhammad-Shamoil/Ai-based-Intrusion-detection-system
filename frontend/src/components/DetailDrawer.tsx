"use client";

import React, { useEffect, useState } from "react";
import { RowDetailResponse, ExplainResponse } from "@/lib/types";
import { fetchRowDetail, requestExplanation } from "@/lib/api";
import { getClassColor, ALL_CLASSES } from "@/lib/constants";
import {
  X,
  Sparkles,
  Info,
  Loader2,
  TrendingUp,
  TrendingDown,
  Cpu,
  FileSpreadsheet,
  CheckCircle,
} from "lucide-react";

interface DetailDrawerProps {
  sessionId: string;
  rowId: number | null;
  onClose: () => void;
  threshold: number;
}

export default function DetailDrawer({
  sessionId,
  rowId,
  onClose,
  threshold,
}: DetailDrawerProps) {
  const [detail, setDetail] = useState<RowDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [explanation, setExplanation] = useState<ExplainResponse | null>(null);
  const [isExplaining, setIsExplaining] = useState<boolean>(false);
  const [explainError, setExplainError] = useState<string | null>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Fetch row details whenever rowId changes
  useEffect(() => {
    if (rowId === null) {
      setDetail(null);
      setExplanation(null);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(null);
    setExplanation(null);
    setExplainError(null);

    fetchRowDetail(sessionId, rowId)
      .then((data) => {
        if (isMounted) setDetail(data);
      })
      .catch((err) => {
        if (isMounted) setError(err.message || "Failed to load flow details");
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [sessionId, rowId]);

  const handleExplain = async () => {
    if (rowId === null) return;
    setIsExplaining(true);
    setExplainError(null);
    try {
      const exp = await requestExplanation(sessionId, rowId);
      setExplanation(exp);
    } catch (err: any) {
      setExplainError(err.message || "Failed to generate AI explanation");
    } finally {
      setIsExplaining(false);
    }
  };

  if (rowId === null) return null;

  const isRfAttack = detail ? detail.rf_attack_prob >= threshold : false;

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-slate-900/30 backdrop-blur-sm flex justify-end transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-title"
    >
      <div
        className="w-full sm:max-w-lg md:max-w-xl h-full bg-white/95 backdrop-blur-xl shadow-2xl border-l border-white/60 flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-white/60">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-md">
                Flow #{rowId}
              </span>
              <h2 id="drawer-title" className="text-lg font-bold text-primary">
                Detailed Flow Inspection
              </h2>
            </div>
            <p className="text-xs text-muted mt-0.5">
              Explainable model contributions and multiclass predictions
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-muted hover:text-primary hover:bg-slate-100 transition-colors"
            aria-label="Close drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center space-y-3 text-muted">
              <Loader2 className="w-8 h-8 animate-spin text-accent" />
              <p className="text-xs font-medium">Computing TreeSHAP feature contributions...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs space-y-2">
              <p className="font-semibold">Unable to load flow details</p>
              <p>{error}</p>
            </div>
          ) : detail ? (
            <>
              {/* Verdict Summary Card */}
              <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-secondary uppercase tracking-wider">
                    Model Verdicts
                  </span>
                  <span className="text-xs text-muted font-mono">
                    Binary RF Prob: {(detail.rf_attack_prob * 100).toFixed(1)}%
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-white border border-slate-200/70">
                    <span className="text-[11px] text-muted block mb-1">Random Forest</span>
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        isRfAttack
                          ? "bg-rose-100 text-rose-700 border border-rose-200"
                          : "bg-emerald-100 text-emerald-700 border border-emerald-200"
                      }`}
                    >
                      {isRfAttack ? "Attack" : "Normal"}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-white border border-slate-200/70">
                    <span className="text-[11px] text-muted block mb-1">XGBoost Class</span>
                    <div className="flex items-center space-x-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: getClassColor(detail.xgb_class) }}
                      />
                      <span className="font-bold text-primary text-xs truncate">
                        {detail.xgb_class}
                      </span>
                    </div>
                  </div>
                </div>

                {detail.true_attack_cat && (
                  <div className="text-xs text-secondary flex items-center space-x-1.5 pt-1 border-t border-slate-200/50">
                    <CheckCircle className="w-3.5 h-3.5 text-indigo-500" />
                    <span>
                      True Ground Truth:{" "}
                      <strong className="text-primary">{detail.true_attack_cat}</strong> (Label{" "}
                      {detail.true_label})
                    </span>
                  </div>
                )}
              </div>

              {/* 10-Class Probability Bars */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-primary uppercase tracking-wider">
                    10-Class Probabilities (XGBoost)
                  </h3>
                  <span className="text-[11px] text-muted">Sum = 100%</span>
                </div>

                <div className="space-y-1.5 p-3 rounded-2xl bg-white border border-slate-200/70">
                  {ALL_CLASSES.map((cls) => {
                    const prob = detail.xgb_probs[cls] || 0;
                    const percent = (prob * 100).toFixed(1);
                    const isTop = cls === detail.xgb_class;

                    return (
                      <div key={cls} className="space-y-0.5 text-xs">
                        <div className="flex justify-between items-center text-[11px]">
                          <div className="flex items-center space-x-1.5">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: getClassColor(cls) }}
                            />
                            <span className={isTop ? "font-bold text-primary" : "text-secondary"}>
                              {cls}
                            </span>
                          </div>
                          <span className={isTop ? "font-bold text-primary font-mono" : "text-muted font-mono"}>
                            {percent}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${percent}%`,
                              backgroundColor: getClassColor(cls),
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Top 8 TreeSHAP Contributions */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center space-x-1.5">
                      <Cpu className="w-3.5 h-3.5 text-accent" />
                      <span>Top 8 Feature Contributions (TreeSHAP)</span>
                    </h3>
                    <p className="text-[11px] text-muted mt-0.5">
                      Log-odds margin influence toward predicted class ({detail.xgb_class})
                    </p>
                  </div>
                </div>

                <div className="space-y-2 p-3.5 rounded-2xl bg-white border border-slate-200/70">
                  {detail.top_features.map((feat) => {
                    const isPositive = feat.contribution >= 0;
                    const absVal = Math.abs(feat.contribution);

                    return (
                      <div key={feat.name} className="p-2.5 rounded-xl bg-slate-50/60 border border-slate-100 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center space-x-1.5">
                            {isPositive ? (
                              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
                            )}
                            <strong className="text-primary font-mono">{feat.name}</strong>
                            <span className="text-muted text-[11px]">
                              = <code className="text-primary font-semibold">{String(feat.raw_value)}</code>
                            </span>
                          </div>

                          <span
                            className={`font-mono text-xs font-bold ${
                              isPositive ? "text-emerald-600" : "text-rose-600"
                            }`}
                          >
                            {feat.contribution > 0 ? "+" : ""}
                            {feat.contribution.toFixed(4)}
                          </span>
                        </div>

                        {/* Description tooltip text */}
                        {feat.description && (
                          <p className="text-[11px] text-secondary leading-snug">
                            {feat.description}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Key Raw Feature Values */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center space-x-1.5">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-muted" />
                  <span>Key Raw Flow Values</span>
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 rounded-2xl bg-white border border-slate-200/70 text-xs">
                  {["proto", "service", "state", "dur", "sbytes", "dbytes", "sttl", "dttl", "rate"].map(
                    (key) => (
                      <div key={key} className="p-2 rounded-lg bg-slate-50/80">
                        <span className="text-[10px] text-muted uppercase font-mono block">
                          {key}
                        </span>
                        <span className="font-semibold text-primary truncate block font-mono text-[11px]">
                          {detail.raw_features[key] !== undefined
                            ? String(detail.raw_features[key])
                            : "—"}
                        </span>
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* Explain with AI Button & Output */}
              <div className="pt-2">
                {!explanation && !isExplaining && (
                  <button
                    onClick={handleExplain}
                    className="w-full py-3 px-4 rounded-2xl bg-accent hover:bg-accent-hover text-white font-semibold text-xs sm:text-sm flex items-center justify-center space-x-2 shadow-lg shadow-accent/20 transition-all active:scale-98"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Explain with AI</span>
                  </button>
                )}

                {isExplaining && (
                  <div className="p-6 rounded-2xl bg-indigo-50/70 border border-indigo-200/70 flex flex-col items-center justify-center space-y-2 text-center">
                    <Loader2 className="w-6 h-6 animate-spin text-accent" />
                    <p className="text-xs font-semibold text-primary">Generating AI Analyst Note...</p>
                    <p className="text-[11px] text-muted">
                      Synthesizing evidence, confidence margins, and TreeSHAP influence
                    </p>
                  </div>
                )}

                {explainError && (
                  <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                    {explainError}
                  </div>
                )}

                {explanation && (
                  <div className="rounded-2xl border border-indigo-200/80 bg-indigo-50/30 p-4 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-indigo-100">
                      <div className="flex items-center space-x-1.5">
                        <Sparkles className="w-4 h-4 text-accent" />
                        <span className="text-xs font-bold text-primary">
                          AI Summary of Model Evidence
                        </span>
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white text-secondary border border-indigo-200">
                        {explanation.source === "llm" ? "Claude" : "Analyst Template"}
                      </span>
                    </div>

                    {explanation.source === "template" && (
                      <p className="text-[11px] text-amber-800 bg-amber-50/80 px-2.5 py-1 rounded-lg border border-amber-200/60 flex items-center space-x-1">
                        <Info className="w-3 h-3 text-amber-600 flex-shrink-0" />
                        <span>AI API unconfigured or unavailable; using deterministic analyst template.</span>
                      </p>
                    )}

                    <div className="text-xs sm:text-sm text-secondary space-y-3 leading-relaxed whitespace-pre-line font-normal">
                      {explanation.explanation}
                    </div>

                    <div className="pt-2 border-t border-indigo-100/60 text-[11px] text-muted italic">
                      {explanation.disclaimer}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
