"use client";

import React from "react";
import { Shield, BookOpen, AlertCircle } from "lucide-react";

export default function Footer() {
  return (
    <footer className="w-full border-t border-slate-200/80 bg-white/40 backdrop-blur-md mt-auto py-8 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto space-y-6 text-xs text-secondary">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-primary font-bold">
              <Shield className="w-4 h-4 text-accent" />
              <span>Demonstration Constraints &amp; Limitations</span>
            </div>
            <p className="leading-relaxed text-muted">
              NetSentinel is an educational demonstration designed for offline dataset analysis. It evaluates
              flows generated according to the 42-feature schema created by Argus and Bro-IDS. It is not an active
              packet capture engine, real-time sniffer, or drop-in production Intrusion Detection System.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-primary font-bold">
              <BookOpen className="w-4 h-4 text-accent" />
              <span>Dataset Attribution &amp; Credits</span>
            </div>
            <p className="leading-relaxed text-muted">
              Trained on the UNSW-NB15 benchmark dataset created by{" "}
              <strong>Nour Moustafa and Jill Slay</strong> (UNSW Canberra at the Australian Defence Force Academy).
              Features include flow records, content metrics, time-to-live attributes, and connection window dynamics.
            </p>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between text-muted text-[11px] gap-2">
          <div>&copy; NetSentinel Research Project &bull; Light Theme Glassmorphism Design System</div>
          <div>FastAPI Backend + Next.js App Router &bull; TreeSHAP Explainability</div>
        </div>
      </div>
    </footer>
  );
}
