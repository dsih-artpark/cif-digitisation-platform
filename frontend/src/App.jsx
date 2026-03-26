import { Alert, Box, CircularProgress, Container, Stack, Typography } from "@mui/material";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { getAuthSession, startGatekeeperLogin, startSignOut } from "./api/authClient";
import Navbar from "./components/Navbar/Navbar";
import {
  doesGrantedRoleAllowRequestedRole,
  getDefaultRoleForGrantedRole,
  getRoleHome,
  inferRoleFromPath,
  isRouteAllowed,
} from "./config/roleAccess";
import Dashboard from "./pages/Dashboard/Dashboard";
import UploadPage from "./pages/UploadPage/UploadPage";
import ProcessingPage from "./pages/ProcessingPage/ProcessingPage";
import CaseReviewPage from "./pages/CaseReviewPage/CaseReviewPage";
import Reports from "./pages/Reports/Reports";
import LandingPage from "./pages/LandingPage/LandingPage";

const ROLE_STORAGE_KEY = "cif_demo_active_role";

function readStoredRole() {
  if (typeof window === "undefined") return "";
  return window.sessionStorage.getItem(ROLE_STORAGE_KEY) || "";
}

function persistRole(role) {
  if (typeof window === "undefined") return;
  if (role) {
    window.sessionStorage.setItem(ROLE_STORAGE_KEY, role);
    return;
  }
  window.sessionStorage.removeItem(ROLE_STORAGE_KEY);
}

function FullPageLoader({ title, description }) {
  return (
    <Box
      sx={{
        minHeight: "calc(100vh - 48px)",
        display: "grid",
        placeItems: "center",
      }}
    >
      <Stack spacing={1.5} alignItems="center" textAlign="center">
        <CircularProgress size={34} />
        <Typography variant="h6">{title}</Typography>
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      </Stack>
    </Box>
  );
}

function resolveRoleForRoute(activeRole, grantedRole, routePath) {
  if (activeRole && isRouteAllowed(activeRole, routePath)) {
    return activeRole;
  }
  return inferRoleFromPath(routePath, grantedRole);
}

function RoleGuard({ authMode, activeRole, grantedRole, routePath, children }) {
  if (authMode === "gatekeeper") {
    if (!grantedRole) {
      return <Navigate to="/" replace />;
    }

    const effectiveRole = resolveRoleForRoute(activeRole, grantedRole, routePath);
    if (!effectiveRole || !isRouteAllowed(effectiveRole, routePath)) {
      return <Navigate to="/?authError=access_denied" replace />;
    }

    if (!doesGrantedRoleAllowRequestedRole(grantedRole, effectiveRole)) {
      return <Navigate to="/?authError=access_denied" replace />;
    }

    return children;
  }

  if (!activeRole) {
    return <Navigate to="/" replace />;
  }

  if (!isRouteAllowed(activeRole, routePath)) {
    return <Navigate to={getRoleHome(activeRole)} replace />;
  }

  return children;
}

function AuthCallback({ onGatekeeperResolved }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    const finalizeAuth = async () => {
      const requestedRole = searchParams.get("requested_role") || "";

      try {
        const session = await getAuthSession(requestedRole);
        if (cancelled) return;

        if (!session?.authenticated || !session?.requestedRoleAllowed || !requestedRole) {
          onGatekeeperResolved("", "");
          navigate("/?authError=access_denied", { replace: true });
          return;
        }

        const grantedRole = session.user?.grantedRole || "";
        onGatekeeperResolved(requestedRole, grantedRole);
        navigate(getRoleHome(requestedRole), { replace: true });
      } catch (error) {
        if (cancelled) return;
        setErrorMessage(error instanceof Error ? error.message : "Unable to complete Gatekeeper sign in.");
      }
    };

    void finalizeAuth();

    return () => {
      cancelled = true;
    };
  }, [navigate, onGatekeeperResolved, searchParams]);

  if (errorMessage) {
    return (
      <Box sx={{ py: { xs: 4, md: 6 } }}>
        <Alert severity="error">{errorMessage}</Alert>
      </Box>
    );
  }

  return (
    <FullPageLoader
      title="Completing sign in"
      description="Verifying your Gatekeeper access and loading the correct CIF workspace."
    />
  );
}

