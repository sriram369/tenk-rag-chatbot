"use client";

import { AgentResponse } from "@/lib/types";

const AGENT_META: Record<string, { tag: string; color: string; short: string }> = {
  "GPT-4o":            { tag: "OPENAI",    color: "#74aa9c", short: "G4" },
  "Claude 3.5 Sonnet": { tag: "ANTHROPIC", color: "#cc8b5a", short: "CL" },
  "Gemini 1.5 Pro":    { tag: "GOOGLE",    color: "#4e90d8", short: "GM" },
  "DeepSeek R1":       { tag: "DEEPSEEK",  color: "#9b76d4", short: "DS" },
};

interface Props {
  response: AgentResponse;
  index: number;
}

export function AgentCard({ response, index }: Props) {
  const meta = AGENT_META[response.agent] ?? { tag: "LLM", color: "#7a7570", short: "??" };

  return (
    <div
      className="agent-card border border-[var(--border)] bg-[var(--bg-2)] p-4 rounded-sm animate-fade-slide-up"
      style={{ animationDelay: `${index * 0.12}s`, opacity: 0 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-sm flex items-center justify-center text-[10px] font-semibold"
            style={{ background: `${meta.color}22`, color: meta.color, border: `1px solid ${meta.color}44` }}
          >
            {meta.short}
          </div>
          <div>
            <div className="text-[11px] text-[var(--text)] font-medium leading-none">{response.agent}</div>
            <div className="text-[9px] text-[var(--text-muted)] mt-0.5">{meta.tag}</div>
          </div>
        </div>
        <div
          className="text-[9px] px-1.5 py-0.5 rounded-sm font-medium"
          style={{ background: `${meta.color}18`, color: meta.color }}
        >
          {response.error ? "ERROR" : "OK"}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-[var(--border)] mb-3" />

      {/* Content */}
      {response.error ? (
        <p className="text-[11px] text-[#f87171] leading-relaxed">{response.error}</p>
      ) : (
        <p className="text-[11px] text-[var(--text-dim)] leading-relaxed whitespace-pre-wrap">
          {response.answer}
        </p>
      )}
    </div>
  );
}
