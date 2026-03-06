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
