import { Box, CircularProgress, Container, Typography } from "@mui/material";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar/Navbar";
import { getRoleHome, isRouteAllowed, mapGatekeeperRoleToAppRole } from "./config/roleAccess";
import Dashboard from "./pages/Dashboard/Dashboard";
import UploadPage from "./pages/UploadPage/UploadPage";
import ProcessingPage from "./pages/ProcessingPage/ProcessingPage";
import CaseReviewPage from "./pages/CaseReviewPage/CaseReviewPage";
import Reports from "./pages/Reports/Reports";
import LandingPage from "./pages/LandingPage/LandingPage";

const GATEKEEPER_BASE_URL = (import.meta.env.VITE_GATEKEEPER_URL || "").replace(/\/+$/, "");
const GATEKEEPER_APP_SLUG = (import.meta.env.VITE_GATEKEEPER_APP_SLUG || "").trim().toLowerCase();

function extractEmail(meData) {
  if (!meData || typeof meData !== "object") return "";

  const directCandidates = [
    meData.email,
    meData.primary_email,
    meData.user_email,
    meData.mail,
  ];

  for (const candidate of directCandidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim().toLowerCase();
    }
  }

  if (meData.user && typeof meData.user === "object") {
    return extractEmail(meData.user);
  }

  return "";
}

function matchesCifApp(entry) {
  if (!entry || typeof entry !== "object") return false;

  const exactSlug = (entry.app_slug || "").trim().toLowerCase();
  if (GATEKEEPER_APP_SLUG && exactSlug === GATEKEEPER_APP_SLUG) {
    return true;
  }

  if (GATEKEEPER_APP_SLUG) {
    return false;
  }

  const searchableValues = [
    entry.app_slug,
    entry.app_name,
    entry.name,
    entry.title,
  ]
    .filter((value) => typeof value === "string")
    .map((value) => value.trim().toLowerCase());

  return searchableValues.some((value) => value.includes("cif"));
}

async function getSessionRole() {
  const meResponse = await fetch(`${GATEKEEPER_BASE_URL}/api/v1/auth/me`, {
    credentials: "include",
  });

  if (meResponse.status === 401) {
    return { activeRole: "", authError: "" };
  }

  if (!meResponse.ok) {
    throw new Error("Unable to verify current session.");
  }

  const meData = await meResponse.json();
  const signedInEmail = extractEmail(meData);
  const appsResponse = await fetch(`${GATEKEEPER_BASE_URL}/api/v1/auth/me/apps`, {
    credentials: "include",
  });

  if (!appsResponse.ok) {
    throw new Error("Unable to fetch app access details.");
  }

  const appEntries = await appsResponse.json();
  const cifAppEntry = Array.isArray(appEntries)
    ? appEntries.find((item) => matchesCifApp(item))
    : null;

  if (!cifAppEntry) {
    return {
      activeRole: "",
      authError: "Your account is signed in but does not have CIF access. Contact admin for role grant.",
    };
  }

  const gatekeeperRole = cifAppEntry?.role || "";
  const activeRole = mapGatekeeperRoleToAppRole(gatekeeperRole, {
    isAdmin: Boolean(meData?.is_admin),
    email: signedInEmail,
  });

  if (!activeRole) {
    return {
      activeRole: "",
      authError: "Your account is signed in but does not have CIF access. Contact admin for role grant.",
    };
  }

  return { activeRole, authError: "" };
}

function RoleGuard({ activeRole, routePath, children }) {
  if (!activeRole) {
    return <Navigate to="/" replace />;
  }

  if (!isRouteAllowed(activeRole, routePath)) {
    return <Navigate to={getRoleHome(activeRole)} replace />;
  }

  return children;
}

function App() {
  const location = useLocation();
  const [activeRole, setActiveRole] = useState("");
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const isLandingPage = location.pathname === "/";
  const roleHome = useMemo(() => getRoleHome(activeRole), [activeRole]);

  const refreshSession = useCallback(async () => {
    setAuthLoading(true);
    try {
      const sessionInfo = await getSessionRole();
      setActiveRole(sessionInfo.activeRole);
      setAuthError(sessionInfo.authError);
    } catch (_error) {
      setActiveRole("");
      setAuthError("Authentication service is unavailable. Please try again.");
    } finally {
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const handleSignOut = useCallback(async () => {
    try {
      await fetch(`${GATEKEEPER_BASE_URL}/api/v1/auth/signout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (_error) {
      // Silent fallback handled by redirect below.
    } finally {
      setActiveRole("");
      setAuthError("");
      window.location.href = `${GATEKEEPER_BASE_URL}/signout?redirect=${encodeURIComponent(
        `${window.location.origin}/`
      )}`;
    }
  }, []);

  if (authLoading) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          bgcolor: "background.default",
          px: 2,
        }}
      >
        <Box sx={{ textAlign: "center" }}>
          <CircularProgress size={32} />
          <Typography variant="body2" color="text.secondary" mt={1.5}>
            Checking secure session...
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      {!isLandingPage && activeRole && <Navbar activeRole={activeRole} onSignOut={handleSignOut} />}
      <Container
        maxWidth="xl"
        sx={{
          py: isLandingPage ? { xs: 0.5, md: 1 } : { xs: 2, md: 3 },
          px: { xs: 1.5, sm: 2, md: 3 },
        }}
      >
        <Box key={location.pathname} className="page-fade">
          <Routes>
            <Route
              path="/"
              element={activeRole ? <Navigate to={roleHome} replace /> : <LandingPage authError={authError} />}
            />
            <Route
              path="/dashboard"
              element={
                <RoleGuard activeRole={activeRole} routePath="/dashboard">
                  <Dashboard activeRole={activeRole} />
                </RoleGuard>
              }
            />
            <Route
              path="/upload"
              element={
                <RoleGuard activeRole={activeRole} routePath="/upload">
                  <UploadPage activeRole={activeRole} />
                </RoleGuard>
              }
            />
            <Route
              path="/processing"
              element={
                <RoleGuard activeRole={activeRole} routePath="/processing">
                  <ProcessingPage activeRole={activeRole} />
                </RoleGuard>
              }
            />
            <Route
              path="/case-review"
              element={
                <RoleGuard activeRole={activeRole} routePath="/case-review">
                  <CaseReviewPage activeRole={activeRole} />
                </RoleGuard>
              }
            />
            <Route
              path="/reports"
              element={
                <RoleGuard activeRole={activeRole} routePath="/reports">
                  <Reports />
                </RoleGuard>
              }
            />
            <Route path="*" element={<Navigate to={activeRole ? roleHome : "/"} replace />} />
          </Routes>
        </Box>
      </Container>
    </Box>
  );
}

export default App;
