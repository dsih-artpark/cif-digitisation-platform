function parseErrorMessage(payload, fallbackMessage) {
  if (!payload || typeof payload !== "object") return fallbackMessage;
  if (typeof payload.detail === "string" && payload.detail.trim()) return payload.detail;
  if (typeof payload.message === "string" && payload.message.trim()) return payload.message;
  return fallbackMessage;
}

export async function getAuthSession(requestedRole = "") {
  const query = requestedRole ? `?requested_role=${encodeURIComponent(requestedRole)}` : "";
  const response = await fetch(`/api/auth/session${query}`, {
    credentials: "same-origin",
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(parseErrorMessage(payload, "Unable to read authentication state."));
  }

  return payload;
}

export function startGatekeeperLogin(requestedRole) {
  window.location.assign(`/api/auth/login?requested_role=${encodeURIComponent(requestedRole)}`);
}

export function startSignOut() {
  window.location.assign("/api/auth/logout");
}
