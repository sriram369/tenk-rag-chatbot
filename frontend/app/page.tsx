"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const EXPERTS = [
  { name: "GPT-4o",            org: "OpenAI",    color: "#74aa9c" },
  { name: "Claude 3.5 Sonnet", org: "Anthropic", color: "#cc8b5a" },
  { name: "Gemini 2.0 Flash",  org: "Google",    color: "#4e90d8" },
  { name: "DeepSeek R1",       org: "DeepSeek",  color: "#9b76d4" },
];

const AUDIENCE = [
  { name: "GPT-OSS 120B",  org: "OpenAI" },
  { name: "Llama 3.3 70B", org: "Meta"   },
  { name: "Qwen3 235B",    org: "Alibaba"},
  { name: "Gemma 3 27B",   org: "Google" },
];

const STACK = [
  { step: "01", label: "PDF Parsing",    detail: "3 × 10-K filings extracted locally with PyPDF" },
  { step: "02", label: "Embedding",      detail: "text-embedding-3-large via OpenRouter, 1,526 vectors" },
  { step: "03", label: "Vector Storage", detail: "Pinecone (cosine similarity, 3072-dim, us-east-1)" },
  { step: "04", label: "RAG Retrieval",  detail: "Top-5 chunks per company namespace on each query" },
  { step: "05", label: "LLM Debate",     detail: "4 experts + 4 audience run in parallel via OpenRouter" },
  { step: "06", label: "Synthesis",      detail: "Claude 3.5 Sonnet judges experts-only, ignores audience" },
  { step: "07", label: "Delivery",       detail: "FastAPI on Railway → Next.js 14 on Vercel" },
];

function Counter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = Math.ceil(target / 40);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(start);
    }, 30);
    return () => clearInterval(timer);
  }, [target]);
  return <>{count.toLocaleString()}{suffix}</>;
}

