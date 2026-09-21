import axios from "axios"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"

export const apiClient = axios.create({
  baseURL: BACKEND_URL,
  timeout: 60000,
})

/**
 * Sets current Clerk User ID on outgoing API requests
 */
export function setApiUserId(userId: string | null) {
  if (userId) {
    apiClient.defaults.headers.common["X-User-Id"] = userId
  } else {
    delete apiClient.defaults.headers.common["X-User-Id"]
  }
}
