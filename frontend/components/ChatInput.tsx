"use client";

import { useState, useRef, KeyboardEvent } from "react";

const COMPANIES = ["alphabet", "amazon", "microsoft"];
const COMPANY_LABELS: Record<string, { label: string; color: string }> = {
  alphabet:  { label: "GOOGL", color: "#4ade80" },
  amazon:    { label: "AMZN",  color: "#fb923c" },
  microsoft: { label: "MSFT",  color: "#60a5fa" },
};

const SUGGESTIONS = [
  "Compare revenue growth across all three companies",
  "What are the main risk factors for Microsoft?",
  "How does Amazon's cloud revenue compare to Google Cloud?",
  "What was Alphabet's net income in 2024?",
  "Compare R&D spending across all three companies",
];

interface Props {
  onSubmit: (question: string, companies: string[]) => void;
  loading: boolean;
}

export function ChatInput({ onSubmit, loading }: Props) {
  const [value, setValue] = useState("");
  const [selected, setSelected] = useState<string[]>(COMPANIES);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const toggle = (c: string) => {
    setSelected((prev) =>
      prev.includes(c) ? (prev.length > 1 ? prev.filter((x) => x !== c) : prev) : [...prev, c]
    );
  };

  const submit = () => {
    if (!value.trim() || loading) return;
    onSubmit(value.trim(), selected);
    setValue("");
    setShowSuggestions(false);
  };

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="border border-[var(--border)] bg-[var(--bg-2)] rounded-sm">
      {/* Company toggles */}
      <div className="flex items-center gap-2 px-3 pt-3 pb-2 border-b border-[var(--border)]">
        <span className="text-[9px] text-[var(--text-muted)] uppercase tracking-widest mr-1">Scope</span>
        {COMPANIES.map((c) => {
          const meta = COMPANY_LABELS[c];
          const active = selected.includes(c);
          return (
            <button
              key={c}
              onClick={() => toggle(c)}
              className="text-[10px] px-2 py-0.5 rounded-sm font-medium transition-all duration-150"
              style={{
                background: active ? `${meta.color}18` : "transparent",
                color: active ? meta.color : "var(--text-muted)",
                border: `1px solid ${active ? meta.color + "55" : "var(--border)"}`,
              }}
            >
              {meta.label}
            </button>
          );
        })}
        <button
          onClick={() => setShowSuggestions((v) => !v)}
          className="ml-auto text-[9px] text-[var(--text-muted)] hover:text-[var(--text-dim)] transition-colors uppercase tracking-widest"
        >
          {showSuggestions ? "HIDE" : "EXAMPLES"}
        </button>
      </div>

      {/* Suggestions */}
      {showSuggestions && (
        <div className="px-3 py-2 border-b border-[var(--border)] flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => { setValue(s); setShowSuggestions(false); textareaRef.current?.focus(); }}
              className="text-[10px] px-2 py-1 border border-[var(--border)] text-[var(--text-dim)] hover:border-[var(--amber-dim)] hover:text-[var(--text)] transition-all duration-150 rounded-sm text-left"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Textarea */}
      <div className="flex items-end gap-2 p-3">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Ask about revenue, risks, R&D spend, margins..."
          rows={2}
          disabled={loading}
          className="flex-1 bg-transparent text-[12px] text-[var(--text)] placeholder-[var(--text-muted)] resize-none outline-none leading-relaxed disabled:opacity-50"
        />
        <button
          onClick={submit}
          disabled={!value.trim() || loading}
          className="flex-shrink-0 w-8 h-8 flex items-center justify-center border rounded-sm transition-all duration-150 disabled:opacity-30"
          style={{
            borderColor: value.trim() && !loading ? "var(--amber-dim)" : "var(--border)",
            background: value.trim() && !loading ? "var(--amber-glow)" : "transparent",
            "--amber-glow": "rgba(232,160,32,0.1)",
          } as React.CSSProperties}
        >
          {loading ? (
            <div className="w-3 h-3 border border-[var(--amber)] border-t-transparent rounded-full animate-spin-slow" />
          ) : (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M1 6H11M11 6L7 2M11 6L7 10" stroke="var(--amber)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </button>
      </div>

      {/* Footer hint */}
      <div className="px-3 pb-2 flex items-center justify-between">
        <span className="text-[9px] text-[var(--text-muted)]">⏎ to send · ⇧⏎ for newline</span>
        <span className="text-[9px] text-[var(--text-muted)]">{selected.length}/3 sources</span>
      </div>
    </div>
  );
}
