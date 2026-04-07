import { Box, CircularProgress, Container, Stack, Typography } from "@mui/material";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import Navbar from "./components/Navbar/Navbar";
import {
  appRoleMatchesAssignedRoles,
  getRoleHome,
  isRouteAllowed,
} from "./config/roleAccess";
import {
  clearStoredSession,
  completeAuth0Login,
  getStoredSession,
  hasAuthCallbackParams,
  isAuth0Configured,
  logoutFromAuth0,
  startAuth0Login,
} from "./api/authClient";
import Dashboard from "./pages/Dashboard/Dashboard";
import UploadPage from "./pages/UploadPage/UploadPage";
import ProcessingPage from "./pages/ProcessingPage/ProcessingPage";
import CaseReviewPage from "./pages/CaseReviewPage/CaseReviewPage";
import Reports from "./pages/Reports/Reports";
import LandingPage from "./pages/LandingPage/LandingPage";

const ROLE_STORAGE_KEY = "cif_demo_active_role";

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

function RoleGuard({ activeRole, isAuthenticated, routePath, children }) {
  if (!isAuthenticated || !activeRole) {
    return <Navigate to="/" replace />;
  }

  if (!isRouteAllowed(activeRole, routePath)) {
    return <Navigate to={getRoleHome(activeRole)} replace />;
  }

  return children;
}

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeRole, setActiveRole] = useState(() => {
    if (typeof window === "undefined") return "";
    return window.sessionStorage.getItem(ROLE_STORAGE_KEY) || "";
  });
  const [authSession, setAuthSession] = useState(() => {
    if (typeof window === "undefined") return null;
    return getStoredSession();
  });
  const [authMessage, setAuthMessage] = useState("");
  const [authReady, setAuthReady] = useState(false);
  const isLandingPage = location.pathname === "/";
  const isAuthenticated = Boolean(authSession?.accessToken);
  const effectiveRole = activeRole;
  const roleHome = useMemo(() => getRoleHome(effectiveRole), [effectiveRole]);

  useEffect(() => {
    let cancelled = false;

    const syncAuthState = async () => {
      if (typeof window === "undefined") return;

      setAuthReady(false);
      try {
        if (isAuth0Configured() && hasAuthCallbackParams()) {
          const { requestedRole, session } = await completeAuth0Login();
          if (cancelled) return;

          setAuthSession(session);
          if (!requestedRole || !appRoleMatchesAssignedRoles(requestedRole, session.roles)) {
            window.sessionStorage.removeItem(ROLE_STORAGE_KEY);
            setActiveRole("");
            console.log(requestedRole, session.roles);
            setAuthMessage("Access denied. Sign in with a user assigned to the selected CIF role.");
            navigate("/", { replace: true });
            return;
          }

          window.sessionStorage.setItem(ROLE_STORAGE_KEY, requestedRole);
          setActiveRole(requestedRole);
          setAuthMessage("");
          navigate(getRoleHome(requestedRole), { replace: true });
          return;
        }

        const storedSession = getStoredSession();
        if (cancelled) return;

        setAuthSession(storedSession);
        const storedRole = window.sessionStorage.getItem(ROLE_STORAGE_KEY) || "";
        if (storedSession && storedRole && appRoleMatchesAssignedRoles(storedRole, storedSession.roles)) {
          setActiveRole(storedRole);
        } else {
          window.sessionStorage.removeItem(ROLE_STORAGE_KEY);
          setActiveRole("");
        }
      } catch (error) {
        if (cancelled) return;
        clearStoredSession();
        window.sessionStorage.removeItem(ROLE_STORAGE_KEY);
        setAuthSession(null);
        setActiveRole("");
        setAuthMessage(error instanceof Error ? error.message : "Unable to complete sign in.");
        navigate("/", { replace: true });
      } finally {
        if (!cancelled) {
          setAuthReady(true);
        }
      }
    };

    void syncAuthState();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const handleRoleSelect = useCallback(async (role) => {
    setAuthMessage("");
    if (!isAuth0Configured()) {
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(ROLE_STORAGE_KEY, role);
      }
      setActiveRole(role);
      return;
    }

    setAuthReady(false);
    try {
      await startAuth0Login(role);
    } catch (error) {
      setAuthReady(true);
      setAuthMessage(error instanceof Error ? error.message : "Unable to start sign in.");
    }
  }, []);

  const performSignOut = useCallback(() => {
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(ROLE_STORAGE_KEY);
    }
    setActiveRole("");
    setAuthSession(null);
    setAuthMessage("");
    if (isAuth0Configured()) {
      logoutFromAuth0();
      return;
    }
  }, []);

  useEffect(() => {
    if (isAuth0Configured() && !isAuthenticated && location.pathname !== "/") {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, location.pathname, navigate]);

  if (!authReady) {
    return (
      <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
        <Container maxWidth="xl" sx={{ py: { xs: 3, md: 4 } }}>
          <FullPageLoader
            title="Loading CIF Digitisation System"
            description="Completing role-based sign in and preparing your workspace."
          />
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", overflowX: "clip" }}>
      {!isLandingPage && effectiveRole && <Navbar activeRole={effectiveRole} onSignOut={performSignOut} />}
      <Container
        maxWidth="xl"
        sx={{
          py: isLandingPage ? { xs: 0.5, md: 1 } : { xs: 2, md: 3 },
          px: { xs: 1.25, sm: 2, md: 3 },
        }}
      >
        <Box key={location.pathname} className="page-fade">
          <Routes>
            <Route
              path="/"
              element={
                effectiveRole ? (
                  <Navigate to={roleHome} replace />
                ) : (
                  <LandingPage authMessage={authMessage} onAccessSelect={handleRoleSelect} />
                )
              }
            />
            <Route
              path="/dashboard"
              element={
                <RoleGuard
                  activeRole={activeRole}
                  isAuthenticated={isAuthenticated || !isAuth0Configured()}
                  routePath="/dashboard"
                >
                  <Dashboard activeRole={effectiveRole} />
                </RoleGuard>
              }
            />
            <Route
              path="/upload"
              element={
                <RoleGuard
                  activeRole={activeRole}
                  isAuthenticated={isAuthenticated || !isAuth0Configured()}
                  routePath="/upload"
                >
                  <UploadPage activeRole={effectiveRole} />
                </RoleGuard>
              }
            />
            <Route
              path="/processing"
              element={
                <RoleGuard
                  activeRole={activeRole}
                  isAuthenticated={isAuthenticated || !isAuth0Configured()}
                  routePath="/processing"
                >
                  <ProcessingPage activeRole={effectiveRole} />
                </RoleGuard>
              }
            />
            <Route
              path="/case-review"
              element={
                <RoleGuard
                  activeRole={activeRole}
                  isAuthenticated={isAuthenticated || !isAuth0Configured()}
                  routePath="/case-review"
                >
                  <CaseReviewPage activeRole={effectiveRole} />
                </RoleGuard>
              }
            />
            <Route
              path="/reports"
              element={
                <RoleGuard
                  activeRole={activeRole}
                  isAuthenticated={isAuthenticated || !isAuth0Configured()}
                  routePath="/reports"
                >
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
