# Multi-Model RAG Chatbot — Design Document
**Date:** 2026-03-05
**Project:** JHU CDHAI Final Project — 10K Financial Chatbot
**Goal:** Build the best-in-class RAG chatbot comparing Alphabet, Amazon, and Microsoft 10K filings

---

## What We're Building

A **Multi-Model LLM Ensemble RAG chatbot** that:
1. Retrieves relevant chunks from 3 company 10K PDFs (Google, Amazon, Microsoft)
2. Sends those chunks to 4 LLMs simultaneously
3. Each LLM gives its own answer (debate round)
4. A judge LLM synthesizes the final answer
5. Shows users the individual model responses + final answer

This architecture directly addresses the professor's requirements:
- Compare model performance (deepseek vs llama vs GPT-4o vs Claude)
- Detect hallucinations (agents disagree = flag it)
- Explore model boundaries

---

## Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | Next.js + Tailwind CSS | Looks like a real product |
| Backend | FastAPI (Python) on Railway | Python-native for LangChain/RAG |
| Vector DB | Pinecone | Cloud-hosted, free tier, fast |
| LLMs | OpenRouter API | All models (GPT-4o, Claude, Gemini, Deepseek) via one key |
| Embeddings | OpenAI text-embedding-3-large | Best quality embeddings |
| PDF Ingestion | One-time Python script | Runs locally, pushes to Pinecone |

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Next.js Frontend (Vercel)          │
│   - Chat UI                                          │
│   - Shows each agent's answer                        │
│   - Shows final synthesized answer                   │
│   - Sources/citations panel                          │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP
┌──────────────────────▼──────────────────────────────┐
│                FastAPI Backend (Railway)             │
│                                                      │
│  1. Receive question                                 │
│  2. Embed question → query Pinecone                  │
│  3. Retrieve top 5 chunks per company                │
│  4. Send to 4 agents in parallel (OpenRouter)        │
│  5. Judge agent synthesizes                          │
│  6. Return structured response                       │
└──────────┬──────────────────────┬───────────────────┘
           │                      │
┌──────────▼──────┐    ┌──────────▼──────────────────┐
│  Pinecone DB    │    │  OpenRouter API              │
│                 │    │                              │
│  namespace:     │    │  Agent 1: GPT-4o             │
│  - alphabet     │    │  Agent 2: Claude 3.5 Sonnet  │
│  - amazon       │    │  Agent 3: Gemini 1.5 Pro     │
│  - microsoft    │    │  Agent 4: Deepseek R1        │
└─────────────────┘    │  Judge:   GPT-4o             │
                       └──────────────────────────────┘
```

---

## RAG Design

### Chunking Strategy
- **Chunk size:** 1000 tokens with 200 token overlap
- **Method:** Recursive character text splitting (respects paragraph boundaries)
- **Metadata stored per chunk:** company, page number, section name

### Embedding
- Model: `text-embedding-3-large` (OpenAI via OpenRouter)
- Dimension: 3072

### Retrieval
- Top 5 chunks per query
- If question is company-specific → query that namespace only
- If comparative question → query all 3 namespaces, top 5 each

### Pinecone Namespaces
- `alphabet-10k`
- `amazon-10k`
- `microsoft-10k`

---

## Multi-Agent Debate Design

### Round 1 — Parallel Agent Answers
All 4 agents receive:
```
System: You are a financial analyst expert. Answer based ONLY on the provided context.
        Be precise with numbers. Cite specific sections.

Context: [retrieved chunks]

Question: [user question]
```

### Round 2 — Judge Synthesis
Judge (GPT-4o) receives all 4 answers and:
- Identifies consensus points
- Flags disagreements
- Produces final answer with confidence level
- Notes if any agent likely hallucinated

---

## Frontend Design

### Chat Interface
- Clean chat UI (like ChatGPT)
- Company selector (All / Alphabet / Amazon / Microsoft)
- Response shows:
  - Final answer (prominent)
  - Collapsible "Model Debate" section showing all 4 agent answers
  - Sources panel with PDF page references

### Key Pages
- `/` — Main chat
- `/compare` — Side-by-side company comparison mode

---

## System Prompt Strategy

```
You are FinBot, an expert financial analyst specializing in Big Tech 10-K filings.
You have access to the 2024 annual reports for Alphabet (Google), Amazon, and Microsoft.

Rules:
1. ONLY answer from the provided context. Never make up numbers.
2. Always cite the company name and section when referencing data.
3. For numerical questions, quote the exact figure from the document.
4. If context is insufficient, say so explicitly — never guess.
5. For comparative questions, structure your answer by company.
```

---

## PDF Files
- `/10kFiles/Alpha/Alphabet 10K 2024.pdf`
- `/10kFiles/Amazon/Amazon 10K 2024.pdf`
- `/10kFiles/Microsoft/MSFT 10-K.pdf`

---

## Deployment

| Service | What runs there | Free tier |
|---------|----------------|-----------|
| Vercel | Next.js frontend | Yes |
| Railway | FastAPI backend | $5/month or free trial |
| Pinecone | Vector DB | Yes (1 index, 100k vectors) |
| OpenRouter | LLM API | Pay per token (~$0.01/query) |

---

## Why This Wins

1. **Accuracy** — ensemble of 4 models beats any single model
2. **Anti-hallucination** — disagreement detection built in
3. **Great presentation story** — real data comparing GPT-4o vs Claude vs Gemini vs Deepseek
4. **Looks like a real product** — Next.js, not Streamlit
5. **Covers all professor requirements** — model comparison, boundary exploration, hallucination detection

---

## Team Roles (fill in)
- [ ] PDF ingestion + Pinecone setup
- [ ] FastAPI backend + agent orchestration
- [ ] Next.js frontend
- [ ] System prompt engineering + testing
- [ ] Presentation + question design
