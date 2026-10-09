"use client";

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { getClassColor, ALL_CLASSES } from "@/lib/constants";

interface PredictedTypeChartProps {
  countsPerClass: Record<string, number>;
  totalRows: number;
}

export default function PredictedTypeChart({
  countsPerClass,
  totalRows,
}: PredictedTypeChartProps) {
  // Format data for Recharts, sorted by count descending
  const data = ALL_CLASSES.map((cls) => {
    const count = countsPerClass[cls] || 0;
    const percentage = totalRows > 0 ? (count / totalRows) * 100 : 0;
    return {
      name: cls,
      count,
      percentage: Number(percentage.toFixed(1)),
      color: getClassColor(cls),
    };
  }).sort((a, b) => b.count - a.count);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 mb-8">
      <div className="glass-panel p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-primary tracking-tight">
              Predicted Flow Distribution (XGBoost 10-Class)
            </h2>
            <p className="text-xs sm:text-sm text-secondary mt-0.5">
              Breakdown of flows classified into Normal and 9 UNSW-NB15 threat categories
            </p>
          </div>
          <div className="mt-2 sm:mt-0 text-xs font-medium text-muted bg-white/60 px-3 py-1 rounded-full border border-slate-200">
            Total Flows: {totalRows.toLocaleString()}
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 75, bottom: 5 }}
            >
              <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#64748B" }} />
              <YAxis
                type="category"
                dataKey="name"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 13, fontWeight: 500, fill: "#0F172A" }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload;
                    return (
                      <div className="bg-white/95 backdrop-blur-md p-3 rounded-xl shadow-lg border border-slate-200/80 text-xs space-y-1">
                        <div className="flex items-center space-x-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="font-bold text-primary text-sm">{item.name}</span>
                        </div>
                        <p className="text-secondary">
                          Count: <strong className="text-primary">{item.count.toLocaleString()}</strong> flows
                        </p>
                        <p className="text-secondary">
                          Share: <strong className="text-primary">{item.percentage}%</strong> of total
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
