"use client";

import { useEffect, useState } from "react";

const STAGES = [
  { label: "Embedding query",              duration: 1200 },
  { label: "Retrieving 10-K context",      duration: 2200 },
  { label: "GPT-4o analyzing",             duration: 4500 },
  { label: "Claude 3.5 Sonnet analyzing",  duration: 4500 },
  { label: "Gemini 1.5 Pro analyzing",     duration: 4500 },
  { label: "DeepSeek R1 analyzing",        duration: 4500 },
  { label: "Judge synthesizing verdict",   duration: 99999 },
];

const STAGE_COLORS = [
  "#a0a0a0", "#a0a0a0",
  "#74aa9c", "#cc8b5a", "#4e90d8", "#9b76d4",
  "#e8a020",
];

export function LiveStatus() {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    let elapsed = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];
    STAGES.forEach((s, i) => {
      if (i === 0) return;
      elapsed += STAGES[i - 1].duration;
      timers.push(setTimeout(() => setStage(i), elapsed));
    });
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="border border-[var(--border)] bg-[var(--bg-2)] rounded-sm p-4 animate-fade-in space-y-2.5">
      <div className="text-[11px] text-[var(--text-muted)] uppercase tracking-widest mb-3">
        Analysis in progress
      </div>
      {STAGES.map((s, i) => {
        const done   = i < stage;
        const active = i === stage;
        const color   = STAGE_COLORS[i];

        return (
          <div
            key={s.label}
            className="flex items-center gap-3 animate-stage-pop"
            style={{ animationDelay: `${i * 0.06}s`, opacity: 0 }}
          >
            {/* Icon */}
            <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
              {done ? (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2.5 7L5.5 10L11.5 4" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ) : active ? (
                <div className="w-3 h-3 border-2 border-t-transparent rounded-full animate-spin-slow"
                  style={{ borderColor: `${color} transparent transparent transparent` }} />
              ) : (
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)]" />
              )}
            </div>

            {/* Label */}
            <span
              className="text-[13px] transition-colors duration-300"
              style={{
                color: done ? "var(--text-dim)" : active ? color : "var(--text-muted)",
                fontStyle: active ? "italic" : "normal",
              }}
            >
              {s.label}
              {active && <span className="cursor-blink" />}
            </span>

            {done && (
              <span className="ml-auto text-[10px]" style={{ color }}>done</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
