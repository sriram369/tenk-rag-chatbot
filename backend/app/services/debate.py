"""
Multi-agent debate service.
- Expert Panel (4 paid models): answers used by both judges
- General Audience (4 free models): gives opinions, judges ignore them
- Judge 1 (Claude 3.5 Sonnet): primary synthesis
- Judge 2 (Llama 3.3 70B): free second opinion
"""

import asyncio
import json
import os
from typing import AsyncGenerator
from openai import AsyncOpenAI

AGENTS = [
    {"name": "GPT-4o",            "model": "openai/gpt-4o"},
    {"name": "Claude 3.5 Sonnet", "model": "anthropic/claude-3.5-sonnet"},
    {"name": "Gemini 2.0 Flash",  "model": "google/gemini-2.0-flash-001"},
    {"name": "DeepSeek R1",       "model": "deepseek/deepseek-r1"},
]

AUDIENCE = [
    {"name": "GPT-OSS 120B",   "model": "openai/gpt-oss-120b"},
    {"name": "Llama 3.3 70B",  "model": "meta-llama/llama-3.3-70b-instruct"},
    {"name": "Qwen3 235B",     "model": "qwen/qwen3-235b-a22b"},
    {"name": "Gemma 3 27B",    "model": "google/gemma-3-27b-it"},
]

JUDGE_MODEL        = "anthropic/claude-3.5-sonnet"
SECOND_JUDGE_MODEL = "meta-llama/llama-3.3-70b-instruct"
SECOND_JUDGE_NAME  = "Llama 3.3 70B"

EXPERT_SYSTEM_PROMPT = """You are a financial analyst expert specializing in analyzing SEC 10-K filings.
You will be given relevant excerpts from 10-K annual reports, each labeled with their source like [Alphabet 10-K, p.47].
Provide a precise, accurate answer citing specific numbers, figures, and facts from the documents.
IMPORTANT: When you use information from the context, cite the source inline using the exact label format shown, e.g. [Alphabet 10-K, p.47].
Only cite information that comes directly from the provided context. If information is not in the context, say so clearly.
Be concise but thorough."""

AUDIENCE_SYSTEM_PROMPT = """You are a member of the general public giving your opinion on a financial question.
You have some general knowledge but are not a specialist. You will be given context from 10-K filings, each labeled with their source.
Share your perspective briefly and conversationally. If you reference something from the documents, use the source label shown, e.g. [Alphabet 10-K, p.12].
Be honest about what you do and don't understand."""

JUDGE_SYSTEM_PROMPT = """You are the Chief Financial Analyst and debate judge.
You will receive a question and answers from 4 expert financial analysts who analyzed 10-K filings.
Your job is to:
1. Identify the most accurate and well-supported answer from the experts
2. Note where experts agree or disagree
3. Synthesize a definitive final answer that is comprehensive and accurate
4. Cite specific figures and facts
Be authoritative and concise. Base your verdict ONLY on the expert panel responses."""

SECOND_JUDGE_SYSTEM_PROMPT = """You are an independent financial analyst providing a second opinion.
You will receive a question and answers from 4 expert financial analysts who analyzed 10-K filings.
Your job is to:
1. Independently evaluate the expert responses
2. Point out anything the experts may have missed or where they contradict each other
3. Give your own clear, direct verdict backed by the facts in their answers
4. Keep it concise and direct
Base your verdict ONLY on the expert panel responses provided."""


def _get_client() -> AsyncOpenAI:
    return AsyncOpenAI(
        api_key=os.getenv("OPENROUTER_API_KEY"),
        base_url="https://openrouter.ai/api/v1",
    )


async def _ask_agent(client: AsyncOpenAI, agent: dict, question: str, context: str, system_prompt: str) -> dict:
    try:
        response = await client.chat.completions.create(
            model=agent["model"],
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Context from 10-K filings:\n\n{context}\n\nQuestion: {question}"},
            ],
            max_tokens=600,
            temperature=0.2,
        )
        return {"agent": agent["name"], "model": agent["model"], "answer": response.choices[0].message.content, "error": None}
    except Exception as e:
        return {"agent": agent["name"], "model": agent["model"], "answer": None, "error": str(e)}


