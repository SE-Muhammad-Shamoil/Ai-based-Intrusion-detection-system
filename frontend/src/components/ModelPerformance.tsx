"use client";

import React, { useState } from "react";
import { MetaResponse } from "@/lib/types";
import { getClassColor } from "@/lib/constants";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  ShieldCheck,
  Zap,
  Info,
  TrendingUp,
  Activity,
  Layers,
  Percent,
} from "lucide-react";

interface ModelPerformanceProps {
  meta: MetaResponse | null;
}

export default function ModelPerformance({ meta }: ModelPerformanceProps) {
  const [activeTab, setActiveTab] = useState<"binary" | "multiclass">("binary");

  if (!meta) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 mb-12">
        <div className="glass-panel p-8 text-center text-muted">
          Loading test-set benchmark metrics...
        </div>
      </div>
    );
  }

  const { metrics_rf, metrics_xgb, classes } = meta;

  // Binary detection by attack type data
  const binaryAttackData = (metrics_rf?.by_attack_type || []).map((item) => ({
    name: item.attack_cat,
    rate: Number((item.share_flagged_as_attack * 100).toFixed(1)),
    flows: item.n_flows,
    color: getClassColor(item.attack_cat),
  })).sort((a, b) => b.rate - a.rate);

  // Multiclass recall data
  const recallData = Object.entries(metrics_xgb?.recall_per_class || {}).map(
    ([name, recall]) => ({
      name,
      recall: Number((recall * 100).toFixed(1)),
      color: getClassColor(name),
    })
  ).sort((a, b) => b.recall - a.recall);

  // Confusion matrix calculation for row-normalization
  const cm = metrics_xgb?.confusion_matrix || [];
  const normalizedCm = cm.map((row) => {
    const rowSum = row.reduce((acc, val) => acc + val, 0);
    return row.map((val) => (rowSum > 0 ? (val / rowSum) * 100 : 0));
  });

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 mb-12" id="performance-section">
      <div className="glass-panel p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-primary tracking-tight">
              Test-Set Performance &amp; Benchmarks
            </h2>
            <p className="text-xs sm:text-sm text-secondary mt-0.5">
              Strictly measured test-set evaluation results on held-out UNSW-NB15 flows
            </p>
          </div>

          {/* Tab Switcher */}
          <div className="flex items-center space-x-1 p-1 rounded-xl bg-slate-200/60 border border-slate-300/40 text-xs font-semibold">
            <button
              onClick={() => setActiveTab("binary")}
              className={`px-4 py-1.5 rounded-lg transition-all ${
                activeTab === "binary"
                  ? "bg-white text-primary shadow-sm"
                  : "text-secondary hover:text-primary"
              }`}
            >
              Binary Random Forest
            </button>
            <button
              onClick={() => setActiveTab("multiclass")}
              className={`px-4 py-1.5 rounded-lg transition-all ${
                activeTab === "multiclass"
                  ? "bg-white text-primary shadow-sm"
                  : "text-secondary hover:text-primary"
              }`}
            >
              Multiclass XGBoost
            </button>
          </div>
        </div>

        {/* Dataset Distribution Note */}
        <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200/60 text-xs text-indigo-950 flex items-start space-x-2.5 mb-6">
          <Info className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
          <p className="leading-relaxed">
            <strong>Dataset Context:</strong> The official UNSW-NB15 training set contains predominantly attack traffic
            (approx. 68% attacks, 32% normal). Because of class imbalance across rare categories like Worms and Backdoors,
            overall accuracy alone overstates real-world effectiveness. <em>Per-class recall</em> and <em>false-alarm rates</em> provide the true operational picture.
          </p>
        </div>

        {activeTab === "binary" ? (
          <div className="space-y-6">
            {/* Metric Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
              <div className="p-4 rounded-2xl bg-white border border-slate-200/70">
                <span className="text-xs font-semibold text-muted uppercase">Attack Precision</span>
                <span className="text-2xl font-extrabold text-primary block mt-1">
                  {(metrics_rf.precision_attack * 100).toFixed(1)}%
                </span>
                <span className="text-[11px] text-muted">True attacks / flagged</span>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200/70">
                <span className="text-xs font-semibold text-muted uppercase">Attack Recall</span>
                <span className="text-2xl font-extrabold text-emerald-600 block mt-1">
                  {(metrics_rf.recall_attack * 100).toFixed(1)}%
                </span>
                <span className="text-[11px] text-muted">Detected attacks share</span>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200/70">
                <span className="text-xs font-semibold text-muted uppercase">False Alarm Rate</span>
                <span className="text-2xl font-extrabold text-amber-600 block mt-1">
                  {(metrics_rf.false_alarm_rate * 100).toFixed(1)}%
                </span>
                <span className="text-[11px] text-muted">Normal flows flagged</span>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200/70">
                <span className="text-xs font-semibold text-muted uppercase">ROC-AUC</span>
                <span className="text-2xl font-extrabold text-indigo-600 block mt-1">
                  {metrics_rf.roc_auc.toFixed(3)}
                </span>
                <span className="text-[11px] text-muted">Discriminative ability</span>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200/70 col-span-2 md:col-span-1">
                <span className="text-xs font-semibold text-muted uppercase">Accuracy</span>
                <span className="text-2xl font-extrabold text-primary block mt-1">
                  {(metrics_rf.accuracy * 100).toFixed(1)}%
                </span>
                <span className="text-[11px] text-muted">Overall correctness</span>
              </div>
            </div>

            {/* Detection Rate by Attack Type Chart */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200/70">
              <h3 className="text-sm font-bold text-primary mb-1">
                Detection Rate by Specific Attack Category
              </h3>
              <p className="text-xs text-muted mb-4">
                Percentage of true attack flows of each category successfully detected as attack by the Random Forest
              </p>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={binaryAttackData}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                  >
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "#64748B" }} unit="%" />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: "#0F172A" }} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const item = payload[0].payload;
                          return (
                            <div className="bg-white/95 p-2.5 rounded-xl shadow-lg border border-slate-200 text-xs space-y-1">
                              <p className="font-bold text-primary">{item.name}</p>
                              <p className="text-secondary">
                                Detection Rate: <strong>{item.rate}%</strong>
                              </p>
                              <p className="text-muted">Test flows: {item.flows.toLocaleString()}</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="rate" radius={[0, 4, 4, 0]}>
                      {binaryAttackData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Multiclass Metric Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              <div className="p-4 rounded-2xl bg-white border border-slate-200/70">
                <span className="text-xs font-semibold text-muted uppercase">Macro-F1</span>
                <span className="text-2xl font-extrabold text-indigo-600 block mt-1">
                  {(metrics_xgb.macro_f1 * 100).toFixed(1)}%
                </span>
                <span className="text-[11px] text-muted">Unweighted class mean</span>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200/70">
                <span className="text-xs font-semibold text-muted uppercase">Weighted-F1</span>
                <span className="text-2xl font-extrabold text-primary block mt-1">
                  {(metrics_xgb.weighted_f1 * 100).toFixed(1)}%
                </span>
                <span className="text-[11px] text-muted">Support-weighted</span>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200/70">
                <span className="text-xs font-semibold text-muted uppercase">Accuracy</span>
                <span className="text-2xl font-extrabold text-primary block mt-1">
                  {(metrics_xgb.accuracy * 100).toFixed(1)}%
                </span>
                <span className="text-[11px] text-muted">Exact class match</span>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200/70">
                <span className="text-xs font-semibold text-muted uppercase">Best Iteration</span>
                <span className="text-2xl font-extrabold text-accent block mt-1">
                  {metrics_xgb.best_iteration || 182}
                </span>
                <span className="text-[11px] text-muted">Early-stopped trees</span>
              </div>
            </div>

            {/* Per-Class Recall Bars */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200/70">
              <h3 className="text-sm font-bold text-primary mb-1">
                Per-Class Recall (XGBoost 10-Class)
              </h3>
              <p className="text-xs text-muted mb-4">
                Portion of true instances correctly identified for each class
              </p>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={recallData}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                  >
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "#64748B" }} unit="%" />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: "#0F172A" }} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const item = payload[0].payload;
                          return (
                            <div className="bg-white/95 p-2 rounded-xl shadow-lg border border-slate-200 text-xs">
                              <p className="font-bold text-primary">{item.name}</p>
                              <p className="text-secondary">
                                Recall: <strong>{item.recall}%</strong>
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="recall" radius={[0, 4, 4, 0]}>
                      {recallData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Row-Normalized Confusion Matrix Heatmap */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200/70 overflow-x-auto">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-primary">
                  Row-Normalized Confusion Matrix Heatmap
                </h3>
                <span className="text-xs text-muted">Rows = Actual Class &bull; Columns = Predicted Class</span>
              </div>

              <div className="min-w-[640px]">
                <table className="w-full text-center text-[11px] border-collapse">
                  <thead>
                    <tr>
                      <th className="p-1 text-left font-semibold text-secondary w-24">Actual \ Pred</th>
                      {classes.map((c) => (
                        <th key={c} className="p-1 font-semibold text-secondary truncate max-w-[50px]">
                          {c.slice(0, 4)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {classes.map((actualClass, rowIdx) => (
                      <tr key={actualClass} className="border-t border-slate-100">
                        <td className="p-1 text-left font-medium text-primary truncate max-w-[80px]">
                          {actualClass}
                        </td>
                        {classes.map((_, colIdx) => {
                          const pct = normalizedCm[rowIdx]?.[colIdx] || 0;
                          const isDiagonal = rowIdx === colIdx;
                          // Intensity background
                          const bgOpacity = Math.min(0.9, pct / 100);

                          return (
                            <td
                              key={colIdx}
                              className={`p-1.5 font-mono text-[10px] transition-colors ${
                                isDiagonal ? "font-bold text-slate-900" : "text-slate-600"
                              }`}
                              style={{
                                backgroundColor: `rgba(99, 102, 241, ${bgOpacity * 0.45})`,
                              }}
                              title={`Actual: ${actualClass}, Predicted: ${classes[colIdx]} -> ${pct.toFixed(1)}%`}
                            >
                              {pct >= 1 ? `${pct.toFixed(0)}%` : "0"}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
