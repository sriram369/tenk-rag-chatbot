"""
RAG retrieval service: embeds a query and fetches top-k chunks from Pinecone.
"""

import os
from openai import OpenAI
from pinecone import Pinecone

EMBEDDING_MODEL = "text-embedding-3-large"
TOP_K = 5  # chunks per company namespace


def _get_clients():
    api_key = os.getenv("OPENROUTER_API_KEY")
    pinecone_key = os.getenv("PINECONE_API_KEY")
    index_name = os.getenv("PINECONE_INDEX_NAME", "tenk-rag")

    openai_client = OpenAI(
        api_key=api_key,
        base_url="https://openrouter.ai/api/v1",
    )
    pc = Pinecone(api_key=pinecone_key)
    index = pc.Index(index_name)
    return openai_client, index


def embed_query(query: str, client: OpenAI) -> list[float]:
    response = client.embeddings.create(model=EMBEDDING_MODEL, input=query)
    return response.data[0].embedding


def retrieve_context(query: str, companies: list[str] | None = None) -> dict[str, list[str]]:
    """
    Returns a dict mapping company name -> list of relevant text chunks.
    If companies is None, queries all three namespaces.
    """
    if companies is None:
        companies = ["alphabet", "amazon", "microsoft"]

    client, index = _get_clients()
    query_embedding = embed_query(query, client)

    context: dict[str, list[str]] = {}
    for company in companies:
        results = index.query(
            vector=query_embedding,
            top_k=TOP_K,
            namespace=company,
            include_metadata=True,
        )
        chunks = [match.metadata["text"] for match in results.matches if match.metadata]
        context[company] = chunks

    return context


def format_context_for_prompt(context: dict[str, list[str]]) -> str:
    """Formats retrieved chunks into a single string for LLM prompts."""
    sections = []
    for company, chunks in context.items():
        if chunks:
            combined = "\n\n".join(chunks)
            sections.append(f"=== {company.upper()} 10-K ===\n{combined}")
    return "\n\n".join(sections)