function App() {
  const location = useLocation();
  const [activeRole, setActiveRole] = useState(readStoredRole);
  const [authMode, setAuthMode] = useState("loading");
  const [grantedRole, setGrantedRole] = useState("");
  const [authReady, setAuthReady] = useState(false);
  const isLandingPage = location.pathname === "/";

  useEffect(() => {
    let cancelled = false;

    const hydrateAuth = async () => {
      try {
        const session = await getAuthSession();
        if (cancelled) return;

        const nextMode = session?.mode === "gatekeeper" ? "gatekeeper" : "demo";
        const nextGrantedRole = session?.user?.grantedRole || "";

        setAuthMode(nextMode);
        setGrantedRole(nextGrantedRole);

        if (nextMode === "gatekeeper") {
          const storedRole = readStoredRole();
          const requestedRole = doesGrantedRoleAllowRequestedRole(nextGrantedRole, storedRole)
            ? storedRole
            : inferRoleFromPath(location.pathname, nextGrantedRole);
          setActiveRole(requestedRole);
          persistRole(requestedRole);
        }
      } catch {
        if (cancelled) return;
        setAuthMode("demo");
      } finally {
        if (!cancelled) {
          setAuthReady(true);
        }
      }
    };

    void hydrateAuth();

    return () => {
      cancelled = true;
    };
  }, [location.pathname]);

  useEffect(() => {
    if (authMode !== "gatekeeper" || !grantedRole) return;

    const nextRole = resolveRoleForRoute(activeRole, grantedRole, location.pathname);
    if (nextRole && nextRole !== activeRole) {
      setActiveRole(nextRole);
      persistRole(nextRole);
    }
  }, [activeRole, authMode, grantedRole, location.pathname]);

  const effectiveRole = useMemo(() => {
    if (authMode === "gatekeeper") {
      return activeRole || getDefaultRoleForGrantedRole(grantedRole);
    }
    return activeRole;
  }, [activeRole, authMode, grantedRole]);
  const roleHome = useMemo(() => getRoleHome(effectiveRole), [effectiveRole]);

  const handleRoleSelect = useCallback((role) => {
    setActiveRole(role);
    persistRole(role);
  }, []);

  const handleGatekeeperLogin = useCallback((role) => {
    persistRole(role);
    startGatekeeperLogin(role);
  }, []);

  const handleGatekeeperResolved = useCallback((requestedRole, nextGrantedRole) => {
    setGrantedRole(nextGrantedRole);
    setActiveRole(requestedRole);
    persistRole(requestedRole);
  }, []);

  const handleSignOut = useCallback(() => {
    setActiveRole("");
    persistRole("");
    if (authMode === "gatekeeper") {
      startSignOut();
      return;
    }
  }, [authMode]);

  const authMessage = useMemo(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("authError") === "access_denied") {
      return "Access denied. Please sign in with a permitted CIF role.";
    }
    return "";
  }, [location.search]);

  if (!authReady || authMode === "loading") {
    return (
      <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
        <Container maxWidth="xl" sx={{ py: { xs: 3, md: 4 } }}>
          <FullPageLoader title="Loading CIF Digitisation System" description="Checking your access configuration." />
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      {!isLandingPage && effectiveRole && <Navbar activeRole={effectiveRole} onSignOut={handleSignOut} />}
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
              element={
                effectiveRole && !authMessage ? (
                  <Navigate to={roleHome} replace />
                ) : (
                  <LandingPage
                    authMode={authMode}
                    authMessage={authMessage}
                    onAccessSelect={handleRoleSelect}
                    onGatekeeperLogin={handleGatekeeperLogin}
                  />
                )
              }
            />
            <Route path="/auth/callback" element={<AuthCallback onGatekeeperResolved={handleGatekeeperResolved} />} />
            <Route
              path="/dashboard"
              element={
                <RoleGuard authMode={authMode} activeRole={activeRole} grantedRole={grantedRole} routePath="/dashboard">
                  <Dashboard activeRole={effectiveRole} />
                </RoleGuard>
              }
            />
            <Route
              path="/upload"
              element={
                <RoleGuard authMode={authMode} activeRole={activeRole} grantedRole={grantedRole} routePath="/upload">
                  <UploadPage activeRole={effectiveRole} />
                </RoleGuard>
              }
            />
            <Route
              path="/processing"
              element={
                <RoleGuard authMode={authMode} activeRole={activeRole} grantedRole={grantedRole} routePath="/processing">
                  <ProcessingPage activeRole={effectiveRole} />
                </RoleGuard>
              }
            />
            <Route
              path="/case-review"
              element={
                <RoleGuard authMode={authMode} activeRole={activeRole} grantedRole={grantedRole} routePath="/case-review">
                  <CaseReviewPage activeRole={effectiveRole} />
                </RoleGuard>
              }
            />
            <Route
              path="/reports"
              element={
                <RoleGuard authMode={authMode} activeRole={activeRole} grantedRole={grantedRole} routePath="/reports">
                  <Reports />
                </RoleGuard>
              }
            />
            <Route path="*" element={<Navigate to={effectiveRole ? roleHome : "/"} replace />} />
          </Routes>
        </Box>
      </Container>
    </Box>
  );
}

export default App;
