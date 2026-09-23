import { apiClient } from "./client";
import {
  UploadResponse,
  SubmissionSummary,
  SubmissionStatusResponse,
  SubmissionAudioResponse,
  SourceType,
} from "./types";

/**
 * Uploads an audio file or recording to CallBrief backend for transcription.
 */
export async function uploadRecording(
  file: File,
  sourceType: SourceType = "audio_file"
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("source_type", sourceType);

  const response = await apiClient.post<UploadResponse>("/api/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
}

/**
 * Lists all audio submissions belonging to the current user.
 */
export async function getSubmissions(): Promise<SubmissionSummary[]> {
  const response = await apiClient.get<SubmissionSummary[]>("/api/submissions");
  return response.data;
}

/**
 * Deletes a submission record and its local audio file.
 */
export async function deleteSubmission(
  submissionId: string
): Promise<{ status: string; deleted_submission_id: string }> {
  const response = await apiClient.delete<{
    status: string;
    deleted_submission_id: string;
  }>(`/api/submissions/${submissionId}`);
  return response.data;
}

/**
 * Polls the backend for transcription job status and formatted transcript lines.
 */
export async function getSubmissionStatus(
  submissionId: string
): Promise<SubmissionStatusResponse> {
  const response = await apiClient.get<SubmissionStatusResponse>(
    `/api/submissions/${submissionId}/status`
  );
  return response.data;
}

/**
 * Retrieves the playable audio URL (WhipScribe signed URL or local static fallback).
 */
export async function getSubmissionAudio(
  submissionId: string
): Promise<SubmissionAudioResponse> {
  const response = await apiClient.get<SubmissionAudioResponse>(
    `/api/submissions/${submissionId}/audio`
  );
  return response.data;
}
