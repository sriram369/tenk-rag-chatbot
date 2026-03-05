"use client";

interface Props { answer: string; }

export function JudgeVerdict({ answer }: Props) {
  return (
    <div
      className="border border-[var(--amber-dim)] bg-[var(--bg-2)] rounded-sm animate-fade-slide-up"
      style={{
        animationDelay: "0.55s",
        opacity: 0,
        boxShadow: "0 0 40px rgba(232,160,32,0.07)",
      }}
    >
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[var(--amber-dim)]">
        <div className="w-7 h-7 rounded-sm flex items-center justify-center"
          style={{ background: "rgba(232,160,32,0.1)", border: "1px solid var(--amber-dim)" }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1L8.8 5.2H13L9.6 7.8L10.8 12L7 9.6L3.2 12L4.4 7.8L1 5.2H5.2L7 1Z"
              fill="var(--amber)" />
          </svg>
        </div>
        <div>
          <div className="text-[14px] font-bold text-[var(--amber)] tracking-wide">Final Verdict</div>
          <div className="text-[11px] text-[var(--text-muted)]">Claude 3.5 Sonnet · Chief Analyst</div>
        </div>
        <div className="ml-auto text-[11px] text-[var(--amber-dim)] uppercase tracking-widest font-bold">
          SYNTHESIZED
        </div>
      </div>

      <div className="px-5 py-5">
        <p className="text-[15px] text-[var(--text)] leading-relaxed whitespace-pre-wrap font-display italic">
          {answer}
        </p>
      </div>
    </div>
  );
}
