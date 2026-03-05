"use client";

import { useState, useRef, useEffect } from "react";
import { ChatInput } from "@/components/ChatInput";
import { DebateView } from "@/components/DebateView";
import { sendChat } from "@/lib/api";
import { Message } from "@/lib/types";

const TICKER = "GOOGL +2.4%  ·  AMZN +1.8%  ·  MSFT -0.3%  ·  AI DEBATE ACTIVE  ·  10-K FILINGS 2024  ·  RAG ENABLED  ·  4 ANALYST MODELS  ·  CLAUDE JUDGE  ·  ";

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSubmit = async (question: string, companies: string[]) => {
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
      const data = await sendChat({ question, companies });
      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.final_answer,
        response: data,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[var(--bg)]">

      {/* Top bar */}
      <header className="flex-shrink-0 border-b border-[var(--border)] bg-[var(--bg-2)]">
        <div className="flex items-center justify-between px-4 py-2.5">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border border-[var(--amber-dim)] rounded-sm flex items-center justify-center">
              <div className="w-2 h-2 bg-[var(--amber)] rounded-sm animate-pulse-amber" />
            </div>
            <span className="font-serif italic text-[15px] text-[var(--text)]">10K Intelligence</span>
            <span className="text-[9px] text-[var(--text-muted)] uppercase tracking-widest hidden sm:block">
              Multi-Model Terminal
            </span>
          </div>
          <div className="flex items-center gap-3 text-[9px] text-[var(--text-muted)] uppercase tracking-widest">
            <span className="hidden sm:block">GPT-4o · Claude · Gemini · DeepSeek</span>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-[#4ade80] animate-pulse-amber" />
              <span>LIVE</span>
            </div>
          </div>
        </div>

        {/* Ticker */}
        <div className="ticker-wrap border-t border-[var(--border)] py-1 bg-[var(--bg)]">
          <div className="ticker-content text-[9px] text-[var(--text-muted)] tracking-wider">
            {TICKER.repeat(4)}
          </div>
        </div>
      </header>

      {/* Messages area */}
      <main className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-full text-center animate-fade-in">
            <p className="font-serif italic text-3xl text-[var(--text)] mb-2">
              Ask anything about the 10-Ks
            </p>
            <p className="text-[11px] text-[var(--text-muted)] max-w-sm leading-relaxed">
              4 AI analysts debate your question using real excerpts from Alphabet, Amazon, and Microsoft&apos;s
              2024 annual reports. A judge synthesizes the final answer.
            </p>
            <div className="mt-6 flex items-center gap-4 text-[9px] text-[var(--text-muted)] uppercase tracking-widest">
              <span className="flex items-center gap-1.5">
                <span style={{ color: "#4ade80" }}>◆</span> GOOGL
              </span>
              <span className="flex items-center gap-1.5">
                <span style={{ color: "#fb923c" }}>◆</span> AMZN
              </span>
              <span className="flex items-center gap-1.5">
                <span style={{ color: "#60a5fa" }}>◆</span> MSFT
              </span>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id}>
            {msg.role === "user" ? (
              <div className="flex items-start gap-3 animate-fade-slide-up">
                <div className="w-5 h-5 flex-shrink-0 rounded-sm bg-[var(--bg-3)] border border-[var(--border)] flex items-center justify-center text-[9px] text-[var(--text-muted)] mt-0.5">
                  U
                </div>
                <p className="text-[12px] text-[var(--text)] leading-relaxed pt-0.5">{msg.content}</p>
              </div>
            ) : (
              msg.response && <DebateView response={msg.response} />
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-3 animate-fade-in">
            <div className="w-5 h-5 flex-shrink-0 border border-[var(--amber-dim)] rounded-sm bg-[var(--amber-glow)] flex items-center justify-center"
              style={{ "--amber-glow": "rgba(232,160,32,0.08)" } as React.CSSProperties}>
              <div className="w-2 h-2 border border-[var(--amber)] border-t-transparent rounded-full animate-spin-slow" />
            </div>
            <p className="text-[11px] text-[var(--text-muted)] cursor-blink">Analysts deliberating</p>
          </div>
        )}

        {error && (
          <div className="border border-[#f87171]/30 bg-[#f87171]/05 rounded-sm px-3 py-2 animate-fade-in">
            <p className="text-[11px] text-[#f87171]">{error}</p>
          </div>
        )}

        <div ref={bottomRef} />
      </main>

      {/* Input */}
      <footer className="flex-shrink-0 p-3 border-t border-[var(--border)] bg-[var(--bg-2)]">
        <ChatInput onSubmit={handleSubmit} loading={loading} />
      </footer>
    </div>
  );
}
