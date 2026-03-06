"use client";

interface Props {
  answer: string;
  variant?: "primary" | "secondary";
}

export function JudgeVerdict({ answer, variant = "primary" }: Props) {
  const isPrimary = variant === "primary";

  return (
    <div
      className="border rounded-sm animate-fade-slide-up"
      style={{
        animationDelay: isPrimary ? "0.55s" : "0.65s",
        opacity: 0,
        borderColor: isPrimary ? "var(--amber-dim)" : "var(--border-2)",
        background: "var(--bg-2)",
        boxShadow: isPrimary ? "0 0 40px rgba(232,160,32,0.07)" : "none",
      }}
    >
      <div
        className="flex items-center gap-3 px-5 py-3.5 border-b"
        style={{ borderColor: isPrimary ? "var(--amber-dim)" : "var(--border)" }}
      >
        <div
          className="w-7 h-7 rounded-sm flex items-center justify-center"
          style={{
            background: isPrimary ? "rgba(232,160,32,0.1)" : "rgba(255,255,255,0.04)",
            border: `1px solid ${isPrimary ? "var(--amber-dim)" : "var(--border-2)"}`,
          }}
        >
          {isPrimary ? (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1L8.8 5.2H13L9.6 7.8L10.8 12L7 9.6L3.2 12L4.4 7.8L1 5.2H5.2L7 1Z"
                fill="var(--amber)" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="5.5" stroke="#4a7ab5" strokeWidth="1.2"/>
              <path d="M4.5 7L6.5 9L9.5 5" stroke="#4a7ab5" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>
        <div>
          <div
            className="text-[14px] font-bold tracking-wide"
            style={{ color: isPrimary ? "var(--amber)" : "#4a7ab5" }}
          >
            {isPrimary ? "Final Verdict" : "Second Opinion"}
          </div>
          <div className="text-[11px] text-[var(--text-muted)]">
            {isPrimary
              ? "Claude 3.5 Sonnet · synthesized from expert panel only"
              : "Llama 3.3 70B · Meta · independent review of expert panel"}
          </div>
        </div>
        <div
          className="ml-auto text-[11px] uppercase tracking-widest font-bold"
          style={{ color: isPrimary ? "var(--amber-dim)" : "#3a5a8a" }}
        >
          {isPrimary ? "PRIMARY" : "FREE"}
        </div>
      </div>

      <div className="px-5 py-5">
        <p
          className="text-[15px] leading-relaxed whitespace-pre-wrap"
          style={{ color: isPrimary ? "var(--amber)" : "#7aaadd" }}
        >
          {answer}
        </p>
      </div>
    </div>
  );
}
