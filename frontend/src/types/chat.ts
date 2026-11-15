import { HitlInterruptPayload, MissingToolHint } from "./agents";

export type AgentNodeType = string;

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  routedAgent?: AgentNodeType;
  provider?: string;
  modelName?: string;
  isStreaming?: boolean;
  isError?: boolean;
  latencyMs?: number;
  toolCalls?: string[];
  missingTool?: MissingToolHint | null;
  hitlInterrupt?: HitlInterruptPayload | null;
  hitlResolution?: "approved" | "rejected" | null;
}

export interface ChatThreadMeta {
  id: string;
  workspaceId: string;
  title: string;
  lastMessagePreview: string;
  messageCount: number;
  updatedAt: string;
  lastRoutedAgent?: AgentNodeType;
  pinned?: boolean;
}