import { apiClient } from "./client";
import { CallDetails, ItemUpdatePayload, ItemUpdateResponse } from "./types";

/**
 * Retrieves detailed call brief, detected intent, confidence, and items.
 */
export async function getCallDetails(callId: string): Promise<CallDetails> {
  const response = await apiClient.get<CallDetails>(`/api/calls/${callId}`);
  return response.data;
}

/**
 * Edits an extracted requirement, task, or message item text and updates its status.
 */
export async function updateItem(
  itemId: string,
  payload: ItemUpdatePayload
): Promise<ItemUpdateResponse> {
  const response = await apiClient.patch<ItemUpdateResponse>(
    `/api/items/${itemId}`,
    payload
  );
  return response.data;
}
