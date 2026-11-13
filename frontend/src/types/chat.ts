export type AgentNodeType =
  | "router"
  | "research_agent"
  | "crm_agent"
  | "general_agent"
  | string;

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  routedAgent?: AgentNodeType;
  provider?: string;
  modelName?: string;
  latencyMs?: number;
  isStreaming?: boolean;
  isError?: boolean;
}

export interface ChatThreadMeta {
  id: string;
  workspaceId: string;
  title: string;
  lastMessagePreview: string;
  lastRoutedAgent?: AgentNodeType;
  messageCount: number;
  pinned?: boolean;
  updatedAt: string;
}