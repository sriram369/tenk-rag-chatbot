# Multi-Model RAG Chatbot Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Multi-Model LLM Ensemble RAG chatbot comparing Alphabet, Amazon, and Microsoft 10K filings, deployed on Vercel (frontend) + Railway (backend).

**Architecture:** FastAPI backend handles PDF ingestion, Pinecone vector retrieval, and parallel multi-agent LLM debate via OpenRouter. Next.js frontend provides a polished chat UI showing individual agent answers + final synthesized response.

**Tech Stack:** Next.js 14, Tailwind CSS, FastAPI, LangChain, Pinecone, OpenRouter API, text-embedding-3-large

---

## Prerequisites (Do These First)

1. Sign up for [Pinecone](https://pinecone.io) — get API key + create index named `tenk-rag` with dimension `3072`, metric `cosine`
2. Sign up for [OpenRouter](https://openrouter.ai) — get API key (add $5 credit)
3. Sign up for [Railway](https://railway.app) — connect GitHub
4. Sign up for [Vercel](https://vercel.com) — connect GitHub
5. Have Python 3.11+ and Node.js 18+ installed

---

## Task 1: Project Structure Setup

**Files:**
- Create: `backend/` directory
- Create: `frontend/` directory
- Create: `.env.example`
- Create: `README.md`

**Step 1: Initialize directory structure**

```bash
cd "/Users/sriram/Downloads/10k "
mkdir -p backend/app/routers
mkdir -p backend/scripts
mkdir -p frontend
```

**Step 2: Create backend requirements.txt**

Create `backend/requirements.txt`:
```
fastapi==0.111.0
uvicorn==0.30.0
python-dotenv==1.0.0
langchain==0.2.0
langchain-community==0.2.0
langchain-openai==0.1.0
pinecone-client==3.2.0
pypdf==4.2.0
httpx==0.27.0
openai==1.30.0
pydantic==2.7.0
```

**Step 3: Create .env.example**

Create `.env.example` at project root:
```
OPENROUTER_API_KEY=your_openrouter_key_here
PINECONE_API_KEY=your_pinecone_key_here
PINECONE_INDEX_NAME=tenk-rag
NEXT_PUBLIC_API_URL=http://localhost:8000
```

**Step 4: Create .env (copy from example, fill in real keys)**

```bash
cp .env.example .env
# Edit .env with real API keys
```

**Step 5: Add .gitignore**

Create `.gitignore`:
```
.env
__pycache__/
*.pyc
node_modules/
.next/
.vercel/
*.egg-info/
dist/
```

**Step 6: Initialize git**

```bash
git init
git add .gitignore .env.example backend/requirements.txt
git commit -m "feat: initial project structure"
```

---

## Task 2: Python Environment Setup

**Files:**
- Create: `backend/venv/` (virtual env, gitignored)

**Step 1: Create virtual environment**

```bash
cd "/Users/sriram/Downloads/10k /backend"
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

**Step 2: Verify install**

```bash
python -c "import fastapi, pinecone, langchain; print('all good')"
```
Expected: `all good`

---

## Task 3: PDF Ingestion Script

**Files:**
- Create: `backend/scripts/ingest.py`

This script runs ONCE locally to chunk the 3 PDFs and push to Pinecone.

**Step 1: Create ingest.py**

Create `backend/scripts/ingest.py`:
```python
import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
from pinecone import Pinecone, ServerlessSpec

load_dotenv(Path(__file__).parent.parent.parent / ".env")

PINECONE_API_KEY = os.environ["PINECONE_API_KEY"]
OPENROUTER_API_KEY = os.environ["OPENROUTER_API_KEY"]
INDEX_NAME = os.environ.get("PINECONE_INDEX_NAME", "tenk-rag")

PDF_FILES = {
    "alphabet": "/Users/sriram/Downloads/10k /10kFiles/Alpha/Alphabet 10K 2024.pdf",
    "amazon": "/Users/sriram/Downloads/10k /10kFiles/Amazon/Amazon 10K 2024.pdf",
    "microsoft": "/Users/sriram/Downloads/10k /10kFiles/Microsoft/MSFT 10-K.pdf",
}

def get_embeddings():
    return OpenAIEmbeddings(
        model="text-embedding-3-large",
        openai_api_key=OPENROUTER_API_KEY,
        openai_api_base="https://openrouter.ai/api/v1",
    )

def load_and_chunk(pdf_path: str, company: str):
    print(f"Loading {company}...")
    loader = PyPDFLoader(pdf_path)
    docs = loader.load()

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        separators=["\n\n", "\n", " ", ""],
    )
    chunks = splitter.split_documents(docs)

    # Add company metadata to each chunk
    for chunk in chunks:
        chunk.metadata["company"] = company
        chunk.metadata["source"] = f"{company}-10k-2024"

    print(f"  {company}: {len(chunks)} chunks")
    return chunks

def upsert_to_pinecone(chunks, company: str, embeddings, index):
    batch_size = 100
    texts = [c.page_content for c in chunks]
    metadatas = [c.metadata for c in chunks]

    print(f"  Embedding {len(texts)} chunks for {company}...")

    for i in range(0, len(texts), batch_size):
        batch_texts = texts[i:i+batch_size]
        batch_meta = metadatas[i:i+batch_size]

        vectors = embeddings.embed_documents(batch_texts)

        to_upsert = [
            {
                "id": f"{company}-{i+j}",
                "values": vectors[j],
                "metadata": {**batch_meta[j], "text": batch_texts[j]}
            }
            for j in range(len(batch_texts))
        ]

        index.upsert(vectors=to_upsert, namespace=company)
        print(f"  Upserted batch {i//batch_size + 1}")

def main():
    print("Connecting to Pinecone...")
    pc = Pinecone(api_key=PINECONE_API_KEY)

    if INDEX_NAME not in [i.name for i in pc.list_indexes()]:
        print(f"Creating index {INDEX_NAME}...")
        pc.create_index(
            name=INDEX_NAME,
            dimension=3072,
            metric="cosine",
            spec=ServerlessSpec(cloud="aws", region="us-east-1")
        )

    index = pc.Index(INDEX_NAME)
    embeddings = get_embeddings()

    for company, pdf_path in PDF_FILES.items():
        chunks = load_and_chunk(pdf_path, company)
        upsert_to_pinecone(chunks, company, embeddings, index)
        print(f"Done: {company}")

    print("\nIngestion complete!")
    stats = index.describe_index_stats()
    print(f"Total vectors: {stats.total_vector_count}")

if __name__ == "__main__":
    main()
```

**Step 2: Run ingestion**

```bash
cd "/Users/sriram/Downloads/10k /backend"
source venv/bin/activate
python scripts/ingest.py
```

Expected output:
```
Loading alphabet... alphabet: ~800 chunks
Loading amazon...   amazon: ~600 chunks
Loading microsoft... microsoft: ~700 chunks
Ingestion complete!
Total vectors: ~2100
```

**Step 3: Verify in Pinecone dashboard**
- Go to pinecone.io → your index → should see 3 namespaces with vectors

**Step 4: Commit**

```bash
git add backend/scripts/ingest.py
git commit -m "feat: add PDF ingestion script for 3 10K files"
```

---

## Task 4: FastAPI App Foundation

**Files:**
- Create: `backend/app/main.py`
- Create: `backend/app/config.py`

**Step 1: Create config.py**

Create `backend/app/config.py`:
```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    openrouter_api_key: str
    pinecone_api_key: str
    pinecone_index_name: str = "tenk-rag"

    class Config:
        env_file = ".env"

settings = Settings()
```

**Step 2: Create main.py**

Create `backend/app/main.py`:
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import chat

app = FastAPI(title="10K RAG Chatbot API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router, prefix="/api")

@app.get("/health")
def health():
    return {"status": "ok"}
```

**Step 3: Run and verify**

```bash
cd "/Users/sriram/Downloads/10k /backend"
source venv/bin/activate
pip install pydantic-settings
uvicorn app.main:app --reload --port 8000
```

Visit `http://localhost:8000/health` → should see `{"status": "ok"}`

**Step 4: Commit**

```bash
git add backend/app/main.py backend/app/config.py
git commit -m "feat: fastapi app foundation with CORS"
```

---

## Task 5: RAG Retrieval Service

**Files:**
- Create: `backend/app/services/retrieval.py`

**Step 1: Create retrieval.py**

Create `backend/app/services/retrieval.py`:
```python
import os
from typing import List, Optional
from pinecone import Pinecone
from langchain_openai import OpenAIEmbeddings

COMPANIES = ["alphabet", "amazon", "microsoft"]

def get_embeddings():
    return OpenAIEmbeddings(
        model="text-embedding-3-large",
        openai_api_key=os.environ["OPENROUTER_API_KEY"],
        openai_api_base="https://openrouter.ai/api/v1",
    )

def get_pinecone_index():
    pc = Pinecone(api_key=os.environ["PINECONE_API_KEY"])
    return pc.Index(os.environ.get("PINECONE_INDEX_NAME", "tenk-rag"))

def retrieve_context(query: str, company: Optional[str] = None, top_k: int = 5) -> List[dict]:
    """
    Retrieve relevant chunks from Pinecone.
    If company is None, queries all 3 namespaces.
    Returns list of {text, company, page, score}
    """
    embeddings = get_embeddings()
    index = get_pinecone_index()
    query_vector = embeddings.embed_query(query)

    results = []
    namespaces = [company] if company else COMPANIES

    for ns in namespaces:
        response = index.query(
            vector=query_vector,
            top_k=top_k,
            namespace=ns,
            include_metadata=True,
        )
        for match in response.matches:
            results.append({
                "text": match.metadata.get("text", ""),
                "company": match.metadata.get("company", ns),
                "page": match.metadata.get("page", 0),
                "score": match.score,
            })

    # Sort by relevance score
    results.sort(key=lambda x: x["score"], reverse=True)
    return results[:top_k * len(namespaces)]

def format_context(chunks: List[dict]) -> str:
    """Format retrieved chunks into a context string for LLMs."""
    context_parts = []
    for i, chunk in enumerate(chunks, 1):
        context_parts.append(
            f"[Source {i} - {chunk['company'].upper()} 10K, Page {chunk['page']}]\n{chunk['text']}"
        )
    return "\n\n---\n\n".join(context_parts)
```

**Step 2: Test retrieval manually**

```bash
cd "/Users/sriram/Downloads/10k /backend"
source venv/bin/activate
python -c "
from app.services.retrieval import retrieve_context
results = retrieve_context('How much cash does Amazon have?', company='amazon')
print(f'Got {len(results)} chunks')
print(results[0]['text'][:200])
"
```

Expected: prints chunk count and first 200 chars of most relevant chunk.

**Step 3: Commit**

```bash
git add backend/app/services/retrieval.py
git commit -m "feat: pinecone retrieval service with multi-namespace support"
```

---

## Task 6: Multi-Agent Debate Service

**Files:**
- Create: `backend/app/services/agents.py`

**Step 1: Create agents.py**

Create `backend/app/services/agents.py`:
```python
import asyncio
import httpx
import os
from typing import List

OPENROUTER_BASE = "https://openrouter.ai/api/v1/chat/completions"

AGENTS = [
    {"id": "gpt4o",   "model": "openai/gpt-4o",                    "label": "GPT-4o"},
    {"id": "claude",  "model": "anthropic/claude-3.5-sonnet",       "label": "Claude 3.5"},
    {"id": "gemini",  "model": "google/gemini-1.5-pro",             "label": "Gemini 1.5 Pro"},
    {"id": "deepseek","model": "deepseek/deepseek-r1",              "label": "Deepseek R1"},
]

JUDGE_MODEL = "openai/gpt-4o"

SYSTEM_PROMPT = """You are FinBot, an expert financial analyst specializing in Big Tech 10-K filings.
You have access to the 2024 annual reports for Alphabet (Google), Amazon, and Microsoft.

Rules:
1. ONLY answer from the provided context. Never make up numbers.
2. Always cite the company name and section when referencing data.
3. For numerical questions, quote the exact figure from the document.
4. If the context is insufficient, say so explicitly — never guess.
5. For comparative questions, structure your answer by company.
6. Be concise but precise."""

JUDGE_PROMPT = """You are a senior financial analyst judge. You have received answers from 4 AI models
about a financial question. Your job is to:
1. Identify the consensus answer (what most models agree on)
2. Note any significant disagreements and which model is likely wrong
3. Provide the definitive final answer with high confidence
4. Flag any potential hallucinations you detected

Be authoritative and concise."""

async def call_agent(client: httpx.AsyncClient, model: str, context: str, question: str) -> str:
    """Call a single LLM via OpenRouter."""
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"Context:\n{context}\n\nQuestion: {question}"},
        ],
        "max_tokens": 800,
        "temperature": 0.1,
    }
    headers = {
        "Authorization": f"Bearer {os.environ['OPENROUTER_API_KEY']}",
        "HTTP-Referer": "https://tenk-rag.vercel.app",
        "X-Title": "10K RAG Chatbot",
    }

    try:
        response = await client.post(OPENROUTER_BASE, json=payload, headers=headers, timeout=30.0)
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"]
    except Exception as e:
        return f"[Error from {model}: {str(e)}]"

async def run_debate(context: str, question: str) -> dict:
    """
    Run all 4 agents in parallel, then judge synthesizes.
    Returns {agents: [{id, label, answer}], final_answer, confidence}
    """
    async with httpx.AsyncClient() as client:
        # Round 1: All agents answer in parallel
        tasks = [
            call_agent(client, agent["model"], context, question)
            for agent in AGENTS
        ]
        answers = await asyncio.gather(*tasks)

        agent_responses = [
            {"id": AGENTS[i]["id"], "label": AGENTS[i]["label"], "answer": answers[i]}
            for i in range(len(AGENTS))
        ]

        # Round 2: Judge synthesizes
        debate_summary = "\n\n".join([
            f"**{r['label']}:** {r['answer']}" for r in agent_responses
        ])

        judge_payload = {
            "model": JUDGE_MODEL,
            "messages": [
                {"role": "system", "content": JUDGE_PROMPT},
                {"role": "user", "content": (
                    f"Original Question: {question}\n\n"
                    f"Context provided to agents:\n{context}\n\n"
                    f"Agent Answers:\n{debate_summary}\n\n"
                    "Provide your final synthesized answer."
                )},
            ],
            "max_tokens": 600,
            "temperature": 0.0,
        }
        headers = {
            "Authorization": f"Bearer {os.environ['OPENROUTER_API_KEY']}",
            "HTTP-Referer": "https://tenk-rag.vercel.app",
        }

        judge_response = await client.post(OPENROUTER_BASE, json=judge_payload, headers=headers, timeout=30.0)
        final_answer = judge_response.json()["choices"][0]["message"]["content"]

    return {
        "agents": agent_responses,
        "final_answer": final_answer,
    }
```

**Step 2: Test debate manually**

```bash
cd "/Users/sriram/Downloads/10k /backend"
source venv/bin/activate
python -c "
import asyncio, os
from dotenv import load_dotenv
load_dotenv('../.env')
from app.services.agents import run_debate

result = asyncio.run(run_debate(
    context='Amazon had cash and cash equivalents of 78.8 billion as of December 31 2024.',
    question='How much cash does Amazon have?'
))
print('Final:', result['final_answer'][:200])
print('Agents:', [a['label'] for a in result['agents']])
"
```

Expected: prints final answer and 4 agent labels.

**Step 3: Commit**

```bash
git add backend/app/services/agents.py
git commit -m "feat: multi-agent debate service with 4 LLMs + judge synthesis"
```

---

## Task 7: Chat API Endpoint

**Files:**
- Create: `backend/app/routers/chat.py`
- Create: `backend/app/__init__.py`
- Create: `backend/app/routers/__init__.py`
- Create: `backend/app/services/__init__.py`

**Step 1: Create __init__ files**

```bash
touch backend/app/__init__.py
touch backend/app/routers/__init__.py
touch backend/app/services/__init__.py
```

**Step 2: Create chat router**

Create `backend/app/routers/chat.py`:
```python
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.services.retrieval import retrieve_context, format_context
from app.services.agents import run_debate

router = APIRouter()

class ChatRequest(BaseModel):
    question: str
    company: Optional[str] = None  # "alphabet" | "amazon" | "microsoft" | None

class AgentResponse(BaseModel):
    id: str
    label: str
    answer: str

class ChatResponse(BaseModel):
    final_answer: str
    agents: list[AgentResponse]
    sources: list[dict]
    question: str

@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    company = request.company if request.company in ["alphabet", "amazon", "microsoft"] else None

    # Step 1: Retrieve relevant chunks
    chunks = retrieve_context(request.question, company=company, top_k=5)
    context = format_context(chunks)

    # Step 2: Run multi-agent debate
    debate_result = await run_debate(context, request.question)

    # Step 3: Format sources
    sources = [
        {"company": c["company"], "page": c["page"], "score": round(c["score"], 3)}
        for c in chunks[:6]
    ]

    return ChatResponse(
        final_answer=debate_result["final_answer"],
        agents=debate_result["agents"],
        sources=sources,
        question=request.question,
    )
```

**Step 3: Test the endpoint**

```bash
cd "/Users/sriram/Downloads/10k /backend"
source venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

In another terminal:
```bash
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "How much cash does Amazon have at end of 2024?", "company": "amazon"}'
```

Expected: JSON with `final_answer`, 4 agent responses, and sources.

**Step 4: Commit**

```bash
git add backend/app/routers/chat.py backend/app/__init__.py backend/app/routers/__init__.py backend/app/services/__init__.py
git commit -m "feat: chat API endpoint with RAG + multi-agent debate"
```

---

## Task 8: Railway Deployment Config

**Files:**
- Create: `backend/Procfile`
- Create: `backend/runtime.txt`
- Create: `railway.json`

**Step 1: Create Procfile**

Create `backend/Procfile`:
```
web: uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

**Step 2: Create runtime.txt**

Create `backend/runtime.txt`:
```
python-3.11.0
```

**Step 3: Create railway.json at project root**

Create `railway.json`:
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT",
    "restartPolicyType": "ON_FAILURE"
  }
}
```

**Step 4: Deploy to Railway**

1. Push code to GitHub: `git push origin main`
2. Go to railway.app → New Project → Deploy from GitHub
3. Select your repo
4. Add environment variables in Railway dashboard:
   - `OPENROUTER_API_KEY`
   - `PINECONE_API_KEY`
   - `PINECONE_INDEX_NAME=tenk-rag`
5. Note the Railway URL (e.g. `https://tenk-rag-backend.up.railway.app`)

