export const DEMO_ROLES = {
  USER_ANALYTICS: "user_analytics",
  FRONT_LINE_WORKER: "front_line_worker",
  MEDICAL_OFFICER: "medical_officer",
};

export const GATEKEEPER_ROLE_MAP = {
  admin: DEMO_ROLES.USER_ANALYTICS,
  user_analytics: DEMO_ROLES.USER_ANALYTICS,
  flw: DEMO_ROLES.FRONT_LINE_WORKER,
  frontline_worker: DEMO_ROLES.FRONT_LINE_WORKER,
  front_line_worker: DEMO_ROLES.FRONT_LINE_WORKER,
  mo: DEMO_ROLES.MEDICAL_OFFICER,
  medical_officer: DEMO_ROLES.MEDICAL_OFFICER,
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

export function mapGatekeeperEmailToAppRole(email) {
  const normalizedEmail = (email || "").trim().toLowerCase();

  if (!normalizedEmail.endsWith("@artpark.in")) {
    return "";
  }

  if (normalizedEmail.includes("+flw@artpark.in")) {
    return DEMO_ROLES.FRONT_LINE_WORKER;
  }

  if (normalizedEmail.includes("+mo@artpark.in")) {
    return DEMO_ROLES.MEDICAL_OFFICER;
  }

  // Current test-user convention: plain @artpark.in address without a +suffix is admin.
  if (!normalizedEmail.includes("+")) {
    return DEMO_ROLES.USER_ANALYTICS;
  }

  return "";
}

export function mapGatekeeperRoleToAppRole(gatekeeperRole, options = {}) {
  const normalizedRole = (gatekeeperRole || "").trim().toLowerCase();
  const isAdmin = typeof options === "object" ? Boolean(options.isAdmin) : Boolean(options);
  const email = typeof options === "object" ? options.email || "" : "";

  if (normalizedRole && GATEKEEPER_ROLE_MAP[normalizedRole]) {
    return GATEKEEPER_ROLE_MAP[normalizedRole];
  }

  const emailMappedRole = mapGatekeeperEmailToAppRole(email);
  if (emailMappedRole) {
    return emailMappedRole;
  }

  if (isAdmin) {
    return DEMO_ROLES.USER_ANALYTICS;
  }

  return "";
}
