import { getAuth0RoleForAppRole } from "../config/roleAccess";

function isLoopbackHost(hostname) {
  return ["localhost", "127.0.0.1", "::1", "[::1]"].includes(String(hostname || "").toLowerCase());
}

function normalizeUrl(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function buildResolvedUrl(originUrl, configuredUrl) {
  const normalizedPath = configuredUrl.pathname === "/" ? "" : configuredUrl.pathname.replace(/\/+$/, "");
  return `${originUrl.origin}${normalizedPath}${configuredUrl.search}${configuredUrl.hash}`;
}

function resolveRuntimeUrl(value, fallback = "") {
  const configuredValue = normalizeUrl(value);
  const fallbackValue = normalizeUrl(fallback);
  if (typeof window === "undefined") {
    return configuredValue || fallbackValue;
  }

  if (!configuredValue) {
    return fallbackValue;
  }

  try {
    const configuredUrl = new URL(configuredValue, window.location.origin);
    const currentUrl = new URL(window.location.origin);

    if (isLoopbackHost(configuredUrl.hostname) && !isLoopbackHost(currentUrl.hostname)) {
      return buildResolvedUrl(currentUrl, configuredUrl);
    }

    if (configuredUrl.origin === currentUrl.origin) {
      return buildResolvedUrl(currentUrl, configuredUrl);
    }

    return normalizeUrl(configuredUrl.toString());
  } catch {
    return configuredValue;
  }
}

const AUTH0_DOMAIN = import.meta.env.VITE_AUTH0_DOMAIN || "";
const AUTH0_CLIENT_ID = import.meta.env.VITE_AUTH0_CLIENT_ID || "";
const AUTH0_AUDIENCE = resolveRuntimeUrl(import.meta.env.VITE_AUTH0_AUDIENCE);
const AUTH0_REDIRECT_URI = resolveRuntimeUrl(import.meta.env.VITE_AUTH0_REDIRECT_URI, window.location.origin);
const AUTH0_ROLE_CLAIM =
  resolveRuntimeUrl(import.meta.env.VITE_AUTH0_ROLE_CLAIM) ||
  `${new URL(AUTH0_REDIRECT_URI).origin.replace(/\/$/, "")}/roles`;

const AUTH_SESSION_KEY = "cif_auth0_session";
const AUTH_STATE_KEY = "cif_auth0_state";
const AUTH_CODE_VERIFIER_KEY = "cif_auth0_code_verifier";
const AUTH_REQUESTED_ROLE_KEY = "cif_requested_role";

function toBase64Url(input) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeBase64Url(input) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return atob(`${normalized}${padding}`);
}

function randomString(length = 64) {
  const bytes = new Uint8Array(length);
  window.crypto.getRandomValues(bytes);
  return toBase64Url(bytes).slice(0, length);
}

async function buildPkceChallenge(codeVerifier) {
  const encoded = new TextEncoder().encode(codeVerifier);
  const digest = await window.crypto.subtle.digest("SHA-256", encoded);
  return toBase64Url(new Uint8Array(digest));
}

function decodeJwtPayload(token) {
  if (!token) return {};
  const parts = token.split(".");
  if (parts.length < 2) return {};

  try {
    return JSON.parse(decodeBase64Url(parts[1]));
  } catch {
    return {};
  }
}

function normalizeRoles(rawRoles) {
  if (Array.isArray(rawRoles)) {
    return rawRoles.map((role) => String(role).trim().toLowerCase()).filter(Boolean);
  }
  if (typeof rawRoles === "string" && rawRoles.trim()) {
    return rawRoles
      .split(/[\s,;|]+/)
      .map((role) => role.trim().toLowerCase())
      .filter(Boolean);
  }
  return [];
}

function normalizeSession(tokens) {
  const accessPayload = decodeJwtPayload(tokens.access_token);
  const idPayload = decodeJwtPayload(tokens.id_token);
  const expiresAt = Date.now() + Number(tokens.expires_in || 0) * 1000;
  const roles = normalizeRoles(accessPayload[AUTH0_ROLE_CLAIM] || idPayload[AUTH0_ROLE_CLAIM] || []);

  return {
    accessToken: tokens.access_token || "",
    idToken: tokens.id_token || "",
    expiresAt,
    roles,
    user: {
      email: idPayload.email || accessPayload.email || "",
      name: idPayload.name || idPayload.nickname || idPayload.email || "",
      sub: idPayload.sub || accessPayload.sub || "",
    },
  };
}

function persistSession(session) {
  window.sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
}

function clearTransientAuthState() {
  window.sessionStorage.removeItem(AUTH_STATE_KEY);
  window.sessionStorage.removeItem(AUTH_CODE_VERIFIER_KEY);
}

