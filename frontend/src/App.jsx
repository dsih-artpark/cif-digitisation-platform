import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  Container,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import Navbar from "./components/Navbar/Navbar";
import {
  DEMO_ROLES,
  getAppRolesFromAssignedRoles,
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
import Results from "./pages/Results/Results";
import LandingPage from "./pages/LandingPage/LandingPage";
import RoleSelectionPage from "./pages/RoleSelectionPage/RoleSelectionPage";
import { useCif } from "./context/CifContext";

const ROLE_STORAGE_KEY = "cif_demo_active_role";

function formatLatency(value) {
  const ms = Number(value);
  if (!Number.isFinite(ms) || ms <= 0) return "N/A";
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

function toNumberOrNa(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num.toLocaleString() : "N/A";
}

function buildTokenUsage(usage) {
  const normalized = usage && typeof usage === "object" ? usage : {};
  return {
    input: toNumberOrNa(normalized.prompt_tokens ?? normalized.input_tokens ?? normalized.inputTokens),
    output: toNumberOrNa(normalized.completion_tokens ?? normalized.output_tokens ?? normalized.outputTokens),
    total: toNumberOrNa(normalized.total_tokens ?? normalized.totalTokens),
  };
}

function AnalysisMetric({ label, value }) {
  return (
    <Stack spacing={0.3}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={700}>
        {value}
      </Typography>
    </Stack>
  );
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
  const { uploadedFile, previewUrl, extractionMetadata } = useCif();
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
  const [analysisPreviewOpen, setAnalysisPreviewOpen] = useState(false);
  const isLandingPage = location.pathname === "/";
  const isAuthenticated = Boolean(authSession?.accessToken);
  const availableAppRoles = useMemo(() => {
    if (!isAuth0Configured()) {
      return [
        DEMO_ROLES.ADMIN,
        DEMO_ROLES.FRONT_LINE_WORKER,
        DEMO_ROLES.MEDICAL_OFFICER,
      ];
    }
    return getAppRolesFromAssignedRoles(authSession?.roles || []);
  }, [authSession?.roles]);
  const effectiveRole = activeRole;
  const roleHome = useMemo(() => getRoleHome(effectiveRole), [effectiveRole]);
  const showAnalysisPreview = effectiveRole === DEMO_ROLES.ADMIN && location.pathname === "/case-review";
  const tokenUsage = useMemo(
    () => buildTokenUsage(extractionMetadata?.usage),
    [extractionMetadata?.usage]
  );

  useEffect(() => {
    let cancelled = false;

    const syncAuthState = async () => {
      if (typeof window === "undefined") return;

      setAuthReady(false);
      try {
        if (isAuth0Configured() && hasAuthCallbackParams()) {
          const { session } = await completeAuth0Login();
          if (cancelled) return;

          setAuthSession(session);
          const rolesAfterLogin = getAppRolesFromAssignedRoles(session.roles || []);
          if (rolesAfterLogin.length === 0) {
            window.sessionStorage.removeItem(ROLE_STORAGE_KEY);
            setActiveRole("");
            setAuthMessage("Access denied. Sign in with a user assigned to a CIF role.");
            navigate("/", { replace: true });
            return;
          }

          if (rolesAfterLogin.length === 1) {
            const resolvedRole = rolesAfterLogin[0];
            window.sessionStorage.setItem(ROLE_STORAGE_KEY, resolvedRole);
            setActiveRole(resolvedRole);
            setAuthMessage("");
            navigate(getRoleHome(resolvedRole), { replace: true });
            return;
          }

          window.sessionStorage.removeItem(ROLE_STORAGE_KEY);
          setActiveRole("");
          setAuthMessage("");
          navigate("/select-role", { replace: true });
          return;
        }

        const storedSession = getStoredSession();
        if (cancelled) return;

        setAuthSession(storedSession);
        const storedRole = window.sessionStorage.getItem(ROLE_STORAGE_KEY) || "";
        const mappedRoles = getAppRolesFromAssignedRoles(storedSession?.roles || []);

        if (!storedSession || mappedRoles.length === 0) {
          window.sessionStorage.removeItem(ROLE_STORAGE_KEY);
          setActiveRole("");
          return;
        }

        if (mappedRoles.length === 1) {
          const resolvedRole = mappedRoles[0];
          window.sessionStorage.setItem(ROLE_STORAGE_KEY, resolvedRole);
          setActiveRole(resolvedRole);
          return;
        }

        if (storedRole && mappedRoles.includes(storedRole)) {
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

  const handleLogin = useCallback(async () => {
    setAuthMessage("");
    if (!isAuth0Configured()) {
      navigate("/select-role");
      return;
    }

    setAuthReady(false);
    try {
      await startAuth0Login();
    } catch (error) {
      setAuthReady(true);
      setAuthMessage(error instanceof Error ? error.message : "Unable to start sign in.");
    }
  }, [navigate]);

  const handleWorkspaceSelect = useCallback(
    (role) => {
      if (!role || !availableAppRoles.includes(role)) return;
      window.sessionStorage.setItem(ROLE_STORAGE_KEY, role);
      setActiveRole(role);
      setAuthMessage("");
      navigate(getRoleHome(role), { replace: true });
    },
    [availableAppRoles, navigate]
  );

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

  useEffect(() => {
    if (activeRole || !authReady) return;
    if (availableAppRoles.length !== 1) return;
    const resolvedRole = availableAppRoles[0];
    window.sessionStorage.setItem(ROLE_STORAGE_KEY, resolvedRole);
    setActiveRole(resolvedRole);
  }, [activeRole, authReady, availableAppRoles]);

  useEffect(() => {
    if (!authReady || activeRole) return;
    if (!isAuth0Configured() || !isAuthenticated) return;
    if (availableAppRoles.length <= 1) return;
    if (location.pathname === "/select-role") return;
    navigate("/select-role", { replace: true });
  }, [
    activeRole,
    authReady,
    availableAppRoles.length,
    isAuthenticated,
    location.pathname,
    navigate,
  ]);

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
      {!isLandingPage && effectiveRole && (
        <Navbar
          activeRole={effectiveRole}
          onSignOut={performSignOut}
          showAnalysisPreview={showAnalysisPreview}
          onOpenAnalysisPreview={() => setAnalysisPreviewOpen(true)}
        />
      )}
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
                ) : isAuth0Configured() && isAuthenticated && availableAppRoles.length > 1 ? (
                  <Navigate to="/select-role" replace />
                ) : (
                  <LandingPage authMessage={authMessage} onLogin={handleLogin} />
                )
              }
            />
            <Route
              path="/select-role"
              element={
                effectiveRole ? (
                  <Navigate to={roleHome} replace />
                ) : isAuth0Configured() && !isAuthenticated ? (
                  <Navigate to="/" replace />
                ) : (
                  <RoleSelectionPage
                    availableRoles={availableAppRoles}
                    onSelectRole={handleWorkspaceSelect}
                  />
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
              path="/results"
              element={
                <RoleGuard
                  activeRole={activeRole}
                  isAuthenticated={isAuthenticated || !isAuth0Configured()}
                  routePath="/results"
                >
                  <Results activeRole={effectiveRole} />
                </RoleGuard>
              }
            />
            <Route path="*" element={<Navigate to={effectiveRole ? roleHome : "/"} replace />} />
          </Routes>
        </Box>
      </Container>
      <Dialog
        open={analysisPreviewOpen}
        onClose={() => setAnalysisPreviewOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ pb: 0.8 }}>Analysis Preview</DialogTitle>
        <DialogContent sx={{ pt: 1.2 }}>
          <Stack spacing={2.2}>
            <Card variant="outlined" sx={{ borderRadius: 2.5 }}>
              <CardContent>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={{ xs: 1.5, sm: 2.5 }}
                  divider={<Divider orientation="vertical" flexItem sx={{ display: { xs: "none", sm: "block" } }} />}
                >
                  <AnalysisMetric label="Model Used" value={extractionMetadata?.model || "N/A"} />
                  <AnalysisMetric label="Latency" value={formatLatency(extractionMetadata?.latencyMs)} />
                  <AnalysisMetric label="Input Tokens" value={tokenUsage.input} />
                  <AnalysisMetric label="Output Tokens" value={tokenUsage.output} />
                  <AnalysisMetric label="Total Tokens" value={tokenUsage.total} />
                </Stack>
              </CardContent>
            </Card>

            <Card variant="outlined" sx={{ borderRadius: 2.5 }}>
              <CardContent>
                <Typography variant="subtitle2" fontWeight={700} mb={1.2}>
                  Uploaded Document For Analysis
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" mb={1.4}>
                  {uploadedFile?.name || "No uploaded document available."}
                </Typography>
                <Box
                  sx={{
                    border: "1px solid #d8e0ea",
                    borderRadius: 2,
                    overflow: "hidden",
                    bgcolor: "#f8fafc",
                    minHeight: { xs: 220, sm: 360 },
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {uploadedFile?.type?.startsWith("image/") && previewUrl && (
                    <Box
                      component="img"
                      src={previewUrl}
                      alt="Uploaded document preview"
                      sx={{
                        width: "100%",
                        maxHeight: { xs: 280, sm: 460 },
                        objectFit: "contain",
                      }}
                    />
                  )}
                  {uploadedFile?.type === "application/pdf" && previewUrl && (
                    <Box
                      component="iframe"
                      src={previewUrl}
                      title="Uploaded document preview"
                      sx={{
                        width: "100%",
                        height: { xs: 280, sm: 460 },
                        border: 0,
                      }}
                    />
                  )}
                  {!previewUrl && (
                    <Typography variant="body2" color="text.secondary">
                      Document preview is not available yet.
                    </Typography>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Stack>
        </DialogContent>
      </Dialog>
    </Box>
  );
}

export default App;
