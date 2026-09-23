import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from "axios";
import { ApiError } from "./types";

// Declare global window Clerk object for token access in browser
declare global {
  interface Window {
    Clerk?: {
      session?: {
        getToken: () => Promise<string | null>;
      };
    };
  }
}

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.BACKEND_URL ||
  "http://localhost:8000";

export const apiClient: AxiosInstance = axios.create({
  baseURL: BACKEND_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request Interceptor: Attach Clerk Authorization Bearer token automatically
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    if (typeof window !== "undefined" && window.Clerk?.session) {
      try {
        const token = await window.Clerk.session.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch (err) {
        console.warn("[CallBrief API Client] Could not retrieve Clerk auth token:", err);
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Transient retry logic & error normalization
const MAX_RETRIES = 2;

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as InternalAxiosRequestConfig & { _retryCount?: number };

    if (!config) {
      return Promise.reject(normalizeError(error));
    }

    const currentRetry = config._retryCount || 0;
    const status = error.response?.status;
    const isNetworkOrTimeout = !error.response || error.code === "ECONNABORTED";

    // Transient status codes: 408 (Timeout), 429 (Rate Limit), 5xx (Server Errors)
    const isTransientStatus = status === 408 || status === 429 || (status !== undefined && status >= 500);
    const shouldRetry = (isNetworkOrTimeout || isTransientStatus) && currentRetry < MAX_RETRIES;

    if (shouldRetry) {
      config._retryCount = currentRetry + 1;
      const backoffDelay = 500 * Math.pow(2, currentRetry);
      await new Promise((resolve) => setTimeout(resolve, backoffDelay));
      return apiClient(config);
    }

    return Promise.reject(normalizeError(error));
  }
);

/**
 * Normalizes Axios errors into standard ApiError objects
 */
function normalizeError(error: AxiosError): ApiError {
  if (!error.response) {
    return new ApiError(
      error.message || "Network error. Unable to connect to CallBrief backend.",
      0,
      null,
      true
    );
  }

  const statusCode = error.response.status;
  const data = error.response.data as { detail?: string | unknown; message?: string };
  let message = "An error occurred while communicating with the server.";

  if (data?.detail) {
    message = typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail);
  } else if (data?.message) {
    message = data.message;
  } else if (error.message) {
    message = error.message;
  }

  return new ApiError(message, statusCode, data, false);
}

export { BACKEND_URL };
