import { apiClient, setApiUserId } from "./axios"

export interface SubmissionResponse {
  status: string
  submission_id: string
  transcript_job_id: string
  whip_status: string
  filename: string
}

export interface TranscriptionStatusResponse {
  submission_id: string
  status: "pending" | "transcribing" | "completed" | "failed"
  transcript_job_id: string
  has_transcript: boolean
  transcript_lines?: Array<{ time: string; speaker: string; text: string }>
}

export interface AgentProcessResponse {
  status: string
  call_id: string
  router_result: {
    intent: string
    confidence: number
    reason: string
    needs_human_confirmation: boolean
  }
  proposal?: {
    summary: string
    requirements: Array<{ id: string; category: string; text: string; time: string }>
    tasks: Array<{ id: string; title: string; effort: string; time: string; estimated_hours: number }>
    quote?: { total_price: number; total_hours: number; hourly_rate: number }
    client_message_draft: string
  }
  saved_items: Array<{ id: string; type: string; text: string; time: string }>
}

export const api = {
  setUserId(userId: string | null) {
    setApiUserId(userId)
  },

  async uploadAudio(
    file: File,
    onUploadProgress?: (progress: number) => void
  ): Promise<SubmissionResponse> {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("source_type", "audio_file")

    const res = await apiClient.post<SubmissionResponse>("/api/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onUploadProgress) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          onUploadProgress(percent)
        }
      },
    })
    return res.data
  },

  async checkStatus(submissionId: string): Promise<TranscriptionStatusResponse> {
    const res = await apiClient.get<TranscriptionStatusResponse>(
      `/api/submissions/${submissionId}/status`
    )
    return res.data
  },

  async processAgent(
    submissionId: string,
    overrideIntent?: string
  ): Promise<AgentProcessResponse> {
    const res = await apiClient.post<AgentProcessResponse>(
      `/api/submissions/${submissionId}/process-agent`,
      { submission_id: submissionId, override_intent: overrideIntent }
    )
    return res.data
  },

  async getCallDetails(callId: string) {
    const res = await apiClient.get(`/api/calls/${callId}`)
    return res.data
  },

  async updateItem(itemId: string, text?: string, status?: string) {
    const res = await apiClient.patch(`/api/items/${itemId}`, { text, status })
    return res.data
  },

  async getUserSettings() {
    const res = await apiClient.get("/api/settings")
    return res.data
  },

  async updateUserSettings(hourly_rate?: number, currency?: string, message_tone?: string) {
    const res = await apiClient.patch("/api/settings", {
      hourly_rate,
      currency,
      message_tone,
    })
    return res.data
  },
}
