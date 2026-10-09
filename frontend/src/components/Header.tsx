"use client";

import React from "react";
import { ShieldCheck, Github, Radio } from "lucide-react";

interface HeaderProps {
  isBackendHealthy: boolean | null;
}

export default function Header({ isBackendHealthy }: HeaderProps) {
  return (
    <header className="w-full border-b border-white/60 bg-white/40 backdrop-blur-md sticky top-0 z-30 transition-all">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-accent text-white flex items-center justify-center shadow-md shadow-accent/20">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg text-primary tracking-tight">NetSentinel</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20">
                UNSW-NB15 Demo
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Health indicator */}
          <div
            className="flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-medium border bg-white/70"
            title={
              isBackendHealthy === true
                ? "Backend is online and models are loaded"
                : isBackendHealthy === false
                ? "Backend is offline or unreachable"
                : "Checking backend status..."
            }
          >
            <Radio
              className={`w-3.5 h-3.5 ${
                isBackendHealthy === true
                  ? "text-emerald-500 animate-pulse"
                  : isBackendHealthy === false
                  ? "text-rose-500"
                  : "text-amber-500"
              }`}
            />
            <span className="hidden sm:inline text-secondary">
              {isBackendHealthy === true
                ? "API Active"
                : isBackendHealthy === false
                ? "API Offline"
                : "Checking..."}
            </span>
          </div>

          {/* GitHub link */}
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-secondary hover:text-primary hover:bg-white/60 rounded-xl transition-colors border border-transparent hover:border-white/80"
            aria-label="GitHub Repository"
          >
            <Github className="w-5 h-5" />
          </a>
        </div>
      </div>
    </header>
  );
}
