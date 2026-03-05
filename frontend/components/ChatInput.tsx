"use client";

import { useState, useRef, KeyboardEvent } from "react";

const SUGGESTIONS = [
  "Compare revenue growth across all three companies",
  "What are Microsoft's main risk factors?",
  "How does Amazon cloud revenue compare to Google Cloud?",
  "What was Alphabet's net income in 2024?",
  "Compare R&D spending across all three companies",
];

interface Props {
  onSubmit: (question: string) => void;
  loading: boolean;
}

export function ChatInput({ onSubmit, loading }: Props) {
  const [value, setValue]                   = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const submit = () => {
    if (!value.trim() || loading) return;
    onSubmit(value.trim());
    setValue("");
    setShowSuggestions(false);
  };

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }
  };

  return (
    <div className="border border-[var(--border)] bg-[var(--bg-3)] rounded-sm">

      {/* Suggestion chips */}
      {showSuggestions && (
        <div className="px-4 py-3 border-b border-[var(--border)] flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => { setValue(s); setShowSuggestions(false); textareaRef.current?.focus(); }}
              className="text-[12px] px-3 py-1.5 border border-[var(--border)] text-[var(--text-dim)]
                hover:border-[var(--amber-dim)] hover:text-[var(--text)] transition-all duration-150 rounded-sm text-left"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input row */}
      <div className="flex items-end gap-3 px-4 py-3">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Ask about revenue, risk factors, R&D spend, profit margins..."
          rows={2}
          disabled={loading}
          className="flex-1 bg-transparent text-[14px] text-[var(--text)] placeholder-[var(--text-muted)]
            resize-none outline-none leading-relaxed disabled:opacity-50"
        />
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setShowSuggestions((v) => !v)}
            className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-dim)] transition-colors
              uppercase tracking-widest px-2 py-1 border border-[var(--border)] rounded-sm"
          >
            examples
          </button>
          <button
            onClick={submit}
            disabled={!value.trim() || loading}
            className="w-10 h-10 flex items-center justify-center border rounded-sm transition-all duration-150 disabled:opacity-30"
            style={{
              borderColor: value.trim() && !loading ? "var(--amber-dim)" : "var(--border)",
              background:  value.trim() && !loading ? "var(--amber-glow)"  : "transparent",
            }}
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-[var(--amber)] border-t-transparent rounded-full animate-spin-slow" />
            ) : (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M1 7H13M13 7L8 2M13 7L8 12"
                  stroke="var(--amber)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </button>
        </div>
      </div>

      <div className="px-4 pb-2.5 text-[11px] text-[var(--text-muted)]">
        ⏎ send &nbsp;·&nbsp; ⇧⏎ newline
      </div>
    </div>
  );
}
