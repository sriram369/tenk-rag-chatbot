"use client";

import { AgentResponse } from "@/lib/types";

const EXPERT_META: Record<string, { tag: string; color: string; short: string }> = {
  "GPT-4o":            { tag: "OpenAI",    color: "#74aa9c", short: "G4" },
  "Claude 3.5 Sonnet": { tag: "Anthropic", color: "#cc8b5a", short: "CL" },
  "Gemini 2.0 Flash":  { tag: "Google",    color: "#4e90d8", short: "GM" },
  "DeepSeek R1":       { tag: "DeepSeek",  color: "#9b76d4", short: "DS" },
};

const AUDIENCE_META: Record<string, { tag: string; color: string; short: string }> = {
  "GPT-OSS 120B":  { tag: "OpenAI",   color: "#5a8a7a", short: "GO" },
  "Llama 3.3 70B": { tag: "Meta",     color: "#4a7ab5", short: "LL" },
  "Qwen3 235B":    { tag: "Alibaba",  color: "#8b6db5", short: "QW" },
  "Gemma 3 27B":   { tag: "Google",   color: "#4a8a6a", short: "GE" },
};

interface Props {
  response: AgentResponse;
  index: number;
  isAudience?: boolean;
}

export function AgentCard({ response, index, isAudience = false }: Props) {
  const metaMap = isAudience ? AUDIENCE_META : EXPERT_META;
  const meta = metaMap[response.agent] ?? { tag: "LLM", color: "#5a5550", short: "??" };

  return (
    <div
      className="agent-card border rounded-sm animate-fade-slide-up"
      style={{
        animationDelay: `${index * 0.1}s`,
        opacity: 0,
        borderColor: isAudience ? "var(--border)" : "var(--border)",
        background: isAudience ? "var(--bg-2)" : "var(--bg-2)",
      }}
    >
      <div className="flex items-center justify-between p-4 pb-3">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-sm flex items-center justify-center text-[11px] font-bold flex-shrink-0"
            style={{
              background: `${meta.color}${isAudience ? "14" : "20"}`,
              color: isAudience ? `${meta.color}99` : meta.color,
              border: `1px solid ${meta.color}${isAudience ? "30" : "44"}`,
            }}
          >
            {meta.short}
          </div>
          <div>
            <div
              className="text-[14px] font-bold leading-none"
              style={{ color: "var(--text)" }}
            >
              {response.agent}
            </div>
            <div className="text-[11px] text-[var(--text-muted)] mt-0.5">{meta.tag}{isAudience ? " · Audience" : ""}</div>
          </div>
        </div>
        <div
          className="text-[10px] px-2 py-0.5 rounded-sm font-bold"
          style={{
            background: `${meta.color}${isAudience ? "10" : "18"}`,
            color: `${meta.color}${isAudience ? "88" : ""}`,
          }}
        >
          {response.error ? "ERROR" : "DONE"}
        </div>
      </div>

      <div className="border-t mx-4 mb-3" style={{ borderColor: "var(--border)" }} />

      <div className="px-4 pb-4">
        {response.error ? (
          <p className="text-[12px] text-[#f87171] leading-relaxed">{response.error}</p>
        ) : (
          <p
            className="text-[13px] leading-relaxed whitespace-pre-wrap"
            style={{ color: isAudience ? "var(--text-dim)" : "var(--text-dim)" }}
          >
            {response.answer}
          </p>
        )}
      </div>
    </div>
  );
}
