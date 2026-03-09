# Citation Pipeline Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add real page-level citations to every LLM answer — inline badges like `[Alphabet 10-K, p.47]` plus a collapsible Sources panel under each answer card.

**Architecture:** Re-ingest PDFs tracking page numbers per chunk → pass rich chunk metadata through RAG → instruct LLMs to cite inline → stream a `sources` SSE event → render badges and drawer in the frontend.

**Tech Stack:** Python/FastAPI backend, pypdf (already installed), Pinecone, Next.js/React frontend, Tailwind CSS.

---

### Task 1: Page-aware PDF ingestion

**Files:**
- Modify: `backend/scripts/ingest.py`

**Step 1: Replace `extract_text` with page-aware extraction**

Replace the entire `extract_text` function and `chunk_text` function with these:

```python
def extract_pages(pdf_path: Path) -> list[dict]:
    """Returns list of {page_num, text} for each page."""
    print(f"  Reading {pdf_path.name}...")
    reader = PdfReader(pdf_path)
    pages = []
    for i, page in enumerate(reader.pages):
        text = page.extract_text() or ""
        if text.strip():
            pages.append({"page_num": i + 1, "text": text})
    return pages


def chunk_pages(pages: list[dict], company: str) -> list[dict]:
    """Chunks text while tracking which pages each chunk spans."""
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
        separators=["\n\n", "\n", ". ", " ", ""],
    )
    chunks = []
    chunk_id = 0
    for page in pages:
        page_chunks = splitter.split_text(page["text"])
        for chunk_text in page_chunks:
            chunks.append({
                "text": chunk_text,
                "company": company,
                "chunk_id": chunk_id,
                "page_num": page["page_num"],
            })
            chunk_id += 1
    return chunks
```

**Step 2: Update `upsert_to_pinecone` to store page_num**

Replace the metadata dict inside `upsert_to_pinecone`:

```python
"metadata": {
    "text": c["text"],
    "company": c["company"],
    "chunk_id": c["chunk_id"],
    "page_num": c["page_num"],
},
```

**Step 3: Update `main()` to use new functions**

Replace `extract_text` and `chunk_text` calls in `main()`:

```python
pages = extract_pages(pdf_path)
print(f"  Extracted {len(pages)} pages")

chunks = chunk_pages(pages, company)
print(f"  Split into {len(chunks)} chunks")
```

**Step 4: Re-run ingestion**

```bash
cd "/Users/sriram/Downloads/10k "
source backend/venv/bin/activate
cd backend && python scripts/ingest.py
```

Expected output: `Ingestion complete!` with stats for all 3 namespaces.

**Step 5: Commit**

```bash
git add backend/scripts/ingest.py
git commit -m "feat: page-aware PDF ingestion — store page_num per chunk in Pinecone"
```

---

### Task 2: Update RAG service to return rich chunk metadata

**Files:**
- Modify: `backend/app/services/rag.py`

**Step 1: Update `retrieve_context` return type**

Replace the entire `retrieve_context` function:

```python
def retrieve_context(query: str, companies: list[str] | None = None) -> dict[str, list[dict]]:
    """
    Returns a dict mapping company name -> list of chunk dicts.
    Each chunk dict: { text, company, chunk_id, page_num, score }
    """
    if companies is None:
        companies = ["alphabet", "amazon", "microsoft"]

    client, index = _get_clients()
    query_embedding = embed_query(query, client)

    context: dict[str, list[dict]] = {}
    for company in companies:
        results = index.query(
            vector=query_embedding,
            top_k=TOP_K,
            namespace=company,
            include_metadata=True,
        )
        chunks = [
            {
                "text": match.metadata.get("text", ""),
                "company": match.metadata.get("company", company),
                "chunk_id": match.metadata.get("chunk_id", 0),
                "page_num": int(match.metadata.get("page_num", 0)),
                "score": round(float(match.score), 4),
            }
            for match in results.matches
            if match.metadata
        ]
        context[company] = chunks

    return context
```

**Step 2: Update `format_context_for_prompt` to label each chunk**

Replace the entire `format_context_for_prompt` function:

```python
def format_context_for_prompt(context: dict[str, list[dict]]) -> str:
    """Formats retrieved chunks into a labeled string for LLM prompts."""
    sections = []
    for company, chunks in context.items():
        if chunks:
            labeled = []
            for chunk in chunks:
                page = chunk.get("page_num", "?")
                label = f"[{company.capitalize()} 10-K, p.{page}]"
                labeled.append(f"{label}: {chunk['text']}")
            combined = "\n\n".join(labeled)
            sections.append(f"=== {company.upper()} 10-K ===\n{combined}")
    return "\n\n".join(sections)


def get_sources_list(context: dict[str, list[dict]]) -> list[dict]:
    """Returns a flat deduplicated list of source chunks for the API response."""
    sources = []
    seen = set()
    for company, chunks in context.items():
        for chunk in chunks:
            key = (company, chunk["page_num"], chunk["chunk_id"])
            if key not in seen:
                seen.add(key)
                sources.append({
                    "company": company.capitalize(),
                    "page_num": chunk["page_num"],
                    "chunk_id": chunk["chunk_id"],
                    "text": chunk["text"][:300],  # truncate for UI
                    "score": chunk["score"],
                })
    return sorted(sources, key=lambda x: (-x["score"]))
```