**Step 5: Commit**

```bash
git add backend/Procfile backend/runtime.txt railway.json
git commit -m "feat: railway deployment config"
```

---

## Task 9: Next.js Frontend Setup

**Files:**
- Create: `frontend/` (full Next.js app)

**Step 1: Initialize Next.js**

```bash
cd "/Users/sriram/Downloads/10k "
npx create-next-app@latest frontend --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
cd frontend
```

**Step 2: Install additional dependencies**

```bash
cd "/Users/sriram/Downloads/10k /frontend"
npm install axios lucide-react
```

**Step 3: Create environment file**

Create `frontend/.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

**Step 4: Verify Next.js runs**

```bash
npm run dev
```

Visit `http://localhost:3000` — should see default Next.js page.

**Step 5: Commit**

```bash
git add frontend/
git commit -m "feat: next.js frontend scaffold"
```

---

## Task 10: Chat UI — Types & API Client

**Files:**
- Create: `frontend/src/types/chat.ts`
- Create: `frontend/src/lib/api.ts`

**Step 1: Create types**

Create `frontend/src/types/chat.ts`:
```typescript
export interface AgentResponse {
  id: string;
  label: string;
  answer: string;
}

export interface Source {
  company: string;
  page: number;
  score: number;
}

export interface ChatResponse {
  final_answer: string;
  agents: AgentResponse[];
  sources: Source[];
  question: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  agents?: AgentResponse[];
  sources?: Source[];
  loading?: boolean;
}
```

