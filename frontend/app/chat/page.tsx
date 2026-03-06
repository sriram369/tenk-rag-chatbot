"use client";

import { useState, useRef, useEffect } from "react";
import { ChatInput } from "@/components/ChatInput";
import { DebateView } from "@/components/DebateView";
import { LiveStatus } from "@/components/LiveStatus";
import { sendChat } from "@/lib/api";
import { Message } from "@/lib/types";

const TICKER = "GOOGL +2.4%  ·  AMZN +1.8%  ·  MSFT -0.3%  ·  AI DEBATE ACTIVE  ·  10-K FILINGS 2024  ·  RAG ENABLED  ·  4 EXPERTS + 4 AUDIENCE  ·  2 JUDGES  ·  CLAUDE JUDGE  ·  ";

const EXPERTS = [
  {
    name: "GPT-4o", tag: "OpenAI", color: "#74aa9c",
    logo: <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 1.5L14 5v6L8 14.5 2 11V5L8 1.5z" stroke="#74aa9c" strokeWidth="1.2" fill="none"/><circle cx="8" cy="8" r="2" fill="#74aa9c"/></svg>,
  },
  {
    name: "Claude 3.5", tag: "Anthropic", color: "#cc8b5a",
    logo: <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 2L13 13H3L8 2Z" stroke="#cc8b5a" strokeWidth="1.2" fill="none" strokeLinejoin="round"/><path d="M5.5 9.5h5" stroke="#cc8b5a" strokeWidth="1.2" strokeLinecap="round"/></svg>,
  },
  {
    name: "Gemini 2.0", tag: "Google", color: "#4e90d8",
    logo: <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 2L9.5 6.5L14 8L9.5 9.5L8 14L6.5 9.5L2 8L6.5 6.5L8 2Z" stroke="#4e90d8" strokeWidth="1.2" fill="none" strokeLinejoin="round"/></svg>,
  },
  {
    name: "DeepSeek R1", tag: "DeepSeek", color: "#9b76d4",
    logo: <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="5.5" stroke="#9b76d4" strokeWidth="1.2"/><path d="M5.5 8C5.5 6.6 6.6 5.5 8 5.5C9.7 5.5 10.5 6.8 10.5 8" stroke="#9b76d4" strokeWidth="1.2" strokeLinecap="round"/><circle cx="8" cy="10" r="1" fill="#9b76d4"/></svg>,
  },
];

const JUDGES = [
  {
    name: "Claude 3.5 Sonnet", tag: "Primary · Anthropic", color: "#e8a020",
    logo: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1L8.8 5.2H13L9.6 7.8L10.8 12L7 9.6L3.2 12L4.4 7.8L1 5.2H5.2L7 1Z" fill="#e8a020"/></svg>,
  },
  {
    name: "Llama 3.3 70B", tag: "Second Opinion · Free", color: "#4a7ab5",
    logo: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="#4a7ab5" strokeWidth="1.2"/><path d="M4.5 7L6.5 9L9.5 5" stroke="#4a7ab5" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  },
];

const AUDIENCE_MODELS = [
  { name: "GPT-OSS 120B",  tag: "OpenAI",  color: "#5a8a7a" },
  { name: "Llama 3.3 70B", tag: "Meta",    color: "#4a7ab5" },
  { name: "Qwen3 235B",    tag: "Alibaba", color: "#8b6db5" },
  { name: "Gemma 3 27B",   tag: "Google",  color: "#4a8a6a" },
];

const COMPANIES = ["alphabet", "amazon", "microsoft"];
const COMPANY_META: Record<string, { label: string; color: string }> = {
  alphabet:  { label: "GOOGL", color: "#4ade80" },
  amazon:    { label: "AMZN",  color: "#fb923c" },
  microsoft: { label: "MSFT",  color: "#60a5fa" },
};

