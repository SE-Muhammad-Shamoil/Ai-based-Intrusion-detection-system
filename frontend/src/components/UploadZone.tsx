"use client";

import React, { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud, FileText, AlertTriangle, RotateCw, Loader2, Database } from "lucide-react";

interface UploadZoneProps {
  onFileSelected: (file: File) => void;
  isProcessing: boolean;
  selectedFile: File | null;
  error: string | null;
  onRetry: () => void;
}

export default function UploadZone({
  onFileSelected,
  isProcessing,
  selectedFile,
  error,
  onRetry,
}: UploadZoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onFileSelected(acceptedFiles[0]);
      }
    },
    [onFileSelected]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.apache.parquet": [".parquet"],
      "application/octet-stream": [".parquet", ".csv"],
    },
    maxFiles: 1,
    disabled: isProcessing,
  });

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div id="upload-zone" className="max-w-3xl mx-auto px-4 mb-10">
      <div
        {...getRootProps()}
        className={`glass-panel p-8 sm:p-10 cursor-pointer border-2 border-dashed transition-all text-center relative overflow-hidden ${
          isDragActive
            ? "border-accent bg-accent/5 scale-[1.01]"
            : isDragReject
            ? "border-rose-400 bg-rose-50/20"
            : error
            ? "border-rose-300 bg-rose-50/10 hover:border-rose-400"
            : "border-slate-300/80 hover:border-accent hover:bg-white/80"
        } ${isProcessing ? "pointer-events-none cursor-wait" : ""}`}
      >
        <input {...getInputProps()} />

        {isProcessing ? (
          <div className="py-6 flex flex-col items-center justify-center space-y-4">
            <div className="relative">
              <Loader2 className="w-12 h-12 text-accent animate-spin" />
              <Database className="w-5 h-5 text-accent absolute inset-0 m-auto" />
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-primary text-base">Processing Network Flows</p>
              <p className="text-xs sm:text-sm text-secondary">
                Preprocessing features &bull; Evaluating Random Forest &bull; Computing XGBoost probabilities...
              </p>
            </div>
            {selectedFile && (
              <div className="inline-flex items-center space-x-2 text-xs text-muted px-3 py-1 bg-white/70 rounded-full border border-slate-200">
                <FileText className="w-3.5 h-3.5" />
                <span className="font-medium text-primary">{selectedFile.name}</span>
                <span>({formatFileSize(selectedFile.size)})</span>
              </div>
            )}
          </div>
        ) : error ? (
          <div className="py-4 flex flex-col items-center justify-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shadow-sm">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-1 max-w-md">
              <p className="font-semibold text-rose-900 text-sm sm:text-base">Upload or Processing Error</p>
              <p className="text-xs sm:text-sm text-rose-700 leading-relaxed">{error}</p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRetry();
              }}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-medium flex items-center space-x-2 shadow-sm transition-colors active:scale-95"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Retry upload</span>
            </button>
          </div>
        ) : (
          <div className="py-4 flex flex-col items-center justify-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 text-accent flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
              <UploadCloud className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <p className="font-semibold text-primary text-base sm:text-lg">
                Drag and drop your flow file here, or <span className="text-accent underline decoration-accent/40 underline-offset-4">browse</span>
              </p>
              <p className="text-xs sm:text-sm text-muted">
                Accepts <code className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-xs">.csv</code> and{" "}
                <code className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-xs">.parquet</code> up to 25 MB
              </p>
            </div>

            {selectedFile && (
              <div className="inline-flex items-center space-x-2 text-xs text-primary px-3 py-1.5 bg-white/80 rounded-full border border-slate-200 shadow-sm mt-2">
                <FileText className="w-3.5 h-3.5 text-accent" />
                <span className="font-medium">{selectedFile.name}</span>
                <span className="text-muted">({formatFileSize(selectedFile.size)})</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