**Step 3: Commit**

```bash
git add backend/app/services/rag.py
git commit -m "feat: RAG service returns rich chunk metadata with page numbers"
```

---

### Task 3: Add citation instructions to LLM system prompts

**Files:**
- Modify: `backend/app/services/debate.py`

**Step 1: Update `EXPERT_SYSTEM_PROMPT`**

Replace it with:

```python
EXPERT_SYSTEM_PROMPT = """You are a financial analyst expert specializing in analyzing SEC 10-K filings.
You will be given relevant excerpts from 10-K annual reports, each labeled with their source like [Alphabet 10-K, p.47].
Provide a precise, accurate answer citing specific numbers, figures, and facts from the documents.
IMPORTANT: When you use information from the context, cite the source inline using the exact label format shown, e.g. [Alphabet 10-K, p.47].
Only cite information that comes directly from the provided context. If information is not in the context, say so clearly.
Be concise but thorough."""
```

**Step 2: Update `AUDIENCE_SYSTEM_PROMPT`**

Replace it with:

```python
AUDIENCE_SYSTEM_PROMPT = """You are a member of the general public giving your opinion on a financial question.
You have some general knowledge but are not a specialist. You will be given context from 10-K filings, each labeled with their source.
Share your perspective briefly and conversationally. If you reference something from the documents, use the source label shown, e.g. [Alphabet 10-K, p.12].
Be honest about what you do and don't understand."""
```

**Step 3: Commit**

```bash
git add backend/app/services/debate.py
git commit -m "feat: add inline citation instructions to all LLM system prompts"
```

---

### Task 4: Stream `sources` event from the API

**Files:**
- Modify: `backend/app/routers/chat.py`
- Modify: `backend/app/services/debate.py`

**Step 1: Import `get_sources_list` in `chat.py`**

Update the import line at the top of `chat.py`:

```python
from app.services.rag import retrieve_context, format_context_for_prompt, get_sources_list
```

**Step 2: Stream sources before debate starts**

In `chat.py`, update the `chat_stream` endpoint to pass sources to the debate stream:

```python
@router.post("/chat/stream")
async def chat_stream(request: ChatRequest):
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    context = retrieve_context(request.question, request.companies)
    formatted_context = format_context_for_prompt(context)

    if not formatted_context.strip():
        raise HTTPException(status_code=404, detail="No relevant context found. Make sure PDFs have been ingested.")

    sources = get_sources_list(context)

    return StreamingResponse(
        stream_debate(request.question, formatted_context, sources),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )
```

**Step 3: Update `stream_debate` signature to emit sources event**

In `debate.py`, update the `stream_debate` function signature and add sources emission at the top:

```python
async def stream_debate(question: str, context: str, sources: list[dict] | None = None) -> AsyncGenerator[str, None]:
    """
    SSE generator: yields events as each model completes.
    event: sources → list of source chunk dicts
    event: agent   → { type, agent, model, answer, error }
    event: judging → {}
    event: verdict → { variant, agent, answer }
    event: done    → {}
    """
    client = _get_client()

    # Emit sources first so frontend can display them immediately
    if sources:
        yield f"event: sources\ndata: {json.dumps(sources)}\n\n"

    # ... rest of the existing function unchanged
```

**Step 4: Commit**

```bash
git add backend/app/routers/chat.py backend/app/services/debate.py
git commit -m "feat: stream sources SSE event with page citations before debate starts"
```

---

### Task 5: Update frontend types

**Files:**
- Modify: `frontend/lib/types.ts`

**Step 1: Add `SourceChunk` type and update `StreamState`**

Add after the existing interfaces:

```typescript
export interface SourceChunk {
  company: string;
  page_num: number;
  chunk_id: number;
  text: string;
  score: number;
}
```

Update `StreamState` to include sources:

```typescript
export interface StreamState {
  experts:  Record<string, AgentCardState>;
  audience: Record<string, AgentCardState>;
  verdicts: {
    primary?:   string;
    secondary?: string;
  };
  sources:   SourceChunk[];
  isJudging: boolean;
  isDone:    boolean;
}
```

**Step 2: Commit**

```bash
git add frontend/lib/types.ts
git commit -m "feat: add SourceChunk type and sources field to StreamState"
```

---

### Task 6: Handle `sources` event in the API client

**Files:**
- Modify: `frontend/lib/api.ts`

**Step 1: Add `onSources` callback and update `emptyStreamState`**

Update `emptyStreamState`:

```typescript
export function emptyStreamState(): StreamState {
  return { experts: {}, audience: {}, verdicts: {}, sources: [], isJudging: false, isDone: false };
}
```

Update `streamChat` to accept and handle `onSources`:

