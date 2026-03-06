"use client";

import { ChatResponse } from "@/lib/types";
import { AgentCard } from "./AgentCard";
import { JudgeVerdict } from "./JudgeVerdict";
import { useState } from "react";

interface Props {
  response: ChatResponse;
}

export function DebateView({ response }: Props) {
  const [showAudience, setShowAudience] = useState(false);
  const sourceCount = Object.values(response.context_used).reduce(
    (acc, chunks) => acc + chunks.length, 0
  );

  return (
    <div className="animate-fade-in space-y-5">
      {/* Meta bar */}
      <div className="flex items-center gap-3 text-[10px] text-[var(--text-muted)] uppercase tracking-widest">
        <span className="text-[var(--amber)]">▸</span>
        <span>4 experts · {response.audience_responses.length} audience</span>
        <span className="text-[var(--border-2)]">·</span>
        <span>{sourceCount} context chunks</span>
        <span className="text-[var(--border-2)]">·</span>
        <span>{Object.keys(response.context_used).join(" · ")}</span>
      </div>

      {/* Expert Panel */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="text-[11px] text-[var(--amber)] uppercase tracking-widest font-bold">Expert Panel</div>
          <div className="flex-1 h-px bg-[var(--border)]" />
          <div className="text-[10px] text-[var(--text-muted)]">Judge reads these</div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {response.agent_responses.map((r, i) => (
            <AgentCard key={r.agent} response={r} index={i} isAudience={false} />
          ))}
        </div>
      </div>

      {/* Judge Verdict */}
      <JudgeVerdict answer={response.final_answer} />

      {/* General Audience (collapsible) */}
      <div>
        <button
          onClick={() => setShowAudience((v) => !v)}
          className="flex items-center gap-2 w-full group"
        >
          <div className="text-[11px] text-[var(--text-muted)] uppercase tracking-widest group-hover:text-[var(--text-dim)] transition-colors">
            General Audience
          </div>
          <div className="flex-1 h-px bg-[var(--border)]" />
          <div className="text-[10px] text-[var(--text-muted)] group-hover:text-[var(--text-dim)] transition-colors">
            {showAudience ? "hide ▲" : "show ▼"} · judge ignores these
          </div>
        </button>

        {showAudience && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
            {response.audience_responses.map((r, i) => (
              <AgentCard key={r.agent} response={r} index={i} isAudience={true} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