**Step 2: Create API client**

Create `frontend/src/lib/api.ts`:
```typescript
import axios from "axios";
import { ChatResponse } from "@/types/chat";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function sendChat(
  question: string,
  company?: string
): Promise<ChatResponse> {
  const response = await axios.post<ChatResponse>(`${API_URL}/api/chat`, {
    question,
    company: company || null,
  });
  return response.data;
}
```

**Step 3: Commit**

```bash
git add frontend/src/types/chat.ts frontend/src/lib/api.ts
git commit -m "feat: chat types and API client"
```

---

## Task 11: Chat UI — Components

**Files:**
- Create: `frontend/src/components/MessageBubble.tsx`
- Create: `frontend/src/components/AgentDebate.tsx`
- Create: `frontend/src/components/CompanySelector.tsx`

**Step 1: Create MessageBubble**

Create `frontend/src/components/MessageBubble.tsx`:
```tsx
import { Message } from "@/types/chat";
import AgentDebate from "./AgentDebate";

export default function MessageBubble({ message }: { message: Message }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end mb-4">
        <div className="bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-3 max-w-[70%]">
          {message.content}
        </div>
      </div>
    );
  }

  if (message.loading) {
    return (
      <div className="flex justify-start mb-4">
        <div className="bg-gray-800 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%]">
          <div className="flex space-x-2 items-center h-6">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" />
            <span className="text-gray-400 text-sm ml-2">4 agents debating...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start mb-4">
      <div className="bg-gray-800 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%] w-full">
        <p className="text-white whitespace-pre-wrap mb-3">{message.content}</p>
        {message.agents && <AgentDebate agents={message.agents} />}
        {message.sources && message.sources.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-700">
            <p className="text-gray-400 text-xs mb-1">Sources</p>
            <div className="flex flex-wrap gap-2">
              {message.sources.map((s, i) => (
                <span key={i} className="text-xs bg-gray-700 px-2 py-1 rounded text-gray-300">
                  {s.company} p.{s.page} ({Math.round(s.score * 100)}%)
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Create AgentDebate**

Create `frontend/src/components/AgentDebate.tsx`:
```tsx
"use client";
import { useState } from "react";
import { AgentResponse } from "@/types/chat";
import { ChevronDown, ChevronUp } from "lucide-react";

