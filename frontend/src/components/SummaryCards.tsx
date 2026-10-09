"use client";

import React from "react";
import { PredictSummary } from "@/lib/types";
import { ShieldAlert, Activity, Percent, Clock, AlertTriangle } from "lucide-react";
import { getClassColor } from "@/lib/constants";

interface SummaryCardsProps {
  summary: PredictSummary;
}

export default function SummaryCards({ summary }: SummaryCardsProps) {
  // Determine most common predicted attack type (excluding Normal if attacks exist)
  let topAttackType = "Normal";
  let maxCount = -1;

  for (const [cls, count] of Object.entries(summary.counts_per_class)) {
    if (cls !== "Normal" && count > maxCount) {
      maxCount = count;
      topAttackType = cls;
    }
  }

  // If no attacks detected at all
  if (maxCount <= 0 && summary.counts_per_class["Normal"]) {
    topAttackType = "Normal (No Attacks)";
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 mb-8">
      {/* Truncated notice chip if applicable */}
      {summary.truncated && (
        <div className="mb-4 inline-flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium shadow-sm">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <span>Notice: Dataset exceeded maximum row limit. Processed first {summary.n_rows.toLocaleString()} flows.</span>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Total Flows */}
        <div className="glass-card p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted mb-2">
            <span className="text-xs font-semibold tracking-wider uppercase">Total Flows</span>
            <Activity className="w-4 h-4 text-slate-400" />
          </div>
          <div>
            <span className="text-2xl sm:text-3xl font-extrabold text-primary tracking-tight">
              {summary.n_rows.toLocaleString()}
            </span>
            <span className="text-xs text-muted block mt-0.5">evaluated records</span>
          </div>
        </div>

        {/* Flagged as Attack */}
        <div className="glass-card p-4 sm:p-5 flex flex-col justify-between border-rose-100/60">
          <div className="flex items-center justify-between text-muted mb-2">
            <span className="text-xs font-semibold tracking-wider uppercase text-rose-700">Flagged Attacks</span>
            <ShieldAlert className="w-4 h-4 text-rose-500" />
          </div>
          <div>
            <span className="text-2xl sm:text-3xl font-extrabold text-rose-600 tracking-tight">
              {summary.n_flagged.toLocaleString()}
            </span>
            <span className="text-xs text-muted block mt-0.5">
              {(summary.n_rows - summary.n_flagged).toLocaleString()} normal
            </span>
          </div>
        </div>

        {/* Attack Rate */}
        <div className="glass-card p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted mb-2">
            <span className="text-xs font-semibold tracking-wider uppercase">Attack Rate</span>
            <Percent className="w-4 h-4 text-slate-400" />
          </div>
          <div>
            <span className="text-2xl sm:text-3xl font-extrabold text-primary tracking-tight">
              {(summary.attack_rate * 100).toFixed(1)}%
            </span>
            <span className="text-xs text-muted block mt-0.5">of total traffic</span>
          </div>
        </div>

        {/* Most Common Predicted Attack Type */}
        <div className="glass-card p-4 sm:p-5 flex flex-col justify-between col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-muted mb-2">
            <span className="text-xs font-semibold tracking-wider uppercase">Top Threat Class</span>
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: getClassColor(topAttackType.split(" ")[0]) }}
            />
          </div>
          <div>
            <span className="text-xl sm:text-2xl font-bold text-primary truncate block tracking-tight">
              {topAttackType}
            </span>
            <span className="text-xs text-muted block mt-0.5">
              {maxCount > 0 ? `${maxCount.toLocaleString()} detections` : "traffic benign"}
            </span>
          </div>
        </div>

        {/* Processing Time */}
        <div className="glass-card p-4 sm:p-5 flex flex-col justify-between col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-muted mb-2">
            <span className="text-xs font-semibold tracking-wider uppercase">Latency</span>
            <Clock className="w-4 h-4 text-slate-400" />
          </div>
          <div>
            <span className="text-2xl sm:text-3xl font-extrabold text-primary tracking-tight">
              {summary.processing_ms.toFixed(0)}
              <span className="text-sm font-medium text-muted ml-1">ms</span>
            </span>
            <span className="text-xs text-muted block mt-0.5">dual-model inference</span>
          </div>
        </div>
      </div>
    </div>
  );
}
