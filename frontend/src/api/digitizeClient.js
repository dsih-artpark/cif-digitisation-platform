import { getAccessToken } from "./authClient";
import { resolveDocumentMimeType, MAX_UPLOAD_FILE_SIZE } from "../utils/documentFile";

function isLoopbackHost(hostname) {
  return ["localhost", "127.0.0.1", "::1", "[::1]"].includes(String(hostname || "").toLowerCase());
}

function normalizeBaseUrl(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function resolveApiBaseUrl() {
  const configuredBaseUrl = normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL);
  if (!configuredBaseUrl || typeof window === "undefined") {
    return configuredBaseUrl;
  }

  try {
    const configuredUrl = new URL(configuredBaseUrl, window.location.origin);
    const currentUrl = new URL(window.location.origin);

    if (isLoopbackHost(configuredUrl.hostname) && !isLoopbackHost(currentUrl.hostname)) {
      return "";
    }

    if (configuredUrl.origin === currentUrl.origin) {
      return "";
    }

    return configuredBaseUrl;
  } catch {
    return configuredBaseUrl;
  }
}

const API_BASE_URL = resolveApiBaseUrl();

function parseErrorMessage(payload, fallbackMessage) {
  if (!payload || typeof payload !== "object") return fallbackMessage;
  if (typeof payload.detail === "string" && payload.detail.trim()) return payload.detail;
  if (typeof payload.message === "string" && payload.message.trim()) return payload.message;
  if (typeof payload.error === "string" && payload.error.trim()) return payload.error;
  if (
    payload.error &&
    typeof payload.error === "object" &&
    typeof payload.error.message === "string" &&
    payload.error.message.trim()
  ) {
    return payload.error.message;
  }
  return fallbackMessage;
}

export async function createDigitizeJob(file) {
  const accessToken = getAccessToken();
  const formData = new FormData();
  const resolvedFileType = resolveDocumentMimeType(file) || file.type || "application/octet-stream";

  if (file.size > MAX_UPLOAD_FILE_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    const limitMB = Math.round(MAX_UPLOAD_FILE_SIZE / (1024 * 1024));
    throw new Error(
      `File is too large (${sizeMB} MB). Maximum size is ${limitMB} MB. Please use a smaller or lower-quality image.`
    );
  }

  formData.append("file", file, file.name);
  formData.append("file_name", file.name);
  formData.append("file_type", resolvedFileType);

  let response;
  try {
    response = await fetch(`${API_BASE_URL}/digitize`, {
      method: "POST",
      headers: {
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: formData,
    });
  } catch (networkError) {
    const isTimeout = networkError?.name === "AbortError" || networkError?.name === "TimeoutError";
    throw new Error(
      isTimeout
        ? "Upload timed out. The file may be too large or your connection is slow. Please try again."
        : "Unable to reach the upload service. Please check your connection and try again."
    );
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(parseErrorMessage(payload, "Unable to start document processing."));
  }

  if (!payload?.jobId) {
    throw new Error("Backend did not return a valid job id.");
  }

  return payload.jobId;
}

export async function getDigitizeJob(jobId) {
  const accessToken = getAccessToken();
  const response = await fetch(`${API_BASE_URL}/digitize/${jobId}`, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(parseErrorMessage(payload, "Unable to fetch processing status."));
  }

  if (!payload?.job) {
    throw new Error("Backend status response was incomplete.");
  }

  return payload.job;
}
