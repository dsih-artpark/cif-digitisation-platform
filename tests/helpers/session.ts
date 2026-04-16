import type { Page } from "@playwright/test";

const AUTH_SESSION_KEY = "cif_auth0_session";
const ROLE_STORAGE_KEY = "cif_demo_active_role";

function buildFakeAuthSession(role = "admin") {
  return {
    accessToken: "playwright-access-token",
    idToken: "playwright-id-token",
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    roles: [role],
    user: {
      email: "playwright@example.com",
      name: "Playwright User",
      sub: "playwright|user",
    },
  };
}

export async function seedAuthenticatedAdminSession(page: Page) {
  const session = buildFakeAuthSession("admin");
  await page.addInitScript(
    ({ authSessionKey, roleStorageKey, sessionValue, roleValue }) => {
      window.sessionStorage.setItem(authSessionKey, sessionValue);
      window.sessionStorage.setItem(roleStorageKey, roleValue);
    },
    {
      authSessionKey: AUTH_SESSION_KEY,
      roleStorageKey: ROLE_STORAGE_KEY,
      sessionValue: JSON.stringify(session),
      roleValue: "admin",
    }
  );
}
