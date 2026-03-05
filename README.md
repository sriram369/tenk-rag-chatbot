# FinBot — Multi-Model RAG Chatbot

A financial analysis chatbot comparing Alphabet (Google), Amazon, and Microsoft 2024 10-K filings.

## Architecture
- **Frontend**: Next.js + Tailwind (Vercel)
- **Backend**: FastAPI Python (Railway)
- **Vector DB**: Pinecone
- **LLMs**: GPT-4o, Claude 3.5, Gemini 1.5 Pro, Deepseek R1 (via OpenRouter)
- **Judge**: o1-mini synthesizes final answer

## Setup

### Prerequisites
- Python 3.11+
- Node.js 18+
- Pinecone account + API key
- OpenRouter account + API key

### Backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp ../.env.example ../.env
# Fill in your API keys in .env
uvicorn app.main:app --reload --port 8000
```

### Ingest PDFs (run once)
```bash
cd backend
source venv/bin/activate
python scripts/ingest.py
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Environment Variables
- `OPENROUTER_API_KEY` - OpenRouter API key
- `PINECONE_API_KEY` - Pinecone API key
- `PINECONE_INDEX_NAME` - Pinecone index name (default: tenk-rag)
- `NEXT_PUBLIC_API_URL` - Backend URL