async def _call_judge(client: AsyncOpenAI, model: str, system_prompt: str, question: str, expert_responses: list[dict]) -> str:
    parts = []
    for r in expert_responses:
        body = r["answer"] if r["answer"] else f"ERROR: {r['error']}"
        parts.append(f"\n\n--- {r['agent']} ---\n{body}")
    answers_text = "".join(parts)
    response = await client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Question: {question}\n\nExpert Panel Responses:{answers_text}\n\nProvide your verdict:"},
        ],
        max_tokens=1000,
        temperature=0.1,
    )
    return response.choices[0].message.content or ""


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

    # Launch all 8 model tasks simultaneously
    expert_task_list  = [asyncio.create_task(_ask_agent(client, a, question, context, EXPERT_SYSTEM_PROMPT))  for a in AGENTS]
    audience_task_list = [asyncio.create_task(_ask_agent(client, a, question, context, AUDIENCE_SYSTEM_PROMPT)) for a in AUDIENCE]

    task_type: dict[int, str] = {}
    for t in expert_task_list:   task_type[id(t)] = "expert"
    for t in audience_task_list: task_type[id(t)] = "audience"

    pending = set(expert_task_list + audience_task_list)
    expert_responses: list[dict] = []

    # Yield each agent result the moment it finishes
    while pending:
        done, pending = await asyncio.wait(pending, return_when=asyncio.FIRST_COMPLETED)
        for task in done:
            result = task.result()
            t_type = task_type[id(task)]
            yield f"event: agent\ndata: {json.dumps({'type': t_type, **result})}\n\n"
            if t_type == "expert":
                expert_responses.append(result)

    # Signal judging phase
    yield f"event: judging\ndata: {{}}\n\n"

    # Both judges run in parallel
    j1 = asyncio.create_task(_call_judge(client, JUDGE_MODEL,        JUDGE_SYSTEM_PROMPT,        question, expert_responses))
    j2 = asyncio.create_task(_call_judge(client, SECOND_JUDGE_MODEL, SECOND_JUDGE_SYSTEM_PROMPT, question, expert_responses))

    judge_meta = {
        id(j1): {"variant": "primary",   "agent": "Claude 3.5 Sonnet"},
        id(j2): {"variant": "secondary", "agent": SECOND_JUDGE_NAME},
    }
    pending_j: set = {j1, j2}

    while pending_j:
        done, pending_j = await asyncio.wait(pending_j, return_when=asyncio.FIRST_COMPLETED)
        for task in done:
            answer = task.result()
            info   = judge_meta[id(task)]
            yield f"event: verdict\ndata: {json.dumps({**info, 'answer': answer})}\n\n"

    yield f"event: done\ndata: {{}}\n\n"


# ── Kept for backwards compatibility ──────────────────────────────────────────
async def run_debate(question: str, context: str) -> dict:
    client = _get_client()
    expert_tasks   = [_ask_agent(client, a, question, context, EXPERT_SYSTEM_PROMPT)   for a in AGENTS]
    audience_tasks = [_ask_agent(client, a, question, context, AUDIENCE_SYSTEM_PROMPT) for a in AUDIENCE]
    expert_responses, audience_responses = await asyncio.gather(
        asyncio.gather(*expert_tasks),
        asyncio.gather(*audience_tasks),
    )
    expert_list = list(expert_responses)
    final_answer, second_verdict = await asyncio.gather(
        _call_judge(client, JUDGE_MODEL,        JUDGE_SYSTEM_PROMPT,        question, expert_list),
        _call_judge(client, SECOND_JUDGE_MODEL, SECOND_JUDGE_SYSTEM_PROMPT, question, expert_list),
    )
    return {
        "question": question,
        "agent_responses": expert_list,
        "audience_responses": list(audience_responses),
        "final_answer": final_answer,
        "second_verdict": second_verdict,
    }
