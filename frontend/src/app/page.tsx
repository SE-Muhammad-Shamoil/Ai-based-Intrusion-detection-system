"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  checkHealth,
  fetchMeta,
  predictFile,
  predictSample,
  ApiRequestError,
} from "@/lib/api";
import { PredictResponse } from "@/lib/types";

import Header from "@/components/Header";
import Hero from "@/components/Hero";
import UploadZone from "@/components/UploadZone";
import SummaryCards from "@/components/SummaryCards";
import PredictedTypeChart from "@/components/PredictedTypeChart";
import ThresholdSlider from "@/components/ThresholdSlider";
import ResultsTable from "@/components/ResultsTable";
import DetailDrawer from "@/components/DetailDrawer";
import ModelPerformance from "@/components/ModelPerformance";
import Footer from "@/components/Footer";

import { AlertOctagon, Terminal, Sparkles, RefreshCw } from "lucide-react";

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [predictionData, setPredictionData] = useState<PredictResponse | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Client-tunable threshold for Random Forest verdicts (default 0.50)
  const [threshold, setThreshold] = useState<number>(0.5);

  // Selected row for Detail Drawer
  const [selectedRowId, setSelectedRowId] = useState<number | null>(null);

  // Health query
  const { data: healthData, isError: isHealthError, refetch: refetchHealth } = useQuery({
    queryKey: ["health"],
    queryFn: checkHealth,
    refetchInterval: 15000,
  });

  // Metadata query (metrics, classes, descriptions)
  const { data: metaData } = useQuery({
    queryKey: ["meta"],
    queryFn: fetchMeta,
    enabled: !isHealthError,
  });

  // File upload handler
  const handleFileSelected = async (file: File) => {
    setSelectedFile(file);
    setIsProcessing(true);
    setUploadError(null);

    try {
      const result = await predictFile(file);
      setPredictionData(result);
      setSelectedRowId(null);
    } catch (err: any) {
      setUploadError(err.message || "Failed to analyze uploaded network flows.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Sample flows handler
  const handleSampleClick = async () => {
    setSelectedFile(null);
    setIsProcessing(true);
    setUploadError(null);

    try {
      const result = await predictSample();
      setPredictionData(result);
      setSelectedRowId(null);
    } catch (err: any) {
      setUploadError(err.message || "Failed to load sample dataset flows.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRetry = () => {
    if (selectedFile) {
      handleFileSelected(selectedFile);
    } else {
      handleSampleClick();
    }
  };

  const scrollToUpload = () => {
    const el = document.getElementById("upload-zone");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* 1. Header */}
      <Header isBackendHealthy={isHealthError ? false : healthData ? true : null} />

      {/* Backend Unreachable Notice Banner */}
      {isHealthError && (
        <div className="bg-rose-50 border-b border-rose-200 px-4 py-3 text-xs sm:text-sm text-rose-900">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center space-x-2">
              <AlertOctagon className="w-5 h-5 text-rose-600 flex-shrink-0" />
              <div>
                <strong className="font-semibold">Backend Unreachable:</strong> The FastAPI server is
                not responding at{" "}
                <code className="font-mono bg-rose-100 px-1 py-0.5 rounded text-rose-800">
                  {process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}
                </code>
                . Please launch the backend to run live predictions.
              </div>
            </div>

            <div className="flex items-center space-x-2 flex-shrink-0">
              <button
                onClick={() => refetchHealth()}
                className="px-3 py-1.5 rounded-lg bg-rose-600 text-white font-medium hover:bg-rose-700 flex items-center space-x-1 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Connection</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 pb-16">
        {/* 2. Hero Section */}
        <Hero
          onUploadClick={scrollToUpload}
          onSampleClick={handleSampleClick}
          isProcessing={isProcessing}
        />

        {/* 3. Upload Zone */}
        <UploadZone
          onFileSelected={handleFileSelected}
          isProcessing={isProcessing}
          selectedFile={selectedFile}
          error={uploadError}
          onRetry={handleRetry}
        />

        {/* If results exist, display summary, distribution chart, threshold slider, and table */}
        {predictionData ? (
          <div className="space-y-4">
            {/* 4. Summary Cards */}
            <SummaryCards summary={predictionData.summary} />

            {/* 5. Predicted-Type Chart */}
            <PredictedTypeChart
              countsPerClass={predictionData.summary.counts_per_class}
              totalRows={predictionData.summary.n_rows}
            />

            <div className="max-w-6xl mx-auto px-4 sm:px-6">
              {/* 7. Threshold Slider */}
              <ThresholdSlider
                threshold={threshold}
                onThresholdChange={setThreshold}
              />

              {/* 6. Results Table */}
              <ResultsTable
                rows={predictionData.rows}
                hasLabels={predictionData.summary.has_labels}
                threshold={threshold}
                onSelectRow={setSelectedRowId}
                selectedRowId={selectedRowId}
              />
            </div>
          </div>
        ) : (
          /* Empty State */
          <div className="max-w-xl mx-auto px-4 my-8 text-center">
            <div className="p-8 rounded-3xl bg-white/50 border border-slate-200/60 backdrop-blur-sm space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-accent flex items-center justify-center mx-auto">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-primary text-base sm:text-lg">No Flow Data Loaded</h3>
              <p className="text-xs sm:text-sm text-secondary leading-relaxed">
                Upload a network flows file above or click{" "}
                <button
                  onClick={handleSampleClick}
                  className="text-accent underline font-semibold hover:text-accent-hover"
                >
                  Try sample flows
                </button>{" "}
                to populate model verdicts, interactive distributions, and TreeSHAP evidence.
              </p>
            </div>
          </div>
        )}

        {/* 9. Model Performance Section */}
        <ModelPerformance meta={metaData || null} />
      </main>

      {/* 8. Detail Drawer (opens when a row is selected) */}
      {predictionData && (
        <DetailDrawer
          sessionId={predictionData.session_id}
          rowId={selectedRowId}
          onClose={() => setSelectedRowId(null)}
          threshold={threshold}
        />
      )}

      {/* 10. Footer */}
      <Footer />
    </div>
  );
}
