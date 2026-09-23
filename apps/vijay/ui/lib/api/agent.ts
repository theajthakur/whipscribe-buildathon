import { apiClient, BACKEND_URL } from "./client";
import {
  ProcessAgentPayload,
  AgentProcessResponse,
  AgentStreamEvent,
} from "./types";

/**
 * Triggers Vertex AI Agent Orchestrator asynchronously on a completed transcript.
 */
export async function processAgentCall(
  submissionId: string,
  payload: Omit<ProcessAgentPayload, "submission_id">
): Promise<AgentProcessResponse> {
  const body: ProcessAgentPayload = {
    submission_id: submissionId,
    ...payload,
  };
  const response = await apiClient.post<AgentProcessResponse>(
    `/api/submissions/${submissionId}/process-agent`,
    body
  );
  return response.data;
}

/**
 * Streams real-time HTTP Server-Sent Events (SSE) from the backend Vertex AI Agent Orchestrator.
 * Returns an unsubscribe function to abort the stream connection.
 */
export function streamAgentCall(
  submissionId: string,
  payload: Omit<ProcessAgentPayload, "submission_id">,
  onEvent: (event: AgentStreamEvent) => void,
  onError?: (error: Error) => void
): () => void {
  const controller = new AbortController();

  const runStream = async () => {
    try {
      let token: string | null = null;
      if (typeof window !== "undefined" && window.Clerk?.session) {
        token = await window.Clerk.session.getToken();
      }

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(
        `${BACKEND_URL}/api/submissions/${submissionId}/process-agent-stream`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            submission_id: submissionId,
            ...payload,
          }),
          signal: controller.signal,
        }
      );

      if (!response.ok) {
        throw new Error(`Agent stream failed with HTTP status ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Response body is not readable.");
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const block of lines) {
          const line = block.trim();
          if (line.startsWith("data: ")) {
            const jsonStr = line.slice(6);
            try {
              const eventObj: AgentStreamEvent = JSON.parse(jsonStr);
              onEvent(eventObj);
            } catch (parseErr) {
              console.warn("[Agent Stream] Event JSON parse error:", parseErr);
            }
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        return; // Normal cleanup on abort
      }
      if (onError && err instanceof Error) {
        onError(err);
      }
    }
  };

  runStream();

  return () => {
    controller.abort();
  };
}
