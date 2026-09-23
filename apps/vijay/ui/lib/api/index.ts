/**
 * Central CallBrief API Barrel Export
 * Usage: import { getSettings, uploadRecording, processAgentCall } from '@/lib/api'
 */

export * from "./types";
export { apiClient, BACKEND_URL } from "./client";
export * from "./settings";
export * from "./submissions";
export * from "./agent";
export * from "./calls";
export * from "./memory";
export * from "./confirmations";
