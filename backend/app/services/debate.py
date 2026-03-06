"""
Multi-agent debate service: 4 agents answer in parallel, Claude judge synthesizes.
"""

import asyncio
import os
from openai import AsyncOpenAI

AGENTS = [
    {"name": "GPT-4o", "model": "openai/gpt-4o"},
    {"name": "Claude 3.5 Sonnet", "model": "anthropic/claude-3.5-sonnet"},
    {"name": "Gemini 2.0 Flash", "model": "google/gemini-2.0-flash-001"},
    {"name": "DeepSeek R1", "model": "deepseek/deepseek-r1"},
]

JUDGE_MODEL = "anthropic/claude-3.5-sonnet"

AGENT_SYSTEM_PROMPT = """You are a financial analyst expert specializing in analyzing SEC 10-K filings.
You will be given relevant excerpts from 10-K annual reports and a question.
Provide a precise, accurate answer citing specific numbers, figures, and facts from the documents.
Be concise but thorough. If information is not in the provided context, say so clearly."""

JUDGE_SYSTEM_PROMPT = """You are the Chief Financial Analyst and debate judge.
You will receive a question and answers from 4 different AI analysts who each analyzed 10-K filings.
Your job is to:
1. Identify the most accurate and well-supported answer
2. Note where analysts agree or disagree
3. Synthesize a definitive final answer that is comprehensive and accurate
4. Cite specific figures and facts
Be authoritative and concise."""


def _get_client() -> AsyncOpenAI:
    return AsyncOpenAI(
        api_key=os.getenv("OPENROUTER_API_KEY"),
        base_url="https://openrouter.ai/api/v1",
    )


async def _ask_agent(client: AsyncOpenAI, agent: dict, question: str, context: str) -> dict:
    try:
        response = await client.chat.completions.create(
            model=agent["model"],
            messages=[
                {"role": "system", "content": AGENT_SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": f"Context from 10-K filings:\n\n{context}\n\nQuestion: {question}",
                },
            ],
            max_tokens=800,
            temperature=0.1,
        )
        answer = response.choices[0].message.content
        return {"agent": agent["name"], "model": agent["model"], "answer": answer, "error": None}
    except Exception as e:
        return {"agent": agent["name"], "model": agent["model"], "answer": None, "error": str(e)}


async def _judge_answers(client: AsyncOpenAI, question: str, agent_responses: list[dict]) -> str:
    answers_text = ""
    for r in agent_responses:
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
                "content": f"Question: {question}\n\nAnalyst Responses:{answers_text}\n\nProvide your final synthesized answer:",
            },
        ],
        max_tokens=1000,
        temperature=0.1,
    )
    return response.choices[0].message.content


async def run_debate(question: str, context: str) -> dict:
    """
    Runs all 4 agents in parallel, then the judge synthesizes.
    Returns full debate result with individual answers + final verdict.
    """
    client = _get_client()

    # All 4 agents answer simultaneously
    agent_tasks = [_ask_agent(client, agent, question, context) for agent in AGENTS]
    agent_responses = await asyncio.gather(*agent_tasks)

    # Judge synthesizes
    final_answer = await _judge_answers(client, question, list(agent_responses))

    return {
        "question": question,
        "agent_responses": list(agent_responses),
        "final_answer": final_answer,
    }
