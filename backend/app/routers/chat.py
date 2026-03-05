from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv
import os

load_dotenv(os.path.join(os.path.dirname(__file__), "../../../.env"))

from app.services.rag import retrieve_context, format_context_for_prompt
from app.services.debate import run_debate

router = APIRouter()


class ChatRequest(BaseModel):
    question: str
    companies: list[str] | None = None  # None = all three


class AgentResponse(BaseModel):
    agent: str
    model: str
    answer: str | None
    error: str | None


class ChatResponse(BaseModel):
    question: str
    context_used: dict[str, list[str]]
    agent_responses: list[AgentResponse]
    final_answer: str


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    # Step 1: RAG retrieval
    context = retrieve_context(request.question, request.companies)
    formatted_context = format_context_for_prompt(context)

    if not formatted_context.strip():
        raise HTTPException(
            status_code=404,
            detail="No relevant context found. Make sure PDFs have been ingested.",
        )

    # Step 2: Multi-agent debate
    result = await run_debate(request.question, formatted_context)

    return ChatResponse(
        question=result["question"],
        context_used=context,
        agent_responses=[AgentResponse(**r) for r in result["agent_responses"]],
        final_answer=result["final_answer"],
    )


@router.get("/health")
def api_health():
    return {"status": "ok", "service": "chat"}
