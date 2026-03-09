"use client";

import { useState } from "react";
import { SourceChunk } from "@/lib/types";

const COMPANY_COLORS: Record<string, string> = {
  Alphabet:  "#4ade80",
  Amazon:    "#fb923c",
  Microsoft: "#60a5fa",
};

export function SourcesDrawer({ sources }: { sources: SourceChunk[] }) {
  const [open, setOpen] = useState(false);
  if (!sources.length) return null;

  return (
    <div className="mt-4 border border-white/10 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-white/5 hover:bg-white/10 text-xs text-white/60 transition-colors"
      >
        <span className="font-medium">Sources — {sources.length} chunks retrieved from 10-K filings</span>
        <span className="text-white/40">{open ? "▲ collapse" : "▼ expand"}</span>
      </button>
      {open && (
        <div className="divide-y divide-white/5 max-h-72 overflow-y-auto">
          {sources.map((s, i) => {
            const color = COMPANY_COLORS[s.company] ?? "#aaa";
            return (
              <div key={i} className="px-4 py-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded border"
                    style={{ color, borderColor: `${color}44` }}
                  >
                    {s.company} 10-K · p.{s.page_num}
                  </span>
                  <span className="text-[10px] text-white/30">relevance: {s.score}</span>
                </div>
                <p className="text-xs text-white/50 leading-relaxed line-clamp-3">{s.text}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
