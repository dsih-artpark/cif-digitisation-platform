export const DEMO_ROLES = {
  USER_ANALYTICS: "user_analytics",
  FRONT_LINE_WORKER: "front_line_worker",
  MEDICAL_OFFICER: "medical_officer",
};

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
