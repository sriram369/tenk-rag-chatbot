"use client";

interface Props {
  answer: string;
}

export function JudgeVerdict({ answer }: Props) {
  return (
    <div
      className="border border-[var(--amber-dim)] bg-[var(--bg-2)] rounded-sm animate-fade-slide-up"
      style={{
        animationDelay: "0.6s",
        opacity: 0,
        boxShadow: "0 0 30px var(--amber-glow), inset 0 1px 0 rgba(232,160,32,0.08)",
        "--amber-glow": "rgba(232, 160, 32, 0.08)",
      } as React.CSSProperties}
    >
      {/* Header bar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--amber-dim)]">
        <div className="w-6 h-6 rounded-sm bg-[var(--amber-glow)] border border-[var(--amber-dim)] flex items-center justify-center">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 1L7.5 4.5H11L8.25 6.75L9.25 10.5L6 8.5L2.75 10.5L3.75 6.75L1 4.5H4.5L6 1Z"
              fill="var(--amber)" />
          </svg>
        </div>
        <div>
          <div className="text-[11px] font-semibold text-[var(--amber)] tracking-wider uppercase">
            Final Verdict
          </div>
          <div className="text-[9px] text-[var(--text-muted)]">Claude 3.5 Sonnet · Chief Analyst</div>
        </div>
        <div className="ml-auto text-[9px] text-[var(--amber-dim)] uppercase tracking-widest">
          SYNTHESIZED
        </div>
      </div>

      {/* Answer */}
      <div className="px-4 py-4">
        <p className="text-[12px] text-[var(--text)] leading-relaxed whitespace-pre-wrap font-serif italic">
          {answer}
        </p>
      </div>
    </div>
  );
}