function stripAuthQueryParams() {
  const current = new URL(window.location.href);
  current.searchParams.delete("code");
  current.searchParams.delete("state");
  current.searchParams.delete("error");
  current.searchParams.delete("error_description");
  const nextUrl = `${current.pathname}${current.search}${current.hash}`;
  window.history.replaceState({}, document.title, nextUrl || "/");
}

export function isAuth0Configured() {
  return Boolean(AUTH0_DOMAIN && AUTH0_CLIENT_ID && AUTH0_AUDIENCE && AUTH0_REDIRECT_URI);
}

export function hasAuthCallbackParams() {
  const params = new URLSearchParams(window.location.search);
  return params.has("code") || params.has("error");
}

export function getStoredSession() {
  const raw = window.sessionStorage.getItem(AUTH_SESSION_KEY);
  if (!raw) return null;

  try {
    const session = JSON.parse(raw);
    if (!session?.accessToken || !session?.expiresAt) {
      window.sessionStorage.removeItem(AUTH_SESSION_KEY);
      return null;
    }
    if (Number(session.expiresAt) <= Date.now()) {
      clearStoredSession();
      return null;
    }
    return session;
  } catch {
    window.sessionStorage.removeItem(AUTH_SESSION_KEY);
    return null;
  }
}

export function getAccessToken() {
  return getStoredSession()?.accessToken || "";
}

export function getRequestedAppRole() {
  return window.sessionStorage.getItem(AUTH_REQUESTED_ROLE_KEY) || "";
}

export function clearStoredSession() {
  window.sessionStorage.removeItem(AUTH_SESSION_KEY);
  window.sessionStorage.removeItem(AUTH_REQUESTED_ROLE_KEY);
  clearTransientAuthState();
}

export async function startAuth0Login(appRole) {
  if (!isAuth0Configured()) {
    throw new Error("Auth0 is not configured for this environment.");
  }

  if (!getAuth0RoleForAppRole(appRole)) {
    throw new Error("Unknown application role selected.");
  }

  const state = randomString(32);
  const codeVerifier = randomString(64);
  const codeChallenge = await buildPkceChallenge(codeVerifier);

  window.sessionStorage.setItem(AUTH_STATE_KEY, state);
  window.sessionStorage.setItem(AUTH_CODE_VERIFIER_KEY, codeVerifier);
  window.sessionStorage.setItem(AUTH_REQUESTED_ROLE_KEY, appRole);

  const authorizeUrl = new URL(`https://${AUTH0_DOMAIN}/authorize`);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("client_id", AUTH0_CLIENT_ID);
  authorizeUrl.searchParams.set("redirect_uri", AUTH0_REDIRECT_URI);
  authorizeUrl.searchParams.set("scope", "openid profile email");
  authorizeUrl.searchParams.set("audience", AUTH0_AUDIENCE);
  authorizeUrl.searchParams.set("code_challenge", codeChallenge);
  authorizeUrl.searchParams.set("code_challenge_method", "S256");
  authorizeUrl.searchParams.set("state", state);
  authorizeUrl.searchParams.set("prompt", "login");

  window.location.assign(authorizeUrl.toString());
}

export async function completeAuth0Login() {
  const params = new URLSearchParams(window.location.search);
  const error = params.get("error");
  if (error) {
    const description = params.get("error_description") || "Auth0 sign-in failed.";
    clearTransientAuthState();
    stripAuthQueryParams();
    throw new Error(description);
  }

  const returnedState = params.get("state") || "";
  const code = params.get("code") || "";
  const expectedState = window.sessionStorage.getItem(AUTH_STATE_KEY) || "";
  const codeVerifier = window.sessionStorage.getItem(AUTH_CODE_VERIFIER_KEY) || "";
  const requestedRole = getRequestedAppRole();

  if (!code || !returnedState || returnedState !== expectedState || !codeVerifier) {
    clearTransientAuthState();
    stripAuthQueryParams();
    throw new Error("Unable to verify the Auth0 login response.");
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: AUTH0_CLIENT_ID,
    code_verifier: codeVerifier,
    code,
    redirect_uri: AUTH0_REDIRECT_URI,
  });

  const response = await fetch(`https://${AUTH0_DOMAIN}/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    clearTransientAuthState();
    stripAuthQueryParams();
    throw new Error(payload.error_description || payload.error || "Unable to exchange Auth0 login code.");
  }

  const session = normalizeSession(payload);
  persistSession(session);
  clearTransientAuthState();
  stripAuthQueryParams();
  return { session, requestedRole };
}

export function logoutFromAuth0() {
  clearStoredSession();
  if (!isAuth0Configured()) return;

  const logoutUrl = new URL(`https://${AUTH0_DOMAIN}/v2/logout`);
  logoutUrl.searchParams.set("client_id", AUTH0_CLIENT_ID);
  logoutUrl.searchParams.set("returnTo", AUTH0_REDIRECT_URI);
  window.location.assign(logoutUrl.toString());
}
