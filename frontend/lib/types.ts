export interface AgentResponse {
  agent: string;
  model: string;
  answer: string | null;
  error: string | null;
}

export interface ChatResponse {
  question: string;
  context_used: Record<string, string[]>;
  agent_responses: AgentResponse[];
  audience_responses: AgentResponse[];
  final_answer: string;
  second_verdict: string;
}

export interface ChatRequest {
  question: string;
  companies?: string[];
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  response?: ChatResponse;
  timestamp: Date;
}

// ── Streaming types ───────────────────────────────────────────────────────────

export interface AgentCardState {
  answer: string | null;
  error: string | null;
  done: boolean;
}

export interface StreamState {
  experts:  Record<string, AgentCardState>;
  audience: Record<string, AgentCardState>;
  verdicts: {
    primary?:   string;
    secondary?: string;
  };
  isJudging: boolean;
  isDone:    boolean;
}

export interface ConversationEntry {
  id: string;
  question: string;
  state: StreamState;
}
