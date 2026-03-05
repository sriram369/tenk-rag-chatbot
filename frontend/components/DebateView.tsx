"use client";

import { ChatResponse } from "@/lib/types";
import { AgentCard } from "./AgentCard";
import { JudgeVerdict } from "./JudgeVerdict";

interface Props {
  response: ChatResponse;
}

export function DebateView({ response }: Props) {
  const sourceCount = Object.values(response.context_used).reduce(
    (acc, chunks) => acc + chunks.length,
    0
  );

  return (
    <div className="animate-fade-in space-y-4">
      {/* Meta bar */}
      <div className="flex items-center gap-3 text-[9px] text-[var(--text-muted)] uppercase tracking-widest">
        <span className="text-[var(--amber)]">▸</span>
        <span>{response.agent_responses.length} analysts</span>
        <span className="text-[var(--border-2)]">·</span>
        <span>{sourceCount} context chunks</span>
        <span className="text-[var(--border-2)]">·</span>
        <span>{Object.keys(response.context_used).join(" · ")}</span>
      </div>

      {/* 4-agent grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {response.agent_responses.map((r, i) => (
          <AgentCard key={r.agent} response={r} index={i} />
        ))}
      </div>

      {/* Judge verdict */}
      <JudgeVerdict answer={response.final_answer} />
    </div>
  );
}