export default function AboutPage() {
  const [visible, setVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), 100); return () => clearTimeout(t); }, []);

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] overflow-x-hidden">

      {/* ── Top bar ── */}
      <div className="border-b border-[var(--border)] bg-[var(--bg-2)] px-6 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-5 h-5 border border-[var(--amber-dim)] rounded-sm flex items-center justify-center">
            <div className="w-2 h-2 bg-[var(--amber)] rounded-sm animate-pulse-amber" />
          </div>
          <span className="font-display italic text-[15px]">10K Intelligence</span>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-[var(--text-muted)] uppercase tracking-widest">
          <a
            href="https://github.com/sriram369"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[var(--amber)] transition-colors"
          >
            github/sriram369
          </a>
          <Link href="/chat" className="text-[var(--amber)] hover:text-[var(--text)] transition-colors">
            Launch Terminal →
          </Link>
        </div>
      </div>

      {/* ── Hero ── */}
      <section className="px-6 pt-20 pb-16 max-w-5xl mx-auto">
        <div
          className="transition-all duration-700"
          style={{ opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(20px)" }}
        >
          <div className="text-[11px] text-[var(--amber)] uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
            <div className="w-8 h-px bg-[var(--amber-dim)]" />
            Team Four · Annual Report Intelligence
          </div>

          <h1 className="font-display italic text-5xl sm:text-7xl leading-[1.05] text-[var(--text)] mb-6">
            Four Analysts.<br />
            One Judge.<br />
            <span style={{ color: "var(--amber)" }}>Zero Guessing.</span>
          </h1>

          <p className="text-[15px] text-[var(--text-dim)] max-w-xl leading-relaxed mb-10">
            Ask anything about Alphabet, Amazon, or Microsoft&apos;s 2024 annual reports.
            Four expert AI models debate your question simultaneously. A judge synthesizes
            the truth. General audience models chime in — but the jury doesn&apos;t listen to them.
          </p>

          <Link
            href="/chat"
            className="inline-flex items-center gap-3 px-6 py-3 border border-[var(--amber-dim)] text-[var(--amber)] text-[13px] uppercase tracking-widest font-bold rounded-sm transition-all duration-200 hover:bg-[var(--amber-glow)] hover:border-[var(--amber)] group"
            style={{ "--amber-glow": "rgba(232,160,32,0.1)" } as React.CSSProperties}
          >
            Start Analyzing
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="transition-transform group-hover:translate-x-1">
              <path d="M1 7H13M13 7L8 2M13 7L8 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
        </div>

        {/* Stats row */}
        <div
          className="grid grid-cols-3 gap-0 mt-16 border border-[var(--border)] rounded-sm overflow-hidden transition-all duration-700 delay-300"
          style={{ opacity: visible ? 1 : 0 }}
        >
          {[
            { n: 1526, suffix: "", label: "Vectors in Pinecone" },
            { n: 8,    suffix: " LLMs", label: "Running per query" },
            { n: 3,    suffix: " companies", label: "10-K filings indexed" },
          ].map((s, i) => (
            <div key={i} className={`px-6 py-5 bg-[var(--bg-2)] ${i < 2 ? "border-r border-[var(--border)]" : ""}`}>
              <div className="font-display italic text-3xl text-[var(--amber)] mb-1">
                <Counter target={s.n} suffix={s.suffix} />
              </div>
              <div className="text-[11px] text-[var(--text-muted)] uppercase tracking-widest">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Expert Panel ── */}
      <section className="px-6 py-14 max-w-5xl mx-auto border-t border-[var(--border)]">
        <div className="flex items-baseline gap-4 mb-8">
          <span className="text-[11px] text-[var(--amber)] uppercase tracking-[0.3em]">§ 01</span>
          <h2 className="font-display italic text-3xl">The Expert Panel</h2>
          <div className="flex-1 h-px bg-[var(--border)] ml-2" />
          <span className="text-[11px] text-[var(--text-muted)]">Judge reads these</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {EXPERTS.map((e, i) => (
            <div key={i} className="border border-[var(--border)] bg-[var(--bg-2)] p-4 rounded-sm">
              <div className="w-8 h-1 rounded-full mb-3" style={{ background: e.color }} />
              <div className="text-[14px] font-bold text-[var(--text)] mb-1">{e.name}</div>
              <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest">{e.org}</div>
            </div>
          ))}
        </div>
        <p className="text-[13px] text-[var(--text-dim)] leading-relaxed max-w-2xl">
          Each expert receives the same RAG-retrieved context and answers independently.
          Their responses are passed to the judge for synthesis into a final verdict.
          No expert sees another&apos;s answer before responding.
        </p>
      </section>

      {/* ── General Audience ── */}
      <section className="px-6 py-14 max-w-5xl mx-auto border-t border-[var(--border)]">
        <div className="flex items-baseline gap-4 mb-8">
          <span className="text-[11px] text-[var(--amber)] uppercase tracking-[0.3em]">§ 02</span>
          <h2 className="font-display italic text-3xl">General Audience</h2>
          <div className="flex-1 h-px bg-[var(--border)] ml-2" />
          <span className="text-[11px] text-[var(--text-muted)]">Judge ignores these</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {AUDIENCE.map((a, i) => (
            <div key={i} className="border border-[var(--border)] bg-[var(--bg-2)] p-4 rounded-sm opacity-60">
              <div className="w-8 h-1 rounded-full mb-3 bg-[var(--border-2)]" />
              <div className="text-[13px] font-bold text-[var(--text-dim)] mb-1">{a.name}</div>
              <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest">{a.org} · Free</div>
            </div>
          ))}
        </div>
        <p className="text-[13px] text-[var(--text-dim)] leading-relaxed max-w-2xl">
          Four free-tier models from OpenRouter also read the question and share their take —
          but as general observers, not specialists. They run in parallel with the experts
          and their responses are shown separately. The judge never reads them.
        </p>
      </section>

      {/* ── How We Built It ── */}
      <section className="px-6 py-14 max-w-5xl mx-auto border-t border-[var(--border)]">
        <div className="flex items-baseline gap-4 mb-10">
          <span className="text-[11px] text-[var(--amber)] uppercase tracking-[0.3em]">§ 03</span>
          <h2 className="font-display italic text-3xl">How It Works</h2>
          <div className="flex-1 h-px bg-[var(--border)] ml-2" />
        </div>

        <div className="space-y-0">
          {STACK.map((s, i) => (
            <div
              key={i}
              className="flex gap-6 py-4 border-b border-[var(--border)] group hover:bg-[var(--bg-2)] px-2 -mx-2 rounded-sm transition-colors duration-150"
            >
              <div className="text-[11px] text-[var(--amber)] w-6 flex-shrink-0 pt-0.5 font-bold">{s.step}</div>
              <div className="flex-1 flex items-baseline gap-4 flex-wrap">
                <span className="text-[14px] font-bold text-[var(--text)] w-32 flex-shrink-0">{s.label}</span>
                <span className="text-[13px] text-[var(--text-dim)]">{s.detail}</span>
              </div>
              <div className="text-[var(--amber)] opacity-0 group-hover:opacity-100 transition-opacity text-[11px] self-center">→</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer / CTA ── */}
      <section className="px-6 py-16 max-w-5xl mx-auto border-t border-[var(--border)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div>
          <p className="font-display italic text-2xl text-[var(--text)] mb-1">Ready to interrogate the filings?</p>
          <p className="text-[13px] text-[var(--text-muted)]">
            Built by{" "}
            <a
              href="https://github.com/sriram369"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--amber)] hover:underline"
            >
              @sriram369
            </a>{" "}
            · Team Four · 2026
          </p>
        </div>
        <Link
          href="/chat"
          className="inline-flex items-center gap-3 px-8 py-4 bg-[var(--amber)] text-[var(--bg)] text-[13px] uppercase tracking-widest font-bold rounded-sm hover:opacity-90 transition-opacity group"
        >
          Open Terminal
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="transition-transform group-hover:translate-x-1">
            <path d="M1 7H13M13 7L8 2M13 7L8 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </Link>
      </section>

      {/* scanline overlay already in globals.css */}
    </div>
  );
}