const AGENT_COLORS: Record<string, string> = {
  gpt4o: "text-green-400",
  claude: "text-orange-400",
  gemini: "text-blue-400",
  deepseek: "text-purple-400",
};

export default function AgentDebate({ agents }: { agents: AgentResponse[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-3">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-gray-400 hover:text-gray-200 text-sm transition-colors"
      >
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        View model debate ({agents.length} agents)
      </button>
      {open && (
        <div className="mt-3 space-y-3">
          {agents.map((agent) => (
            <div key={agent.id} className="bg-gray-900 rounded-xl p-3">
              <p className={`font-semibold text-sm mb-1 ${AGENT_COLORS[agent.id] || "text-gray-300"}`}>
                {agent.label}
              </p>
              <p className="text-gray-300 text-sm whitespace-pre-wrap">{agent.answer}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Step 3: Create CompanySelector**

Create `frontend/src/components/CompanySelector.tsx`:
```tsx
"use client";

const COMPANIES = [
  { id: null, label: "All Companies" },
  { id: "alphabet", label: "Alphabet (Google)" },
  { id: "amazon", label: "Amazon" },
  { id: "microsoft", label: "Microsoft" },
];

interface Props {
  selected: string | null;
  onChange: (company: string | null) => void;
}

export default function CompanySelector({ selected, onChange }: Props) {
  return (
    <div className="flex gap-2 flex-wrap">
      {COMPANIES.map((c) => (
        <button
          key={c.id ?? "all"}
          onClick={() => onChange(c.id)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            selected === c.id
              ? "bg-blue-600 text-white"
              : "bg-gray-800 text-gray-300 hover:bg-gray-700"
          }`}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}
```

**Step 4: Commit**

```bash
git add frontend/src/components/
git commit -m "feat: chat UI components - message bubble, agent debate, company selector"
```

---

## Task 12: Main Chat Page

**Files:**
- Modify: `frontend/src/app/page.tsx`
- Modify: `frontend/src/app/globals.css`

**Step 1: Update globals.css**

Replace content of `frontend/src/app/globals.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  background-color: #111827;
  color: white;
}
```

**Step 2: Replace page.tsx**

Replace `frontend/src/app/page.tsx`:
```tsx
"use client";
import { useState, useRef, useEffect } from "react";
import { Message } from "@/types/chat";
import { sendChat } from "@/lib/api";
import MessageBubble from "@/components/MessageBubble";
import CompanySelector from "@/components/CompanySelector";
import { Send } from "lucide-react";

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hi! I'm FinBot. Ask me anything about Alphabet, Amazon, or Microsoft's 2024 annual reports. I'll have 4 AI models debate and give you the most accurate answer.",
    },
  ]);
  const [input, setInput] = useState("");
  const [company, setCompany] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    if (!input.trim() || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    };
    const loadingMsg: Message = {
      id: Date.now().toString() + "-loading",
      role: "assistant",
      content: "",
      loading: true,
    };

    setMessages((prev) => [...prev, userMsg, loadingMsg]);
    setInput("");
    setLoading(true);

    try {
      const result = await sendChat(input, company || undefined);
      setMessages((prev) =>
        prev.map((m) =>
          m.loading
            ? {
                id: m.id,
                role: "assistant",
                content: result.final_answer,
                agents: result.agents,
                sources: result.sources,
              }
            : m
        )
      );
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) =>
          m.loading
            ? { id: m.id, role: "assistant", content: "Error: Could not get a response. Please try again." }
            : m
        )
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto px-4">
      {/* Header */}
      <div className="py-4 border-b border-gray-800">
        <h1 className="text-xl font-bold text-white">FinBot</h1>
        <p className="text-gray-400 text-sm">Multi-Model RAG · Alphabet · Amazon · Microsoft 10K 2024</p>
      </div>

      {/* Company selector */}
      <div className="py-3 border-b border-gray-800">
        <CompanySelector selected={company} onChange={setCompany} />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 space-y-2">
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="py-4 border-t border-gray-800">
        <div className="flex gap-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Ask about revenue, cash, risks, cloud business..."
            className="flex-1 bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500"
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl px-4 py-3 transition-colors"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Step 3: Test frontend end-to-end**

Make sure backend is running on port 8000, then:
```bash
cd "/Users/sriram/Downloads/10k /frontend"
npm run dev
```

Visit `http://localhost:3000`
- Type: "How much cash does Amazon have at end of 2024?"
- Select "Amazon" company filter
- Should see loading animation, then final answer + collapsible agent debate

**Step 4: Commit**

```bash
git add frontend/src/app/page.tsx frontend/src/app/globals.css
git commit -m "feat: main chat page with full UI"
```

---

## Task 13: Vercel Deployment

**Files:**
- Create: `frontend/vercel.json`

**Step 1: Create vercel.json**

Create `frontend/vercel.json`:
```json
{
  "env": {
    "NEXT_PUBLIC_API_URL": "@api_url"
  }
}
```

**Step 2: Deploy to Vercel**

1. Push all code to GitHub
2. Go to vercel.com → New Project → Import your GitHub repo
3. Set root directory to `frontend`
4. Add environment variable:
   - `NEXT_PUBLIC_API_URL` = your Railway backend URL (e.g. `https://tenk-rag-backend.up.railway.app`)
5. Deploy

**Step 3: Test production**

Visit your Vercel URL and test all 5 sample questions from the assignment.

**Step 4: Final commit**

```bash
git add frontend/vercel.json
git commit -m "feat: vercel deployment config"
git push origin main
```

---

## Sample Questions to Test (from Assignment)

Once deployed, verify these all work:

1. `Do these companies worry about challenges in China or India for cloud services?` (All companies)
2. `How much cash does Amazon have at the end of 2024?` (Amazon)
3. `Compared to 2023, does Amazon's liquidity decrease or increase?` (Amazon)
4. `What is the business where main revenue comes from for Google?` (Alphabet)
5. `What main businesses does Amazon do?` (Amazon)

---

## Presentation Talking Points

- Show GPT-4o vs Deepseek R1 answer differences on the same question
- Show a case where agents DISAGREE (hallucination detected)
- Ask a trick question and show the judge flagging the hallucination
- Compare embedding quality: what happens if you use a weaker embedding model
- Show retrieval scores — what makes a chunk relevant vs not

---

## Notes

- OpenRouter costs ~$0.01-0.05 per full debate query (4 agents + judge)
- Pinecone free tier supports 1 index, 100k vectors — more than enough
- Railway free trial is $5 credit — enough for class project
- Keep API keys out of git — use Railway/Vercel environment variables
