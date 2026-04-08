import { getAccessToken } from "./authClient";
import { resolveDocumentMimeType } from "../utils/documentFile";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

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
  formData.append("file", file, file.name);
  formData.append("file_name", file.name);
  formData.append("file_type", resolvedFileType);

  let response;
  try {
    response = await fetch(`${API_BASE_URL}/api/digitize`, {
      method: "POST",
      headers: {
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: formData,
    });
  } catch (error) {
    throw new Error(
      "Unable to reach the upload service. Please check your internet connection and sign in again."
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
  const response = await fetch(`${API_BASE_URL}/api/digitize/${jobId}`, {
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
