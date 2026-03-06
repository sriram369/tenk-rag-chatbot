"""
Multi-agent debate service.
- Expert Panel (4 paid models): answers used by judge
- General Audience (4 free models): gives opinions, judge ignores them
- Judge (Claude 3.5 Sonnet): synthesizes only from expert panel
"""

import asyncio
import os
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

JUDGE_MODEL = "anthropic/claude-3.5-sonnet"

EXPERT_SYSTEM_PROMPT = """You are a financial analyst expert specializing in analyzing SEC 10-K filings.
You will be given relevant excerpts from 10-K annual reports and a question.
Provide a precise, accurate answer citing specific numbers, figures, and facts from the documents.
Be concise but thorough. If information is not in the provided context, say so clearly."""

AUDIENCE_SYSTEM_PROMPT = """You are a member of the general public giving your opinion on a financial question.
You have some general knowledge but are not a specialist. You will be given context from 10-K filings.
Share your perspective briefly and conversationally. Be honest about what you do and don't understand."""

JUDGE_SYSTEM_PROMPT = """You are the Chief Financial Analyst and debate judge.
You will receive a question and answers from 4 expert financial analysts who analyzed 10-K filings.
Your job is to:
1. Identify the most accurate and well-supported answer from the experts
2. Note where experts agree or disagree
3. Synthesize a definitive final answer that is comprehensive and accurate
4. Cite specific figures and facts
Be authoritative and concise. Base your verdict ONLY on the expert panel responses."""


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
                {
                    "role": "user",
                    "content": f"Context from 10-K filings:\n\n{context}\n\nQuestion: {question}",
                },
            ],
            max_tokens=600,
            temperature=0.2,
        )
        answer = response.choices[0].message.content
        return {"agent": agent["name"], "model": agent["model"], "answer": answer, "error": None}
    except Exception as e:
        return {"agent": agent["name"], "model": agent["model"], "answer": None, "error": str(e)}


async def _judge_answers(client: AsyncOpenAI, question: str, expert_responses: list[dict]) -> str:
    answers_text = ""
    for r in expert_responses:
        if r["answer"]:
            answers_text += f"\n\n--- {r['agent']} ---\n{r['answer']}"
        else:
            answers_text += f"\n\n--- {r['agent']} ---\nERROR: {r['error']}"

    response = await client.chat.completions.create(
        model=JUDGE_MODEL,
        messages=[
            {"role": "system", "content": JUDGE_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": f"Question: {question}\n\nExpert Panel Responses:{answers_text}\n\nProvide your final synthesized verdict:",
            },
        ],
        max_tokens=1000,
        temperature=0.1,
    )
    return response.choices[0].message.content


async def run_debate(question: str, context: str) -> dict:
    """
    Runs expert panel + audience in parallel.
    Judge synthesizes only from expert panel.
    """
    client = _get_client()

    # Run experts and audience simultaneously
    expert_tasks   = [_ask_agent(client, a, question, context, EXPERT_SYSTEM_PROMPT)   for a in AGENTS]
    audience_tasks = [_ask_agent(client, a, question, context, AUDIENCE_SYSTEM_PROMPT) for a in AUDIENCE]

    expert_responses, audience_responses = await asyncio.gather(
        asyncio.gather(*expert_tasks),
        asyncio.gather(*audience_tasks),
    )

    # Judge reads only experts
    final_answer = await _judge_answers(client, question, list(expert_responses))

    return {
        "question": question,
        "agent_responses": list(expert_responses),
        "audience_responses": list(audience_responses),
        "final_answer": final_answer,
    }
