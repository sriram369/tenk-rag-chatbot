"""
PDF ingestion script: chunks 10K PDFs and upserts embeddings to Pinecone.

Usage:
    cd backend
    source venv/bin/activate
    python scripts/ingest.py [large|small]

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
EMBEDDING_MODEL_SMALL = "text-embedding-3-small"
INDEX_NAME_LARGE = "tenk-rag"
INDEX_NAME_SMALL = "tenk-rag-small"
EMBEDDING_DIM_LARGE = 3072
EMBEDDING_DIM_SMALL = 1536

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


def embed_chunks(chunks: list[dict], client: OpenAI, model: str = EMBEDDING_MODEL) -> list[dict]:
    texts = [c["text"] for c in chunks]
    print(f"  Embedding {len(texts)} chunks...")
    # Process in batches to avoid token limits
    all_embeddings = []
    for i in range(0, len(texts), BATCH_SIZE):
        batch = texts[i : i + BATCH_SIZE]
        response = client.embeddings.create(model=model, input=batch)
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


def get_or_create_index(pc: Pinecone, index_name: str, dimension: int):
    existing = [idx.name for idx in pc.list_indexes()]
    if index_name not in existing:
        print(f"  Creating Pinecone index '{index_name}' (dim={dimension})...")
        from pinecone import ServerlessSpec
        pc.create_index(
            name=index_name,
            dimension=dimension,
            metric="cosine",
            spec=ServerlessSpec(cloud="aws", region="us-east-1"),
        )
        import time
        time.sleep(10)  # wait for index to be ready
        print(f"  Index '{index_name}' ready.")
    else:
        print(f"  Using existing index '{index_name}'.")
    return pc.Index(index_name)


def main():
    openrouter_key = os.getenv("OPENROUTER_API_KEY")
    pinecone_key = os.getenv("PINECONE_API_KEY")

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

    model_size = sys.argv[1] if len(sys.argv) > 1 else "large"
    embedding_model = EMBEDDING_MODEL if model_size == "large" else EMBEDDING_MODEL_SMALL
    namespace_suffix = "" if model_size == "large" else "-small"
    index_name = INDEX_NAME_LARGE if model_size == "large" else INDEX_NAME_SMALL
    dimension = EMBEDDING_DIM_LARGE if model_size == "large" else EMBEDDING_DIM_SMALL
    index = get_or_create_index(pc, index_name, dimension)
    print(f"\nUsing embedding model: {embedding_model} (suffix: '{namespace_suffix}')")

    chunk_counts = {}
    for company, pdf_path in COMPANIES.items():
        if not pdf_path.exists():
            print(f"WARNING: {pdf_path} not found, skipping")
            continue

        print(f"\nProcessing {company.upper()}...")
        pages = extract_pages(pdf_path)
        print(f"  Extracted {len(pages)} pages")

        chunks = chunk_pages(pages, company)
        print(f"  Split into {len(chunks)} chunks")
        chunk_counts[company] = len(chunks)

        chunks = embed_chunks(chunks, openai_client, model=embedding_model)
        upsert_to_pinecone(chunks, index, namespace=f"{company}{namespace_suffix}")

    print("\nIngestion complete!")
    print(f"Index used: {index_name}")
    print("Chunk counts per company:")
    for company, count in chunk_counts.items():
        print(f"  {company}: {count} chunks")
    stats = index.describe_index_stats()
    print(f"Index stats: {stats}")


if __name__ == "__main__":
    main()
