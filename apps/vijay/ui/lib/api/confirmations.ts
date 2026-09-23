import { apiClient } from "./client";
import {
  ScopeConfirmation,
  ConfirmationCreatePayload,
  ConfirmationUpdatePayload,
} from "./types";

/**
 * Creates or updates a scope confirmation tracking record for a call.
 */
export async function createConfirmation(
  callId: string,
  payload: ConfirmationCreatePayload
): Promise<{ status: string; confirmation: Partial<ScopeConfirmation> }> {
  const response = await apiClient.post<{
    status: string;
    confirmation: Partial<ScopeConfirmation>;
  }>(`/api/calls/${callId}/confirmation`, payload);
  return response.data;
}

/**
 * Retrieves scope confirmation record for a call.
 */
export async function getConfirmation(
  callId: string
): Promise<ScopeConfirmation> {
  const response = await apiClient.get<ScopeConfirmation>(
    `/api/calls/${callId}/confirmation`
  );
  return response.data;
}

/**
 * Updates scope confirmation status ('draft', 'sent', 'approved', 'disputed') and client reply.
 */
export async function updateConfirmation(
  confirmationId: string,
  payload: ConfirmationUpdatePayload
): Promise<{ status: string; confirmation: Partial<ScopeConfirmation> }> {
  const response = await apiClient.patch<{
    status: string;
    confirmation: Partial<ScopeConfirmation>;
  }>(`/api/confirmations/${confirmationId}`, payload);
  return response.data;
}
