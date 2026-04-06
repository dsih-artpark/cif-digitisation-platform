export const DEMO_ROLES = {
  USER_ANALYTICS: "user_analytics",
  FRONT_LINE_WORKER: "front_line_worker",
  MEDICAL_OFFICER: "medical_officer",
};

export const AUTH0_ROLE_TO_APP_ROLE = {
  admin: DEMO_ROLES.USER_ANALYTICS,
  flw: DEMO_ROLES.FRONT_LINE_WORKER,
  mo: DEMO_ROLES.MEDICAL_OFFICER,
};

export const APP_ROLE_TO_AUTH0_ROLE = Object.fromEntries(
  Object.entries(AUTH0_ROLE_TO_APP_ROLE).map(([auth0Role, appRole]) => [appRole, auth0Role]),
);

export const ROLE_ACCESS = {
  [DEMO_ROLES.USER_ANALYTICS]: {
    label: "User Analytics",
    home: "/dashboard",
    allowedRoutes: ["/dashboard", "/upload", "/processing", "/case-review", "/reports"],
    navItems: [
      { label: "Dashboard", path: "/dashboard" },
      { label: "Upload CIF", path: "/upload" },
      { label: "Case Records", path: "/case-review" },
      { label: "Reports", path: "/reports" },
    ],
  },
  [DEMO_ROLES.FRONT_LINE_WORKER]: {
    label: "Front Line Worker",
    home: "/upload",
    allowedRoutes: ["/upload", "/processing", "/case-review"],
    navItems: [
      { label: "Upload CIF", path: "/upload" },
      { label: "Case Records", path: "/case-review" },
    ],
  },
  [DEMO_ROLES.MEDICAL_OFFICER]: {
    label: "Medical Officer",
    home: "/dashboard",
    allowedRoutes: ["/dashboard"],
    navItems: [{ label: "Dashboard", path: "/dashboard" }],
  },
};

export function getRoleHome(role) {
  return ROLE_ACCESS[role]?.home || "/";
}

export function isRouteAllowed(role, path) {
  if (!role || !path) return false;
  return ROLE_ACCESS[role]?.allowedRoutes.includes(path) ?? false;
}

export function getAuth0RoleForAppRole(appRole) {
  return APP_ROLE_TO_AUTH0_ROLE[appRole] || "";
}

export function appRoleMatchesAssignedRoles(appRole, assignedRoles = []) {
  const expectedAuth0Role = getAuth0RoleForAppRole(appRole);
  if (!expectedAuth0Role) return false;
  return assignedRoles.includes(expectedAuth0Role);
}
