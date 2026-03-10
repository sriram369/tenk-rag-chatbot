"use client";

import React from "react";
import { StreamState, AgentCardState, SourceChunk } from "@/lib/types";
import { SourcesDrawer } from "./SourcesDrawer";

const COMPANY_COLORS: Record<string, string> = {
  Alphabet:  "#4ade80",
  Amazon:    "#fb923c",
  Microsoft: "#60a5fa",
};

function parseCitation(badge: string): { company: string; page: number } | null {
  const m = badge.match(/\[([A-Za-z]+)\s+10-K,\s*p\.(\d+)\]/);
  if (!m) return null;
  return { company: m[1], page: parseInt(m[2], 10) };
}

function CitationBadge({ part, sources }: { part: string; sources: SourceChunk[] }) {
  const [visible, setVisible] = React.useState(false);
  const parsed = parseCitation(part);
  const source = parsed
    ? sources.find(s => s.company === parsed.company && s.page_num === parsed.page) ?? null
    : null;
  const color = parsed ? (COMPANY_COLORS[parsed.company] ?? "#aaa") : "#aaa";

  return (
    <span className="relative inline-flex align-middle mx-0.5">
      <span
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold border cursor-help transition-colors duration-150"
        style={{
          background:  `${color}18`,
          color,
          borderColor: `${color}55`,
        }}
      >
        {part}
      </span>

      {visible && (
        <span
          className="absolute z-50 bottom-full left-0 mb-2 w-72 rounded-lg border shadow-2xl text-left pointer-events-none"
          style={{
            background:  "#0e1828",
            borderColor: `${color}44`,
            boxShadow:   `0 0 24px ${color}22`,
          }}
        >
          <span className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: `${color}33` }}>
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded border"
              style={{ color, borderColor: `${color}55`, background: `${color}18` }}
            >
              {parsed?.company} 10-K
            </span>
            <span className="text-[10px] text-white/50">Page {parsed?.page}</span>
            {source && (
              <span className="ml-auto text-[10px] text-white/30">score: {source.score}</span>
            )}
          </span>
          <span className="block px-3 py-2 text-[11px] text-white/70 leading-relaxed" style={{ whiteSpace: "pre-wrap" }}>
            {source
              ? source.text
              : "Source text not available in retrieved chunks for this page."}
          </span>
        </span>
      )}
    </span>
  );
}

function renderWithCitations(text: string, sources: SourceChunk[]): React.ReactNode {
  const parts = text.split(/(\[[^\]]+10-K[^\]]*\])/g);
  return parts.map((part, i) => {
    if (/^\[[^\]]+10-K[^\]]*\]$/.test(part)) {
      return <CitationBadge key={i} part={part} sources={sources} />;
    }
    return <span key={i}>{part}</span>;
  });
}

const EXPERT_META = [
  { name: "GPT-4o",            org: "OpenAI",    color: "#74aa9c", short: "G4" },
  { name: "Claude 3.5 Sonnet", org: "Anthropic", color: "#cc8b5a", short: "CL" },
  { name: "Gemini 2.0 Flash",  org: "Google",    color: "#4e90d8", short: "GM" },
  { name: "DeepSeek R1",       org: "DeepSeek",  color: "#9b76d4", short: "DS" },
];

const AUDIENCE_META = [
  { name: "GPT-OSS 120B",  org: "OpenAI",  color: "#5a8a7a", short: "GO" },
  { name: "Llama 3.3 70B", org: "Meta",    color: "#4a7ab5", short: "LL" },
  { name: "Qwen3 235B",    org: "Alibaba", color: "#8b6db5", short: "QW" },
  { name: "Gemma 3 27B",   org: "Google",  color: "#4a8a6a", short: "GE" },
];

