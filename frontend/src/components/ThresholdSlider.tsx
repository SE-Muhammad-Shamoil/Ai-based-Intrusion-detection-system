"use client";

import React from "react";
import { SlidersHorizontal, RotateCcw, Info } from "lucide-react";

interface ThresholdSliderProps {
  threshold: number;
  onThresholdChange: (newThreshold: number) => void;
}

export default function ThresholdSlider({
  threshold,
  onThresholdChange,
}: ThresholdSliderProps) {
  return (
    <div className="glass-panel p-4 sm:p-5 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <SlidersHorizontal className="w-4 h-4 text-accent" />
            <h3 className="font-semibold text-primary text-sm sm:text-base">
              Binary Attack Threshold (Random Forest)
            </h3>
            <span className="px-2 py-0.5 rounded-lg bg-indigo-50 text-accent font-bold text-xs border border-indigo-200">
              {threshold.toFixed(2)}
            </span>
          </div>
          <p className="text-xs text-secondary max-w-xl flex items-start space-x-1.5">
            <Info className="w-3.5 h-3.5 text-muted flex-shrink-0 mt-0.5" />
            <span>
              <strong>Trade-off:</strong> Lowering the threshold catches more stealthy intrusions (lower miss rate)
              at the cost of higher false alarms. Raising it reduces false alarms but risks missing intrusions.
            </span>
          </p>
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <input
            type="range"
            min="0.05"
            max="0.95"
            step="0.05"
            value={threshold}
            onChange={(e) => onThresholdChange(parseFloat(e.target.value))}
            className="w-full sm:w-48 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-accent"
            aria-label="Binary attack classification threshold slider"
          />

          {threshold !== 0.5 && (
            <button
              onClick={() => onThresholdChange(0.5)}
              className="p-1.5 rounded-lg bg-white/70 hover:bg-white text-muted hover:text-primary border border-slate-200 shadow-sm transition-colors text-xs flex items-center space-x-1"
              title="Reset threshold to default (0.50)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
