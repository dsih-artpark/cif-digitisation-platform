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

function readStoredRole() {
  if (typeof window === "undefined") return "";
  return window.sessionStorage.getItem(ROLE_STORAGE_KEY) || "";
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
  const [activeRole, setActiveRole] = useState(readStoredRole);
  const isLandingPage = location.pathname === "/";
  const roleHome = useMemo(() => getRoleHome(activeRole), [activeRole]);

  const handleRoleSelect = useCallback((role) => {
    setActiveRole(role);
    window.sessionStorage.setItem(ROLE_STORAGE_KEY, role);
  }, []);

  const handleSignOut = useCallback(() => {
    setActiveRole("");
    window.sessionStorage.removeItem(ROLE_STORAGE_KEY);
  }, []);

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
              element={activeRole ? <Navigate to={roleHome} replace /> : <LandingPage onAccessSelect={handleRoleSelect} />}
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
