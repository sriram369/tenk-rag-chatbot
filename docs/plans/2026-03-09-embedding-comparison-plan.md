# Embedding Model Comparison Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Re-ingest 10-K PDFs with text-embedding-3-small into separate Pinecone namespaces, add embedding_model param to API, add toggle to frontend UI.

**Architecture:** New namespaces (alphabet-small, amazon-small, microsoft-small) alongside existing ones. API accepts embedding_tier param. Frontend shows large/small toggle pill.

**Tech Stack:** Python/FastAPI backend, Pinecone, Next.js/Tailwind frontend.

---

### Task 1: Re-ingest with text-embedding-3-small

**Files:**
- Modify: `backend/scripts/ingest.py`

**Step 1: Add EMBEDDING_MODEL_SMALL constant and NAMESPACE_SUFFIX config**

At the top of ingest.py, after existing constants add:
```python
EMBEDDING_MODEL_SMALL = "text-embedding-3-small"
NAMESPACE_SUFFIX = os.getenv("NAMESPACE_SUFFIX", "")  # e.g. "-small"
```

**Step 2: Update embed_chunks to accept model param**

Change signature to:
```python
def embed_chunks(chunks: list[dict], client: OpenAI, model: str = EMBEDDING_MODEL) -> list[dict]:
```

**Step 3: Update upsert_to_pinecone to accept namespace suffix**

Change signature to:
```python
def upsert_to_pinecone(chunks: list[dict], index, namespace: str):
```
(already takes namespace as param — no change needed)

**Step 4: Update main() to support small model run**

Add CLI arg support at bottom of main():
```python
import sys
model_size = sys.argv[1] if len(sys.argv) > 1 else "large"
embedding_model = EMBEDDING_MODEL if model_size == "large" else EMBEDDING_MODEL_SMALL
namespace_suffix = "" if model_size == "large" else "-small"
```

Use these in the loop:
```python
chunks = embed_chunks(chunks, openai_client, model=embedding_model)
upsert_to_pinecone(chunks, index, namespace=f"{company}{namespace_suffix}")
```

**Step 5: Run ingestion with small model**

```bash
cd "/Users/sriram/Downloads/10k /backend"
source venv/bin/activate
python scripts/ingest.py small
```

Wait for completion (~2-5 min).

**Step 6: Commit**
```bash
cd "/Users/sriram/Downloads/10k "
git add backend/scripts/ingest.py
git commit -m "feat: support configurable embedding model + small namespace ingestion"
```

---

### Task 2: Update RAG service to support embedding tier

**Files:**
- Modify: `backend/app/services/rag.py`

**Step 1: Add EMBEDDING_MODEL_SMALL constant**

After existing EMBEDDING_MODEL constant:
```python
EMBEDDING_MODEL_SMALL = "text-embedding-3-small"
NAMESPACE_SUFFIX = {"large": "", "small": "-small"}
```

**Step 2: Update retrieve_context signature**

```python
def retrieve_context(query: str, companies: list[str] | None = None, embedding_tier: str = "large") -> dict[str, list[dict]]:
```

**Step 3: Use correct model and namespace based on tier**

Inside retrieve_context:
```python
model = EMBEDDING_MODEL if embedding_tier == "large" else EMBEDDING_MODEL_SMALL
suffix = NAMESPACE_SUFFIX.get(embedding_tier, "")
query_embedding = embed_query(query, client, model=model)
```

In the per-company loop:
```python
results = index.query(
    vector=query_embedding,
    top_k=TOP_K,
    namespace=f"{company}{suffix}",
    include_metadata=True,
)
```

**Step 4: Update embed_query to accept model param**

```python
def embed_query(query: str, client: OpenAI, model: str = EMBEDDING_MODEL) -> list[float]:
    response = client.embeddings.create(model=model, input=query)
    return response.data[0].embedding
```

**Step 5: Commit**
```bash
cd "/Users/sriram/Downloads/10k "
git add backend/app/services/rag.py
git commit -m "feat: RAG service supports embedding_tier param (large/small)"
```

---

### Task 3: Update API to accept embedding_model param

**Files:**
- Modify: `backend/app/routers/chat.py`

**Step 1: Add embedding_tier to ChatRequest**

```python
class ChatRequest(BaseModel):
    question: str
    companies: list[str] | None = None
    embedding_tier: str = "large"  # "large" | "small"
```

**Step 2: Pass embedding_tier through in chat_stream**

```python
context = retrieve_context(request.question, request.companies, request.embedding_tier)
```

Also update the batch /chat endpoint the same way.

**Step 3: Commit**
```bash
cd "/Users/sriram/Downloads/10k "
git add backend/app/routers/chat.py
git commit -m "feat: API accepts embedding_tier param, passes to RAG service"
```

---

### Task 4: Add embedding toggle to frontend

**Files:**
- Modify: `frontend/lib/types.ts`
- Modify: `frontend/lib/api.ts`
- Modify: `frontend/app/chat/page.tsx`

**Step 1: Add embedding_tier to ChatRequest type**

In types.ts, update ChatRequest:
```typescript
export interface ChatRequest {
  question: string;
  companies?: string[];
  embedding_tier?: "large" | "small";
}
```

**Step 2: Add EmbeddingToggle UI in chat/page.tsx**

Add state:
```typescript
const [embeddingTier, setEmbeddingTier] = useState<"large" | "small">("large");
```

Add toggle UI below the company selector pills (find the company toggle section and add after it):
```tsx
{/* Embedding model toggle */}
<div className="flex items-center gap-2 mt-2">
  <span className="text-xs text-white/40">Embeddings:</span>
  {(["large", "small"] as const).map((tier) => (
    <button
      key={tier}
      onClick={() => setEmbeddingTier(tier)}
      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
        embeddingTier === tier
          ? "bg-white/20 text-white"
          : "bg-white/5 text-white/40 hover:bg-white/10"
      }`}
    >
      {tier === "large" ? "3-large · best" : "3-small · fast"}
    </button>
  ))}
</div>
```

**Step 3: Pass embedding_tier in streamChat call**

Update the streamChat call to include embedding_tier:
```typescript
await streamChat(
  { question, companies: selected, embedding_tier: embeddingTier },
  { ... }
)
```

**Step 4: Add embedding tier label to response**

In the streaming state display, find where the question is shown and add a small badge showing which tier was used. Add to StreamState:
```typescript
embedding_tier?: "large" | "small";
```

Update emptyStreamState and onSources/onDone to capture it.

Actually keep it simple — just show it in the UI toggle, no need to track in state.

**Step 5: Commit**
```bash
cd "/Users/sriram/Downloads/10k "
git add frontend/lib/types.ts frontend/app/chat/page.tsx
git commit -m "feat: embedding tier toggle in frontend UI"
```

---

### Task 5: Deploy and verify

**Step 1: Push to GitHub (triggers Railway backend deploy)**
```bash
cd "/Users/sriram/Downloads/10k "
git push origin main
```

**Step 2: Deploy frontend**
```bash
cd "/Users/sriram/Downloads/10k /frontend"
npx vercel --prod --yes
```

**Step 3: Smoke test**
- Ask "How much cash does Amazon have at end of 2024?" with 3-large
- Switch to 3-small, ask same question
- Verify both return answers (quality may differ)
- Screenshot both for presentation