export default function Home() {
  const [messages, setMessages]     = useState<Message[]>([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [selected, setSelected]     = useState<string[]>(COMPANIES);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const toggleCompany = (c: string) => {
    setSelected((prev) =>
      prev.includes(c) ? (prev.length > 1 ? prev.filter((x) => x !== c) : prev) : [...prev, c]
    );
  };

  const handleSubmit = async (question: string) => {
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: question,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    setError(null);

    try {
      const data = await sendChat({ question, companies: selected });
      setMessages((prev) => [...prev, {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.final_answer,
        response: data,
        timestamp: new Date(),
      }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[var(--bg)]">

      {/* ── Header ── */}
      <header className="flex-shrink-0 border-b border-[var(--border)] bg-[var(--bg-2)]">

        {/* Top row: title + live badge */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border border-[var(--amber-dim)] rounded-sm flex items-center justify-center">
              <div className="w-2.5 h-2.5 bg-[var(--amber)] rounded-sm animate-pulse-amber" />
            </div>
            <span className="font-display italic text-2xl text-[var(--text)] tracking-tight">
              10K Intelligence
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#4ade80] animate-pulse-amber" />
            <span className="text-[12px] text-[#4ade80] uppercase tracking-widest font-bold">LIVE</span>
          </div>
        </div>

        {/* All models row */}
        <div className="border-b border-[var(--border)] overflow-x-auto">
          <div className="flex items-stretch min-w-max px-5">

            {/* Expert Panel */}
            <div className="flex items-center gap-1 py-2.5 pr-4">
              <div className="text-[9px] text-[var(--amber)] uppercase tracking-widest font-bold w-14 flex-shrink-0 leading-tight">Expert<br/>Panel</div>
              <div className="w-px h-6 bg-[var(--border)] mx-2" />
              {EXPERTS.map((m) => (
                <div key={m.name} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm" style={{ background: `${m.color}0a` }}>
                  {m.logo}
                  <div>
                    <div className="text-[12px] font-bold leading-none" style={{ color: m.color }}>{m.name}</div>
                    <div className="text-[9px] text-[var(--text-muted)] mt-0.5">{m.tag}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="w-px bg-[var(--border)] my-2" />

            {/* Judges */}
            <div className="flex items-center gap-1 py-2.5 px-4">
              <div className="text-[9px] text-[var(--amber)] uppercase tracking-widest font-bold w-10 flex-shrink-0 leading-tight">Judges</div>
              <div className="w-px h-6 bg-[var(--border)] mx-2" />
              {JUDGES.map((j) => (
                <div key={j.name} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm" style={{ background: `${j.color}0a` }}>
                  {j.logo}
                  <div>
                    <div className="text-[12px] font-bold leading-none" style={{ color: j.color }}>{j.name}</div>
                    <div className="text-[9px] text-[var(--text-muted)] mt-0.5">{j.tag}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="w-px bg-[var(--border)] my-2" />

            {/* Audience */}
            <div className="flex items-center gap-1 py-2.5 px-4">
              <div className="text-[9px] text-[var(--text-muted)] uppercase tracking-widest font-bold w-14 flex-shrink-0 leading-tight">Audience<br/>(free)</div>
              <div className="w-px h-6 bg-[var(--border)] mx-2" />
              {AUDIENCE_MODELS.map((a) => (
                <div key={a.name} className="flex items-center gap-1.5 px-2 py-1.5 opacity-70">
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: a.color }} />
                  <div>
                    <div className="text-[11px] font-bold leading-none" style={{ color: a.color }}>{a.name}</div>
                    <div className="text-[9px] text-[var(--text-muted)] mt-0.5">{a.tag}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="w-px bg-[var(--border)] my-2" />

            {/* Company scope toggles */}
            <div className="flex items-center gap-2 py-2.5 pl-4 ml-auto">
              <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Sources:</span>
              {COMPANIES.map((c) => {
                const meta = COMPANY_META[c];
                const active = selected.includes(c);
                return (
                  <button
                    key={c}
                    onClick={() => toggleCompany(c)}
                    className="text-[11px] px-2 py-1 rounded-sm font-bold transition-all duration-150"
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
            </div>

          </div>
        </div>

        {/* Ticker */}
        <div className="ticker-wrap py-1.5">
          <div className="ticker-content text-[11px] text-[var(--text-muted)] tracking-wider">
            {TICKER.repeat(4)}
          </div>
        </div>
      </header>

      {/* ── Messages ── */}
      <main className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-full text-center animate-fade-in gap-4">
            <p className="font-display italic text-4xl text-[var(--text)]">
              Ask anything about the 10-Ks
            </p>
            <p className="text-[14px] text-[var(--text-dim)] max-w-md leading-relaxed">
              4 AI analysts debate your question using real excerpts from Alphabet, Amazon, and
              Microsoft&apos;s 2024 annual reports. A Claude judge synthesizes the final answer.
            </p>
            <div className="flex items-center gap-5 text-[12px] text-[var(--text-muted)] uppercase tracking-widest mt-2">
              <span className="flex items-center gap-2"><span style={{ color: "#4ade80" }}>◆</span>GOOGL</span>
              <span className="flex items-center gap-2"><span style={{ color: "#fb923c" }}>◆</span>AMZN</span>
              <span className="flex items-center gap-2"><span style={{ color: "#60a5fa" }}>◆</span>MSFT</span>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id}>
            {msg.role === "user" ? (
              <div className="flex items-start gap-3 animate-fade-slide-up">
                <div className="w-7 h-7 flex-shrink-0 rounded-sm bg-[var(--bg-3)] border border-[var(--border)] flex items-center justify-center text-[11px] text-[var(--text-muted)] mt-0.5">
                  you
                </div>
                <p className="text-[15px] text-[var(--text)] leading-relaxed pt-0.5">{msg.content}</p>
              </div>
            ) : (
              msg.response && <DebateView response={msg.response} />
            )}
          </div>
        ))}

        {loading && <LiveStatus />}

        {error && (
          <div className="border border-[#f87171]/30 rounded-sm px-4 py-3 animate-fade-in">
            <p className="text-[13px] text-[#f87171]">{error}</p>
          </div>
        )}

        <div ref={bottomRef} />
      </main>

      {/* ── Input ── */}
      <footer className="flex-shrink-0 p-4 border-t border-[var(--border)] bg-[var(--bg-2)]">
        <ChatInput onSubmit={handleSubmit} loading={loading} />
      </footer>
    </div>
  );
}
