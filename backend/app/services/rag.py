"""
RAG retrieval service: embeds a query and fetches top-k chunks from Pinecone.
"""

import os
from openai import OpenAI
from pinecone import Pinecone

EMBEDDING_MODEL = "text-embedding-3-large"
EMBEDDING_MODEL_SMALL = "text-embedding-3-small"
INDEX_NAME_LARGE = "tenk-rag"
INDEX_NAME_SMALL = "tenk-rag-small"
NAMESPACE_SUFFIX = {"large": "", "small": "-small"}
TOP_K = 5  # chunks per company namespace


def _get_clients(index_name: str = "tenk-rag"):
    api_key = os.getenv("OPENROUTER_API_KEY")
    pinecone_key = os.getenv("PINECONE_API_KEY")

    openai_client = OpenAI(
        api_key=api_key,
        base_url="https://openrouter.ai/api/v1",
    )
    pc = Pinecone(api_key=pinecone_key)
    index = pc.Index(index_name)
    return openai_client, index


def embed_query(query: str, client: OpenAI, model: str = EMBEDDING_MODEL) -> list[float]:
    response = client.embeddings.create(model=model, input=query)
    return response.data[0].embedding


def retrieve_context(query: str, companies: list[str] | None = None, embedding_tier: str = "large") -> dict[str, list[dict]]:
    """
    Returns a dict mapping company name -> list of chunk dicts.
    embedding_tier: "large" (text-embedding-3-large, tenk-rag) or "small" (text-embedding-3-small, tenk-rag-small)
    """
    if companies is None:
        companies = ["alphabet", "amazon", "microsoft"]

    model = EMBEDDING_MODEL if embedding_tier == "large" else EMBEDDING_MODEL_SMALL
    index_name = INDEX_NAME_LARGE if embedding_tier == "large" else INDEX_NAME_SMALL
    suffix = NAMESPACE_SUFFIX.get(embedding_tier, "")

    client, index = _get_clients(index_name)
    query_embedding = embed_query(query, client, model=model)

    context: dict[str, list[dict]] = {}
    for company in companies:
        results = index.query(
            vector=query_embedding,
            top_k=TOP_K,
            namespace=f"{company}{suffix}",
            include_metadata=True,
        )
        chunks = [
            {
                "text": match.metadata.get("text", ""),
                "company": match.metadata.get("company", company),
                "chunk_id": int(match.metadata.get("chunk_id", 0)),
                "page_num": int(match.metadata.get("page_num", 0)),
                "score": round(float(match.score), 4),
            }
            for match in results.matches
            if match.metadata
        ]
        context[company] = chunks

    return context


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
    seen: set[tuple] = set()
    for company, chunks in context.items():
        for chunk in chunks:
            key = (company, chunk["page_num"], chunk["chunk_id"])
            if key not in seen:
                seen.add(key)
                sources.append({
                    "company": company.capitalize(),
                    "page_num": chunk["page_num"],
                    "chunk_id": chunk["chunk_id"],
                    "text": chunk["text"][:300],
                    "score": chunk["score"],
                })
    return sorted(sources, key=lambda x: -x["score"])
