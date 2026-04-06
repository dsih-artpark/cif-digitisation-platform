import { Box, Container } from "@mui/material";
import { useCallback, useMemo, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar/Navbar";
import { getRoleHome, isRouteAllowed } from "./config/roleAccess";
import Dashboard from "./pages/Dashboard/Dashboard";
import UploadPage from "./pages/UploadPage/UploadPage";
import ProcessingPage from "./pages/ProcessingPage/ProcessingPage";
import CaseReviewPage from "./pages/CaseReviewPage/CaseReviewPage";
import Reports from "./pages/Reports/Reports";
import LandingPage from "./pages/LandingPage/LandingPage";

const ROLE_STORAGE_KEY = "cif_demo_active_role";

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
  const [activeRole, setActiveRole] = useState(() => {
    if (typeof window === "undefined") return "";
    return window.sessionStorage.getItem(ROLE_STORAGE_KEY) || "";
  });
  const isLandingPage = location.pathname === "/";
  const effectiveRole = activeRole;
  const roleHome = useMemo(() => getRoleHome(effectiveRole), [effectiveRole]);

  const handleRoleSelect = useCallback((role) => {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(ROLE_STORAGE_KEY, role);
    }
    setActiveRole(role);
  }, []);

  const handleSignOut = useCallback(() => {
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(ROLE_STORAGE_KEY);
    }
    setActiveRole("");
  }, []);

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
                effectiveRole ? (
                  <Navigate to={roleHome} replace />
                ) : (
                  <LandingPage onAccessSelect={handleRoleSelect} />
                )
              }
            />
            <Route
              path="/dashboard"
              element={
                <RoleGuard activeRole={activeRole} routePath="/dashboard">
                  <Dashboard activeRole={effectiveRole} />
                </RoleGuard>
              }
            />
            <Route
              path="/upload"
              element={
                <RoleGuard activeRole={activeRole} routePath="/upload">
                  <UploadPage activeRole={effectiveRole} />
                </RoleGuard>
              }
            />
            <Route
              path="/processing"
              element={
                <RoleGuard activeRole={activeRole} routePath="/processing">
                  <ProcessingPage activeRole={effectiveRole} />
                </RoleGuard>
              }
            />
            <Route
              path="/case-review"
              element={
                <RoleGuard activeRole={activeRole} routePath="/case-review">
                  <CaseReviewPage activeRole={effectiveRole} />
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
            <Route path="*" element={<Navigate to={effectiveRole ? roleHome : "/"} replace />} />
          </Routes>
        </Box>
      </Container>
    </Box>
  );
}

export default App;