```typescript
export async function streamChat(
  request: ChatRequest,
  callbacks: {
    onSources: (sources: SourceChunk[]) => void;
    onAgent:   (type: "expert" | "audience", agent: string, answer: string | null, error: string | null) => void;
    onJudging: () => void;
    onVerdict: (variant: "primary" | "secondary", agent: string, answer: string) => void;
    onDone:    () => void;
    onError:   (msg: string) => void;
  }
)
```

Add the import at the top:

```typescript
import { ChatRequest, ChatResponse, StreamState, SourceChunk } from "./types";
```

Add the handler inside the SSE parsing loop:

```typescript
if      (eventType === "sources") callbacks.onSources(data);
else if (eventType === "agent")   callbacks.onAgent(data.type, data.agent, data.answer, data.error);
else if (eventType === "judging") callbacks.onJudging();
else if (eventType === "verdict") callbacks.onVerdict(data.variant, data.agent, data.answer);
else if (eventType === "done")    callbacks.onDone();
```

**Step 2: Update the call site in `frontend/app/chat/page.tsx`**

Add `onSources` handler to the `streamChat` call:

```typescript
onSources: (sources) => {
  update({ ...current, sources });
},
```

**Step 3: Commit**

```bash
git add frontend/lib/api.ts frontend/app/chat/page.tsx
git commit -m "feat: handle sources SSE event in API client and chat page"
```

---

### Task 7: Render inline citation badges and Sources drawer

**Files:**
- Modify: `frontend/components/AgentCard.tsx`
- Create: `frontend/components/SourcesDrawer.tsx`
- Modify: `frontend/components/LiveDebate.tsx`

**Step 1: Create `SourcesDrawer.tsx`**

```tsx
"use client";

import { useState } from "react";
import { SourceChunk } from "@/lib/types";

const COMPANY_COLORS: Record<string, string> = {
  Alphabet:  "#4ade80",
  Amazon:    "#fb923c",
  Microsoft: "#60a5fa",
};

export function SourcesDrawer({ sources }: { sources: SourceChunk[] }) {
  const [open, setOpen] = useState(false);
  if (!sources.length) return null;

  return (
    <div className="mt-3 border border-white/10 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2 bg-white/5 hover:bg-white/10 text-xs text-white/60 transition-colors"
      >
        <span>Sources ({sources.length} chunks retrieved)</span>
        <span>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="divide-y divide-white/5 max-h-64 overflow-y-auto">
          {sources.map((s, i) => (
            <div key={i} className="px-3 py-2">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="text-xs font-bold px-1.5 py-0.5 rounded"
                  style={{ color: COMPANY_COLORS[s.company] ?? "#aaa", border: `1px solid ${COMPANY_COLORS[s.company] ?? "#aaa"}33` }}
                >
                  {s.company} 10-K · p.{s.page_num}
                </span>
                <span className="text-xs text-white/30">score: {s.score}</span>
              </div>
              <p className="text-xs text-white/50 leading-relaxed line-clamp-3">{s.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Add inline citation rendering to `AgentCard.tsx`**

Read the current file first, then add a `renderWithCitations` helper that wraps `[Company 10-K, p.X]` patterns in styled `<span>` badges:

```tsx
function renderWithCitations(text: string) {
  const parts = text.split(/(\[[^\]]+10-K[^\]]*\])/g);
  return parts.map((part, i) => {
    if (/^\[[^\]]+10-K[^\]]*\]$/.test(part)) {
      return (
        <span
          key={i}
          className="inline-flex items-center mx-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-white/10 text-white/70 border border-white/20"
        >
          {part}
        </span>
      );
    }
    return part;
  });
}
```

Use it in the answer rendering: replace `{card.answer}` with `{renderWithCitations(card.answer)}`.

**Step 3: Add `SourcesDrawer` to `LiveDebate.tsx`**

Import and render `SourcesDrawer` with `state.sources` below the expert/audience panels:

```tsx
import { SourcesDrawer } from "./SourcesDrawer";

// Inside the render, after the existing panels:
<SourcesDrawer sources={state.sources} />
```

**Step 4: Commit**

```bash
git add frontend/components/SourcesDrawer.tsx frontend/components/AgentCard.tsx frontend/components/LiveDebate.tsx
git commit -m "feat: inline citation badges and collapsible Sources drawer in UI"
```

---

### Task 8: Deploy and verify

**Step 1: Push backend changes to Railway**

```bash
git push origin main
```

Railway auto-deploys on push. Wait ~2 min, then check:
```
curl https://tenk-rag-chatbot-production-9b79.up.railway.app/health
```

**Step 2: Deploy frontend to Vercel**

```bash
cd frontend && npx vercel --prod --yes
```

**Step 3: Smoke test**

Ask a question like *"What was Alphabet's total revenue in 2024?"* and verify:
- Inline citations like `[Alphabet 10-K, p.47]` appear in expert answers
- Sources drawer shows chunks with real page numbers
- Page numbers are plausible (not 0)

**Step 4: Final commit**

```bash
git commit --allow-empty -m "chore: citation pipeline complete — page-level RAG citations live"
```