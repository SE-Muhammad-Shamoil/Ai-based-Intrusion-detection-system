"use client";

import React, { useState, useMemo } from "react";
import { PredictRow } from "@/lib/types";
import { getClassColor, ALL_CLASSES } from "@/lib/constants";
import {
  Search,
  CheckCircle2,
  AlertCircle,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronRightSquare,
  AlertTriangle,
} from "lucide-react";

interface ResultsTableProps {
  rows: PredictRow[];
  hasLabels: boolean;
  threshold: number;
  onSelectRow: (rowId: number) => void;
  selectedRowId: number | null;
}

type FilterType = "all" | "attacks" | "normal" | "mismatches";

export default function ResultsTable({
  rows,
  hasLabels,
  threshold,
  onSelectRow,
  selectedRowId,
}: ResultsTableProps) {
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [classFilter, setClassFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc" | "none">("desc");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const rowsPerPage = 25;

  // Filter and sort rows
  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const isRfAttack = row.rf_attack_prob >= threshold;

      // Segmented filter
      if (filterType === "attacks" && !isRfAttack) return false;
      if (filterType === "normal" && isRfAttack) return false;
      if (filterType === "mismatches" && hasLabels) {
        if (row.true_attack_cat && row.true_attack_cat.toLowerCase() === row.xgb_class.toLowerCase()) {
          return false;
        }
      }

      // Class dropdown filter
      if (classFilter !== "all" && row.xgb_class !== classFilter) {
        return false;
      }

      // Search by row ID
      if (searchQuery.trim() !== "") {
        const query = searchQuery.trim().replace(/^#/, "");
        if (String(row.row_id).indexOf(query) === -1) {
          return false;
        }
      }

      return true;
    });
  }, [rows, threshold, filterType, classFilter, searchQuery, hasLabels]);

  const sortedRows = useMemo(() => {
    if (sortOrder === "none") return filteredRows;
    return [...filteredRows].sort((a, b) => {
      if (sortOrder === "desc") {
        return b.rf_attack_prob - a.rf_attack_prob;
      }
      return a.rf_attack_prob - b.rf_attack_prob;
    });
  }, [filteredRows, sortOrder]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedRows.length / rowsPerPage));
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return sortedRows.slice(start, start + rowsPerPage);
  }, [sortedRows, currentPage]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  return (
    <div className="glass-panel p-5 sm:p-6 mb-8 overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-primary tracking-tight">
            Network Flow Verdicts &amp; Results
          </h2>
          <p className="text-xs sm:text-sm text-secondary mt-0.5">
            Click any row to inspect deep TreeSHAP feature contributions and request an AI explanation
          </p>
        </div>

        {/* Search by row number */}
        <div className="relative w-full md:w-56">
          <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search row #..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200/90 bg-white/70 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
          />
        </div>
      </div>

      {/* Filter and sorting controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        {/* Segmented Filter */}
        <div className="flex items-center space-x-1 p-1 rounded-xl bg-slate-200/60 border border-slate-300/40 text-xs font-medium">
          <button
            onClick={() => {
              setFilterType("all");
              setCurrentPage(1);
            }}
            className={`px-3 py-1 rounded-lg transition-all ${
              filterType === "all"
                ? "bg-white text-primary shadow-sm font-semibold"
                : "text-secondary hover:text-primary"
            }`}
          >
            All ({rows.length})
          </button>
          <button
            onClick={() => {
              setFilterType("attacks");
              setCurrentPage(1);
            }}
            className={`px-3 py-1 rounded-lg transition-all ${
              filterType === "attacks"
                ? "bg-white text-rose-600 shadow-sm font-semibold"
                : "text-secondary hover:text-primary"
            }`}
          >
            Attacks ({rows.filter((r) => r.rf_attack_prob >= threshold).length})
          </button>
          <button
            onClick={() => {
              setFilterType("normal");
              setCurrentPage(1);
            }}
            className={`px-3 py-1 rounded-lg transition-all ${
              filterType === "normal"
                ? "bg-white text-emerald-600 shadow-sm font-semibold"
                : "text-secondary hover:text-primary"
            }`}
          >
            Normal ({rows.filter((r) => r.rf_attack_prob < threshold).length})
          </button>
          {hasLabels && (
            <button
              onClick={() => {
                setFilterType("mismatches");
                setCurrentPage(1);
              }}
              className={`px-3 py-1 rounded-lg transition-all ${
                filterType === "mismatches"
                  ? "bg-white text-amber-700 shadow-sm font-semibold"
                  : "text-secondary hover:text-primary"
              }`}
            >
              Mismatches
            </button>
          )}
        </div>

        <div className="flex items-center space-x-3 text-xs">
          {/* Class filter dropdown */}
          <select
            value={classFilter}
            onChange={(e) => {
              setClassFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white/70 text-secondary focus:outline-none focus:ring-1 focus:ring-accent"
          >
            <option value="all">All Threat Classes</option>
            {ALL_CLASSES.map((cls) => (
              <option key={cls} value={cls}>
                {cls}
              </option>
            ))}
          </select>

          {/* Sort button */}
          <button
            onClick={() => {
              setSortOrder((prev) => (prev === "desc" ? "asc" : prev === "asc" ? "none" : "desc"));
            }}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white/70 text-secondary hover:text-primary flex items-center space-x-1.5 transition-colors"
            title="Sort by attack probability"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>
              Prob: {sortOrder === "desc" ? "High-to-Low" : sortOrder === "asc" ? "Low-to-High" : "Original"}
            </span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200/70 bg-white/60">
        <table className="w-full text-left text-xs sm:text-sm border-collapse">
          <thead>
            <tr className="border-b border-slate-200/80 bg-slate-50/60 text-secondary font-semibold">
              <th className="py-3 px-3 sm:px-4 w-16">Row #</th>
              <th className="py-3 px-3 sm:px-4">Verdict (RF)</th>
              <th className="py-3 px-3 sm:px-4">Predicted Type (XGBoost)</th>
              <th className="py-3 px-3 sm:px-4">Attack Probability</th>
              {hasLabels && <th className="py-3 px-3 sm:px-4">Actual Ground Truth</th>}
              <th className="py-3 px-3 sm:px-4 text-right w-16">Detail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedRows.length === 0 ? (
              <tr>
                <td colSpan={hasLabels ? 6 : 5} className="py-10 text-center text-muted">
                  No matching network flows found.
                </td>
              </tr>
            ) : (
              paginatedRows.map((row) => {
                const isRfAttack = row.rf_attack_prob >= threshold;
                const isXgbAttack = row.xgb_class !== "Normal";
                const modelsDisagree = isRfAttack !== isXgbAttack;
                const isMatch =
                  row.true_attack_cat &&
                  row.true_attack_cat.toLowerCase() === row.xgb_class.toLowerCase();
                const isSelected = selectedRowId === row.row_id;

                return (
                  <tr
                    key={row.row_id}
                    onClick={() => onSelectRow(row.row_id)}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelectRow(row.row_id);
                      }
                    }}
                    className={`cursor-pointer transition-colors hover:bg-indigo-50/40 ${
                      isSelected ? "bg-indigo-50/70 font-medium" : ""
                    }`}
                  >
                    {/* Row # */}
                    <td className="py-3 px-3 sm:px-4 text-muted font-mono text-xs">
                      #{row.row_id}
                    </td>

                    {/* Verdict */}
                    <td className="py-3 px-3 sm:px-4">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            isRfAttack
                              ? "bg-rose-100 text-rose-700 border border-rose-200"
                              : "bg-emerald-100 text-emerald-700 border border-emerald-200"
                          }`}
                        >
                          {isRfAttack ? "Attack" : "Normal"}
                        </span>

                        {modelsDisagree && (
                          <span
                            className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-medium"
                            title="Random Forest and XGBoost make contrasting benign/attack calls"
                          >
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            <span>Models disagree</span>
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Predicted Type */}
                    <td className="py-3 px-3 sm:px-4">
                      <div className="flex items-center space-x-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: getClassColor(row.xgb_class) }}
                        />
                        <span className="font-semibold text-primary">{row.xgb_class}</span>
                        <span className="text-xs text-muted">
                          ({(row.xgb_confidence * 100).toFixed(1)}%)
                        </span>
                      </div>
                    </td>

                    {/* Attack Probability Meter */}
                    <td className="py-3 px-3 sm:px-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-20 sm:w-28 bg-slate-200/80 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              row.rf_attack_prob >= 0.5 ? "bg-rose-500" : "bg-emerald-500"
                            }`}
                            style={{ width: `${Math.min(100, row.rf_attack_prob * 100)}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono text-secondary w-12 text-right">
                          {(row.rf_attack_prob * 100).toFixed(1)}%
                        </span>
                      </div>
                    </td>

                    {/* Actual Ground Truth (if available) */}
                    {hasLabels && (
                      <td className="py-3 px-3 sm:px-4">
                        <div className="flex items-center space-x-1.5">
                          {isMatch ? (
                            <span title="Model matches ground truth">
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            </span>
                          ) : (
                            <span title="Model differs from ground truth">
                              <AlertCircle className="w-4 h-4 text-amber-500" />
                            </span>
                          )}
                          <span className="text-secondary font-medium">
                            {row.true_attack_cat || (row.true_label === 1 ? "Attack" : "Normal")}
                          </span>
                        </div>
                      </td>
                    )}

                    {/* Action Icon */}
                    <td className="py-3 px-3 sm:px-4 text-right">
                      <button
                        type="button"
                        className="p-1 rounded-lg hover:bg-slate-200/50 text-muted hover:text-accent transition-colors"
                        title="View flow contributions"
                      >
                        <ChevronRightSquare className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      <div className="flex items-center justify-between mt-4 px-1 text-xs text-secondary">
        <div>
          Showing {sortedRows.length > 0 ? (currentPage - 1) * rowsPerPage + 1 : 0} to{" "}
          {Math.min(currentPage * rowsPerPage, sortedRows.length)} of {sortedRows.length} flows
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-1.5 rounded-lg border border-slate-200 bg-white/70 hover:bg-white text-secondary disabled:opacity-40 disabled:pointer-events-none transition-colors"
            aria-label="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-medium text-primary">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded-lg border border-slate-200 bg-white/70 hover:bg-white text-secondary disabled:opacity-40 disabled:pointer-events-none transition-colors"
            aria-label="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
