/**
 * TypeScript Data Models for CallBrief API
 * Derived from backend models in apps/vijay/backend/main.py
 */

// --- Normalized API Error ---
export class ApiError extends Error {
  public statusCode: number;
  public details: unknown;
  public isNetworkError: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    details: unknown = null,
    isNetworkError: boolean = false
  ) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.details = details;
    this.isNetworkError = isNetworkError;
  }
}

// --- User Settings ---
export interface UserSettings {
  user_id: string;
  hourly_rate: number;
  currency: string;
  message_tone: string;
}

export interface SettingsUpdatePayload {
  hourly_rate?: number;
  currency?: string;
  message_tone?: string;
}

export interface UpdateSettingsResponse {
  status: string;
  settings: {
    hourly_rate: number;
    currency: string;
    message_tone: string;
  };
}

// --- Audio Uploads & Submissions ---
export type SourceType = "audio_file" | "voice_note" | "chat_export";

export interface UploadResponse {
  status: string;
  submission_id: string;
  transcript_job_id: string;
  whip_status: string;
  filename: string;
}

export interface SubmissionSummary {
  id: string;
  source_type: string;
  source_location: string;
  filename: string;
  status: string;
  transcript_job_id: string | null;
  created_at: string | null;
  has_transcript: boolean;
  calls: string[];
}

export interface TranscriptLine {
  time: string;
  speaker: string;
  text: string;
}

export interface SubmissionStatusResponse {
  submission_id: string;
  status: string;
  transcript_job_id: string | null;
  has_transcript: boolean;
  transcript_lines: TranscriptLine[] | null;
}

export interface SubmissionAudioResponse {
  submission_id: string;
  audio_url: string | null;
  source: string;
  expires_in: number | null;
  local_fallback: string | null;
}

// --- Agent Orchestration ---
export type CallIntentType = "discovery" | "inquiry" | "change_request" | "other";

export interface ProcessAgentPayload {
  submission_id: string;
  override_intent?: CallIntentType | string;
  client_id?: string;
  project_id?: string;
  budget?: number;
}

export interface RouterResult {
  intent: CallIntentType | string;
  confidence: number;
  reason: string;
  needs_human_confirmation: boolean;
  top_choices?: Array<{
    intent: string;
    confidence: number;
    reason: string;
  }>;
}

export interface ProposalRequirement {
  id?: string;
  category?: string;
  text: string;
  time?: string;
}

export interface ProposalTask {
  id?: string;
  title: string;
  effort?: string;
  time?: string;
  estimated_hours?: number;
}

export interface ProposalQuote {
  total_price?: number;
  total_hours?: number;
  hourly_rate?: number;
  currency?: string;
}

export interface CallProposal {
  summary?: string;
  requirements: ProposalRequirement[];
  tasks: ProposalTask[];
  quote?: ProposalQuote;
  client_message_draft?: string;
}

export interface SavedItem {
  id: string;
  type: string;
  text: string;
  time: string | null;
  effort?: string | null;
}

export interface AgentProcessResponse {
  status: string;
  call_id: string;
  router_result: RouterResult;
  proposal: CallProposal | null;
  saved_items: SavedItem[];
}

export interface AgentStreamEvent {
  type: "log" | "result";
  step: string;
  message: string;
  percent: number;
  result?: AgentProcessResponse;
}

// --- Calls & Items ---
export interface CallItem {
  id: string;
  type: string; // 'requirement' | 'task' | 'message'
  text: string;
  original_agent_text: string | null;
  timestamp_link: string | null;
  effort: string | null;
  status: "proposed" | "edited" | "approved" | "deleted" | string;
}

export interface CallDetails {
  id: string;
  detected_intent: string;
  confidence: number;
  transcript_text: string | null;
  transcript_data: TranscriptLine[] | null;
  items: CallItem[];
}

export interface ItemUpdatePayload {
  text?: string;
  status?: "proposed" | "edited" | "approved" | "deleted" | string;
}

export interface ItemUpdateResponse {
  status: string;
  item: {
    id: string;
    type: string;
    text: string;
    original_agent_text: string | null;
    status: string;
  };
}

// --- Client & Project Memory ---
export interface Client {
  id: string;
  name: string;
  whatsapp_number: string | null;
  notes: string | null;
  created_at: string | null;
  project_count: number;
}

export interface ClientCreatePayload {
  name: string;
  whatsapp_number?: string;
  notes?: string;
}

export interface Project {
  id: string;
  client_id: string;
  title: string;
  status: string;
  created_at: string | null;
  call_count: number;
}

export interface ProjectCreatePayload {
  title: string;
  status?: string;
}

// --- Scope Confirmations ---
export interface ScopeConfirmation {
  id: string;
  call_id: string;
  proposed_scope_message: string;
  client_reply_text: string | null;
  status: "draft" | "sent" | "approved" | "disputed" | string;
  created_at: string | null;
}

export interface ConfirmationCreatePayload {
  proposed_scope_message: string;
}

export interface ConfirmationUpdatePayload {
  status: "draft" | "sent" | "approved" | "disputed" | string;
  client_reply_text?: string;
}
