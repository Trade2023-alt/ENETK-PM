"use client";

import React, { useState } from "react";
import MTOForm from "../../components/MTOForm";
import ChatWidget from "../../components/ChatWidget";

export default function EstimatePage() {
  const [selectedProjectId, setSelectedProjectId] = useState("");

  return (
    <main className="min-h-screen p-8 relative pb-32">
      <div className="relative z-10 max-w-7xl mx-auto flex flex-col gap-12">
        <header className="flex justify-between items-center glass-panel p-6 rounded-2xl shadow-lg border border-slate-200">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-rose-900">
              Estimation <span className="text-rose-700">Pro</span>
            </h1>
            <p className="text-slate-600 mt-1 font-medium">Automation and Electrical Estimation Software</p>
          </div>
          <div className="flex gap-4">
            <button className="px-4 py-2 rounded-lg bg-white/70 hover:bg-white/90 text-rose-900 border border-rose-900/10 font-bold transition-all shadow-sm">
              Projects Dashboard
            </button>
            <button className="px-4 py-2 rounded-lg bg-rose-800 hover:bg-rose-700 text-white font-bold transition-all shadow-md">
              New Estimate
            </button>
          </div>
        </header>

        {/* Main Application Area */}
        <MTOForm onProjectChange={setSelectedProjectId} />
      </div>

      {/* Floating AI Chatbot */}
      <ChatWidget projectId={selectedProjectId} />
    </main>
  );
}
