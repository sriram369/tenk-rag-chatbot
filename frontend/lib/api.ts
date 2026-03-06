import { ChatRequest, ChatResponse, StreamState } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ── Batch (legacy) ────────────────────────────────────────────────────────────
export async function sendChat(request: ChatRequest): Promise<ChatResponse> {
  const res = await fetch(`${API_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Request failed: ${res.status}`);
  }
  return res.json();
}

// ── Streaming ─────────────────────────────────────────────────────────────────
export function emptyStreamState(): StreamState {
  return { experts: {}, audience: {}, verdicts: {}, isJudging: false, isDone: false };
}

export async function streamChat(
  request: ChatRequest,
  callbacks: {
    onAgent:   (type: "expert" | "audience", agent: string, answer: string | null, error: string | null) => void;
    onJudging: () => void;
    onVerdict: (variant: "primary" | "secondary", agent: string, answer: string) => void;
    onDone:    () => void;
    onError:   (msg: string) => void;
  }
) {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/chat/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
  } catch (e) {
    callbacks.onError(e instanceof Error ? e.message : "Network error");
    return;
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    callbacks.onError(err.detail ?? `Request failed: ${res.status}`);
    return;
  }

  const reader  = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer    = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";

    for (const part of parts) {
      if (!part.trim()) continue;
      let eventType = "";
      let dataStr   = "";
      for (const line of part.split("\n")) {
        if (line.startsWith("event: ")) eventType = line.slice(7).trim();
        else if (line.startsWith("data: ")) dataStr = line.slice(6).trim();
      }
      if (!eventType) continue;
      try {
        const data = dataStr ? JSON.parse(dataStr) : {};
        if      (eventType === "agent")   callbacks.onAgent(data.type, data.agent, data.answer, data.error);
        else if (eventType === "judging") callbacks.onJudging();
        else if (eventType === "verdict") callbacks.onVerdict(data.variant, data.agent, data.answer);
        else if (eventType === "done")    callbacks.onDone();
      } catch { /* ignore malformed events */ }
    }
  }
}
