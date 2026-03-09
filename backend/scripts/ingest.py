"""
PDF ingestion script: chunks 10K PDFs and upserts embeddings to Pinecone.

Usage:
    cd backend
    source venv/bin/activate
    python scripts/ingest.py

Requires .env in project root with:
    OPENROUTER_API_KEY=...
    PINECONE_API_KEY=...
    PINECONE_INDEX_NAME=tenk-rag
"""

import os
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent.parent / ".env")

from pypdf import PdfReader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from openai import OpenAI
from pinecone import Pinecone

# Config
CHUNK_SIZE = 1000
CHUNK_OVERLAP = 200
EMBEDDING_MODEL = "text-embedding-3-large"
BATCH_SIZE = 100

COMPANIES = {
    "alphabet": Path(__file__).parent.parent.parent / "10kFiles/Alpha/Alphabet 10K 2024.pdf",
    "amazon": Path(__file__).parent.parent.parent / "10kFiles/Amazon/Amazon 10K 2024.pdf",
    "microsoft": Path(__file__).parent.parent.parent / "10kFiles/Microsoft/MSFT 10-K.pdf",
}


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
    """Chunks text while tracking which page each chunk came from."""
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


def embed_chunks(chunks: list[dict], client: OpenAI) -> list[dict]:
    texts = [c["text"] for c in chunks]
    print(f"  Embedding {len(texts)} chunks...")
    # Process in batches to avoid token limits
    all_embeddings = []
    for i in range(0, len(texts), BATCH_SIZE):
        batch = texts[i : i + BATCH_SIZE]
        response = client.embeddings.create(model=EMBEDDING_MODEL, input=batch)
        all_embeddings.extend([e.embedding for e in response.data])
    for chunk, embedding in zip(chunks, all_embeddings):
        chunk["embedding"] = embedding
    return chunks


def upsert_to_pinecone(chunks: list[dict], index, namespace: str):
    vectors = [
        {
            "id": f"{namespace}-{c['chunk_id']}",
            "values": c["embedding"],
            "metadata": {
                "text": c["text"],
                "company": c["company"],
                "chunk_id": c["chunk_id"],
                "page_num": c["page_num"],
            },
        }
        for c in chunks
    ]
    print(f"  Upserting {len(vectors)} vectors to namespace '{namespace}'...")
    for i in range(0, len(vectors), BATCH_SIZE):
        batch = vectors[i : i + BATCH_SIZE]
        index.upsert(vectors=batch, namespace=namespace)
    print(f"  Done: {namespace}")


def main():
    openrouter_key = os.getenv("OPENROUTER_API_KEY")
    pinecone_key = os.getenv("PINECONE_API_KEY")
    index_name = os.getenv("PINECONE_INDEX_NAME", "tenk-rag")

    if not openrouter_key:
        print("ERROR: OPENROUTER_API_KEY not set in .env")
        sys.exit(1)
    if not pinecone_key:
        print("ERROR: PINECONE_API_KEY not set in .env")
        sys.exit(1)

    # OpenAI client pointed at OpenRouter for embeddings
    openai_client = OpenAI(
        api_key=openrouter_key,
        base_url="https://openrouter.ai/api/v1",
    )

    pc = Pinecone(api_key=pinecone_key)
    index = pc.Index(index_name)

    for company, pdf_path in COMPANIES.items():
        if not pdf_path.exists():
            print(f"WARNING: {pdf_path} not found, skipping")
            continue

        print(f"\nProcessing {company.upper()}...")
        pages = extract_pages(pdf_path)
        print(f"  Extracted {len(pages)} pages")

        chunks = chunk_pages(pages, company)
        print(f"  Split into {len(chunks)} chunks")

        chunks = embed_chunks(chunks, openai_client)
        upsert_to_pinecone(chunks, index, namespace=company)

    print("\nIngestion complete!")
    stats = index.describe_index_stats()
    print(f"Index stats: {stats}")


if __name__ == "__main__":
    main()
