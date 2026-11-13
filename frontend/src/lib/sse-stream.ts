import { API_BASE_URL } from "@/lib/api";
import { ChatPayload } from "@/types/saas";

export interface StreamHandlers {
  onAgentStatus?: (agentName: string) => void;
  onToken: (token: string) => void;
  onComplete?: () => void;
  onError?: (errorMessage: string) => void;
  signal?: AbortSignal;
}

export type StreamCallbacks = StreamHandlers;

function resolveChatStreamUrl(): string {
  const rawBase = (
    API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://127.0.0.1:8000"
  ).trim();

  // Normalize host and always target exact /api/v1/chat/stream route
  const cleanHost = rawBase.replace(/\/+$/, "").replace(/\/api\/v1$/i, "");
  return `${cleanHost}/api/v1/chat/stream`;
}

/**
 * Streams real-time agent routing events and LLM tokens from FastAPI POST /api/v1/chat/stream.
 */
export async function streamAgentChat(
  payload: ChatPayload,
  handlers: StreamHandlers
): Promise<void> {
  const { onAgentStatus, onToken, onComplete, onError, signal } = handlers;
  const streamUrl = resolveChatStreamUrl();

  try {
    const response = await fetch(streamUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        "X-Workspace-ID": payload.workspace_id,
      },
      body: JSON.stringify(payload),
      signal,
    });

    if (!response.ok) {
      let detail = `Stream connection failed (${response.status})`;
      try {
        const errJson = await response.json();
        if (errJson?.detail) detail = String(errJson.detail);
      } catch {
        // Ignore non-JSON error body
      }
      onError?.(detail);
      return;
    }

    if (!response.body) {
      onError?.("ReadableStream is not supported or response body is empty.");
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line || !line.startsWith("data:")) continue;

        const dataStr = line.slice(5).trim();
        if (!dataStr) continue;

        if (dataStr === "[DONE]") {
          onComplete?.();
          return;
        }

        try {
          const parsed = JSON.parse(dataStr);

          if (parsed.type === "status" && parsed.agent) {
            onAgentStatus?.(parsed.agent);
          } else if (
            parsed.type === "token" &&
            typeof parsed.content === "string"
          ) {
            onToken(parsed.content);
          } else if (parsed.type === "error") {
            onError?.(parsed.detail || "Agent stream encountered an error.");
            return;
          }
        } catch {
          // Skip incomplete JSON frames safely
        }
      }
    }

    onComplete?.();
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === "AbortError") {
      onComplete?.();
      return;
    }
    const message =
      err instanceof Error ? err.message : "Unexpected streaming error occurred.";
    onError?.(message);
  }
}