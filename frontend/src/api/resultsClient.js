import { getAccessToken } from "./authClient";

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
  return fallbackMessage;
}

export async function getRecentResults(limit = 10) {
  const accessToken = getAccessToken();
  const response = await fetch(`${API_BASE_URL}/api/results/recent?limit=${encodeURIComponent(limit)}`, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(parseErrorMessage(payload, "Unable to fetch results."));
  }

  const records = Array.isArray(payload?.records) ? payload.records : [];
  return records;
}
