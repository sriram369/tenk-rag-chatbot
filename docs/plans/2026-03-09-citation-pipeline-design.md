# Citation Pipeline Design

**Date:** 2026-03-09
**Status:** Approved

## Problem

The RAG system retrieves source chunks from Pinecone but discards all metadata (company, page numbers) before passing context to LLMs. LLM answers contain no citations, and users cannot verify where any claim came from.

## Goal

Every LLM answer must:
1. Contain inline citations like `[Alphabet 10-K, p.47]`
2. Show a collapsible Sources panel with the exact retrieved chunks and their page numbers

## Approach: Option A — Re-ingest + Full Citation Chain

### 1. Ingest (`backend/scripts/ingest.py`)

- Parse each 10-K PDF **page by page** using PyPDF2/pdfplumber
- Track `page_start` and `page_end` for every text chunk
- Store in Pinecone with full metadata:
  ```json
  { "text": "...", "company": "alphabet", "chunk_id": 42, "page_start": 12, "page_end": 13 }
  ```
- Re-run once against all 3 PDFs (Alphabet, Amazon, Microsoft)

### 2. RAG Service (`backend/app/services/rag.py`)

- `retrieve_context` returns rich chunk dicts instead of plain strings:
  ```python
  { "text": str, "company": str, "chunk_id": int, "page_start": int, "page_end": int, "score": float }
  ```
- `format_context_for_prompt` labels each chunk in the context string:
  ```
  [Alphabet 10-K, p.12-13]: "Revenue for 2024 was $350B..."
  ```

### 3. LLM System Prompt (`backend/app/services/debate.py`)

Add instruction to every model's system prompt:
> "When using information from the provided context, cite the source inline using the format [Company 10-K, p.X]. Only cite information that comes directly from the context."

### 4. API Response

- Add `sources` field to the SSE stream — sent once per query, before expert responses
- `sources` is a deduplicated list of all retrieved chunks:
  ```json
  [
    { "company": "Alphabet", "page_start": 12, "page_end": 13, "text": "..." },
    { "company": "Amazon", "page_start": 88, "page_end": 89, "text": "..." }
  ]
  ```
- Update `StreamState` and `ChatResponse` types to include `sources`

### 5. Frontend

- Parse inline citation markers `[Company 10-K, p.X]` in answer text and render them as small clickable badges
- Add collapsible **Sources** drawer at the bottom of each answer card (expert + judge)
- Clicking a badge scrolls to the matching chunk in the Sources drawer
- Sources drawer shows: company label, page range, chunk text excerpt

## Data Flow

```
PDF → ingest.py (page-aware chunking) → Pinecone (with page metadata)
                                              ↓
User question → embed → Pinecone query → rich chunks (text + page + company)
                                              ↓
                              format_context_for_prompt (labeled)
                                              ↓
                         LLM prompt (system: cite inline)
                                              ↓
                         LLM answer (with [Company, p.X] citations)
                                              ↓
                    SSE stream: sources event + agent events
                                              ↓
                    Frontend: inline badges + Sources drawer
```

## Files to Change

| File | Change |
|------|--------|
| `backend/scripts/ingest.py` | Page-aware chunking, store `page_start`/`page_end` |
| `backend/app/services/rag.py` | Return rich chunk dicts, label context string |
| `backend/app/services/debate.py` | Add citation instruction to system prompts |
| `backend/app/routers/chat.py` | Stream `sources` event, update response model |
| `frontend/lib/types.ts` | Add `sources` to `StreamState` and `ChatResponse` |
| `frontend/lib/api.ts` | Handle `sources` SSE event |
| `frontend/components/LiveDebate.tsx` | Sources drawer + inline citation badges |
