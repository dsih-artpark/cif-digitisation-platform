export const DEMO_ROLES = {
  USER_ANALYTICS: "user_analytics",
  FRONT_LINE_WORKER: "front_line_worker",
  MEDICAL_OFFICER: "medical_officer",
};

export const GATEKEEPER_ROLE_TO_APP_ROLE = {
  admin: DEMO_ROLES.USER_ANALYTICS,
  flw: DEMO_ROLES.FRONT_LINE_WORKER,
  mo: DEMO_ROLES.MEDICAL_OFFICER,
};

export const APP_ROLE_TO_GATEKEEPER_ROLE = Object.fromEntries(
  Object.entries(GATEKEEPER_ROLE_TO_APP_ROLE).map(([gatekeeperRole, appRole]) => [appRole, gatekeeperRole]),
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

export function doesGrantedRoleAllowRequestedRole(grantedRole, requestedRole) {
  if (!grantedRole || !requestedRole) return false;
  if (grantedRole === "admin") return true;
  return APP_ROLE_TO_GATEKEEPER_ROLE[requestedRole] === grantedRole;
}

export function getDefaultRoleForGrantedRole(grantedRole) {
  return GATEKEEPER_ROLE_TO_APP_ROLE[grantedRole] || "";
}

export function inferRoleFromPath(pathname, grantedRole = "") {
  if (!pathname) return getDefaultRoleForGrantedRole(grantedRole);
  if (pathname === "/upload" || pathname === "/processing" || pathname === "/case-review") {
    return DEMO_ROLES.FRONT_LINE_WORKER;
  }
  if (pathname === "/reports") {
    return DEMO_ROLES.USER_ANALYTICS;
  }
  if (pathname === "/dashboard") {
    return grantedRole === "admin" ? DEMO_ROLES.USER_ANALYTICS : DEMO_ROLES.MEDICAL_OFFICER;
  }
  return getDefaultRoleForGrantedRole(grantedRole);
}