// ── Model tile ────────────────────────────────────────────────────────────────
function ModelTile({
  name, org, color, short, state, isAudience = false, sources = [],
}: {
  name: string; org: string; color: string; short: string;
  state?: AgentCardState; isAudience?: boolean; sources?: SourceChunk[];
}) {
  const done    = state?.done ?? false;
  const waiting = !done;

  return (
    <div
      className="border rounded-sm flex flex-col transition-colors duration-300"
      style={{
        borderColor:  done ? `${color}44` : "var(--border)",
        background:   "var(--bg-2)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2 border-b"
        style={{ borderColor: "var(--border)" }}
      >
        <div
          className="w-7 h-7 rounded-sm flex items-center justify-center text-[10px] font-bold flex-shrink-0"
          style={{
            background: `${color}${done ? "22" : "0e"}`,
            color:       done ? color : `${color}66`,
            border:      `1px solid ${color}${done ? "44" : "22"}`,
          }}
        >
          {waiting ? (
            <div
              className="w-2.5 h-2.5 border-2 rounded-full animate-spin-slow"
              style={{ borderColor: `${color}88 transparent transparent transparent` }}
            />
          ) : short}
        </div>

        <div className="flex-1 min-w-0">
          <div
            className="text-[12px] font-bold leading-none truncate"
            style={{ color: done ? color : `${color}77` }}
          >
            {name}
          </div>
          <div className="text-[9px] text-[var(--text-muted)] mt-0.5">
            {org}{isAudience ? " · free" : ""}
          </div>
        </div>

        <div
          className="text-[9px] font-bold uppercase tracking-wider flex-shrink-0"
          style={{ color: done ? color : "var(--border-2)" }}
        >
          {done ? "done" : "···"}
        </div>
      </div>

      {/* Body */}
      <div className="px-3 py-2.5 overflow-y-auto" style={{ maxHeight: 160 }}>
        {state?.error ? (
          <p className="text-[11px] text-[#f87171] leading-relaxed">{state.error}</p>
        ) : done && state?.answer ? (
          <p className="text-[12px] leading-relaxed text-[var(--text-dim)]">
            {renderWithCitations(state.answer, sources)}
          </p>
        ) : (
          <div className="flex items-center gap-2 mt-1">
            <div className="w-1.5 h-1.5 rounded-full animate-pulse flex-shrink-0" style={{ background: color }} />
            <span className="text-[11px] text-[var(--text-muted)]">
              {isAudience ? "observing…" : "analyzing…"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Judge tile ────────────────────────────────────────────────────────────────
function JudgeTile({
  name, variant, answer, isJudging,
}: {
  name: string; variant: "primary" | "secondary";
  answer?: string; isJudging: boolean;
}) {
  const isPrimary = variant === "primary";
  const color     = isPrimary ? "#e8a020" : "#4a7ab5";
  const done      = !!answer;

  return (
    <div
      className="border rounded-sm flex flex-col transition-colors duration-300"
      style={{
        borderColor: done ? `${color}55` : isPrimary ? "var(--amber-dim)" : "var(--border)",
        background:  "var(--bg-2)",
        boxShadow:   done && isPrimary ? "0 0 24px rgba(232,160,32,0.08)" : "none",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2.5 px-3 py-2.5 border-b"
        style={{ borderColor: done ? `${color}33` : "var(--border)" }}
      >
        <div
          className="w-7 h-7 rounded-sm flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}15`, border: `1px solid ${color}${done ? "44" : "22"}` }}
        >
          {isJudging && !done ? (
            <div
              className="w-2.5 h-2.5 border-2 rounded-full animate-spin-slow"
              style={{ borderColor: `${color} transparent transparent transparent` }}
            />
          ) : isPrimary ? (
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
              <path d="M7 1L8.8 5.2H13L9.6 7.8L10.8 12L7 9.6L3.2 12L4.4 7.8L1 5.2H5.2L7 1Z" fill={color} />
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="5.5" stroke={color} strokeWidth="1.2" />
              <path d="M4.5 7L6.5 9L9.5 5" stroke={color} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>

        <div className="flex-1">
          <div className="text-[13px] font-bold" style={{ color }}>
            {isPrimary ? "Final Verdict" : "Second Opinion"}
          </div>
          <div className="text-[10px] text-[var(--text-muted)]">
            {name} · {isPrimary ? "Primary Judge" : "Free · Meta"}
          </div>
        </div>

        {done && (
          <div
            className="text-[9px] font-bold uppercase tracking-wider flex-shrink-0"
            style={{ color }}
          >
            {isPrimary ? "PRIMARY" : "FREE"}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="px-4 py-4 overflow-y-auto" style={{ maxHeight: 320 }}>
        {done ? (
          <p className="text-[14px] font-bold leading-relaxed" style={{ color: isPrimary ? color : "#3a6aaa" }}>
            {answer}
          </p>
        ) : isJudging ? (
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: color }} />
            <span className="text-[12px] text-[var(--text-muted)]">
              {isPrimary ? "synthesizing verdict…" : "reviewing expert panel…"}
            </span>
          </div>
        ) : (
          <p className="text-[11px] text-[var(--text-muted)]">Waiting for expert panel…</p>
        )}
      </div>
    </div>
  );
}

// ── Section header ─────────────────────────────────────────────────────────────
function SectionHead({ label, note, amber }: { label: string; note: string; amber?: boolean }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div
        className="text-[11px] uppercase tracking-widest font-bold"
        style={{ color: amber ? "var(--amber)" : "var(--text-dim)" }}
      >
        {label}
      </div>
      <div className="flex-1 h-px" style={{ background: amber ? "var(--amber-dim)" : "var(--border)" }} />
      <div className="text-[10px] text-[var(--text-muted)]">{note}</div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
interface Props { state: StreamState }

export function LiveDebate({ state }: Props) {
  const showJudges = state.isJudging || state.verdicts.primary !== undefined || state.verdicts.secondary !== undefined;

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Expert Panel — 2×2 grid */}
      <div>
        <SectionHead label="Expert Panel" note="Both judges read these" amber />
        <div className="grid grid-cols-2 gap-3">
          {EXPERT_META.map((m) => (
            <ModelTile key={m.name} {...m} state={state.experts[m.name]} sources={state.sources} />
          ))}
        </div>
      </div>

      {/* General Audience — 2×2 grid */}
      <div>
        <SectionHead label="General Audience" note="Judges ignore these" />
        <div className="grid grid-cols-2 gap-3">
          {AUDIENCE_META.map((m) => (
            <ModelTile key={m.name} {...m} state={state.audience[m.name]} isAudience sources={state.sources} />
          ))}
        </div>
      </div>

      {/* Verdicts — side by side, appear once judging starts */}
      {showJudges && (
        <div className="animate-fade-in">
          <SectionHead label="Verdicts" note="Expert panel only · audience excluded" amber />
          <div className="grid grid-cols-1 gap-4">
            <JudgeTile
              name="Claude 3.5 Sonnet"
              variant="primary"
              answer={state.verdicts.primary}
              isJudging={state.isJudging}
            />
            <JudgeTile
              name="Llama 3.3 70B"
              variant="secondary"
              answer={state.verdicts.secondary}
              isJudging={state.isJudging}
            />
          </div>
        </div>
      )}

      {/* Sources drawer — collapsible, shown when RAG chunks are available */}
      <SourcesDrawer sources={state.sources} />

    </div>
  );
}
