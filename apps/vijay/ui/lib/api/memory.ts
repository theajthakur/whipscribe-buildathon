import { apiClient } from "./client";
import {
  Client,
  ClientCreatePayload,
  Project,
  ProjectCreatePayload,
} from "./types";

/**
 * Lists all clients belonging to current authenticated user.
 */
export async function getClients(): Promise<Client[]> {
  const response = await apiClient.get<Client[]>("/api/clients");
  return response.data;
}

/**
 * Creates a new client profile.
 */
export async function createClient(
  payload: ClientCreatePayload
): Promise<{ status: string; client: { id: string; name: string } }> {
  const response = await apiClient.post<{
    status: string;
    client: { id: string; name: string };
  }>("/api/clients", payload);
  return response.data;
}

/**
 * Lists projects associated with a client.
 */
export async function getClientProjects(clientId: string): Promise<Project[]> {
  const response = await apiClient.get<Project[]>(
    `/api/clients/${clientId}/projects`
  );
  return response.data;
}

/**
 * Creates a new project for a client.
 */
export async function createProject(
  clientId: string,
  payload: ProjectCreatePayload
): Promise<{ status: string; project: { id: string; title: string; client_id: string } }> {
  const response = await apiClient.post<{
    status: string;
    project: { id: string; title: string; client_id: string };
  }>(`/api/clients/${clientId}/projects`, payload);
  return response.data;
}
