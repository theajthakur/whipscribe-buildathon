import { apiClient } from "./client";
import { UserSettings, SettingsUpdatePayload, UpdateSettingsResponse } from "./types";

/**
 * Fetches current user settings (hourly rate, currency, message tone).
 */
export async function getSettings(): Promise<UserSettings> {
  const response = await apiClient.get<UserSettings>("/api/settings");
  return response.data;
}

/**
 * Updates user settings (hourly rate, currency, message tone).
 */
export async function updateSettings(
  payload: SettingsUpdatePayload
): Promise<UpdateSettingsResponse> {
  const response = await apiClient.patch<UpdateSettingsResponse>(
    "/api/settings",
    payload
  );
  return response.data;
}
