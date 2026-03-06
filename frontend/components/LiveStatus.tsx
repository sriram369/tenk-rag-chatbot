"use client";

import { useEffect, useState } from "react";

type Phase = "setup" | "parallel" | "judge";

export function LiveStatus() {
  const [phase, setPhase] = useState<Phase>("setup");
  const [setupDone, setSetupDone] = useState<boolean[]>([false, false]);

  useEffect(() => {
    // Step 1: Embedding (1.2s)
    const t1 = setTimeout(() => setSetupDone([true, false]), 1200);
    // Step 2: Retrieval (2.4s total)
    const t2 = setTimeout(() => {
      setSetupDone([true, true]);
      setPhase("parallel");
    }, 2800);
    // Step 3: Judge starts after models finish (~9s total)
    const t3 = setTimeout(() => setPhase("judge"), 9500);
    return () => [t1, t2, t3].forEach(clearTimeout);
  }, []);

  const EXPERTS = [
    { name: "GPT-4o",            org: "OpenAI",    color: "#74aa9c" },
    { name: "Claude 3.5 Sonnet", org: "Anthropic", color: "#cc8b5a" },
    { name: "Gemini 2.0 Flash",  org: "Google",    color: "#4e90d8" },
    { name: "DeepSeek R1",       org: "DeepSeek",  color: "#9b76d4" },
  ];

  const AUDIENCE = [
    { name: "GPT-OSS 120B",  org: "OpenAI",  color: "#5a8a7a" },
    { name: "Llama 3.3 70B", org: "Meta",    color: "#4a7ab5" },
    { name: "Qwen3 235B",    org: "Alibaba", color: "#8b6db5" },
    { name: "Gemma 3 27B",   org: "Google",  color: "#4a8a6a" },
  ];

  const showParallel = phase === "parallel" || phase === "judge";
  const showJudge    = phase === "judge";

  return (
    <div className="border border-[var(--border)] bg-[var(--bg-2)] rounded-sm p-5 animate-fade-in space-y-4">

      <div className="text-[11px] text-[var(--text-muted)] uppercase tracking-widest">
        Analysis in progress
      </div>

      {/* Setup stages */}
      <div className="space-y-2">
        {["Embedding query", "Retrieving 10-K context"].map((label, i) => {
          const done   = setupDone[i];
          const active = !done && (i === 0 || setupDone[0]);
          return (
            <div key={label} className="flex items-center gap-3">
              <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
                {done ? (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2.5 7L5.5 10L11.5 4" stroke="#a0a0a0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : active ? (
                  <div className="w-3 h-3 border-2 rounded-full animate-spin-slow"
                    style={{ borderColor: "#a0a0a0 transparent transparent transparent" }} />
                ) : (
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--border-2)]" />
                )}
              </div>
              <span className="text-[13px]" style={{ color: done ? "var(--text-dim)" : active ? "#c0c0c0" : "var(--text-muted)" }}>
                {label}
              </span>
              {done && <span className="ml-auto text-[10px] text-[var(--text-muted)]">done</span>}
            </div>
          );
        })}
      </div>

      {/* Parallel models */}
      {showParallel && (
        <div className="space-y-3 border-t border-[var(--border)] pt-4 animate-fade-in">

          {/* Expert Panel */}
          <div>
            <div className="text-[10px] text-[var(--amber)] uppercase tracking-widest font-bold mb-2">
              Expert Panel · running in parallel
            </div>
            <div className="space-y-1.5">
              {EXPERTS.map((e) => (
                <div key={e.name} className="flex items-center gap-3">
                  <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
                    {showJudge ? (
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M2.5 7L5.5 10L11.5 4" stroke={e.color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    ) : (
                      <div className="w-3 h-3 border-2 rounded-full animate-spin-slow"
                        style={{ borderColor: `${e.color} transparent transparent transparent` }} />
                    )}
                  </div>
                  <span className="text-[13px] font-bold" style={{ color: e.color }}>{e.name}</span>
                  <span className="text-[11px] text-[var(--text-muted)]">{e.org}</span>
                  {showJudge
                    ? <span className="ml-auto text-[10px]" style={{ color: e.color }}>done</span>
                    : <span className="ml-auto text-[11px]" style={{ color: e.color, fontStyle: "italic" }}>analyzing…</span>
                  }
                </div>
              ))}
            </div>
          </div>

          {/* General Audience */}
          <div>
            <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest font-bold mb-2">
              General Audience · running in parallel
            </div>
            <div className="space-y-1.5">
              {AUDIENCE.map((a) => (
                <div key={a.name} className="flex items-center gap-3 opacity-75">
                  <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
                    {showJudge ? (
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M2.5 7L5.5 10L11.5 4" stroke={a.color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    ) : (
                      <div className="w-3 h-3 border-2 rounded-full animate-spin-slow"
                        style={{ borderColor: `${a.color} transparent transparent transparent` }} />
                    )}
                  </div>
                  <span className="text-[13px]" style={{ color: a.color }}>{a.name}</span>
                  <span className="text-[11px] text-[var(--text-muted)]">{a.org} · free</span>
                  {showJudge
                    ? <span className="ml-auto text-[10px]" style={{ color: a.color }}>done</span>
                    : <span className="ml-auto text-[11px]" style={{ color: a.color, fontStyle: "italic" }}>observing…</span>
                  }
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Judge */}
      {showJudge && (
        <div className="border-t border-[var(--amber-dim)] pt-4 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
              <div className="w-3 h-3 border-2 rounded-full animate-spin-slow"
                style={{ borderColor: "#e8a020 transparent transparent transparent" }} />
            </div>
            <span className="text-[13px] font-bold text-[var(--amber)]">Claude 3.5 Sonnet</span>
            <span className="text-[11px] text-[var(--text-muted)]">Chief Analyst · Judge</span>
            <span className="ml-auto text-[11px] text-[var(--amber)] italic">synthesizing verdict…</span>
          </div>
          <div className="mt-2 text-[10px] text-[var(--text-muted)] pl-8">
            Reading expert responses only · audience excluded
          </div>
        </div>
      )}

    </div>
  );
}
