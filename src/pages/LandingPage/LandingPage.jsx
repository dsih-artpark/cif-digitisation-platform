import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import MedicalServicesRoundedIcon from "@mui/icons-material/MedicalServicesRounded";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";
import {
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Stack,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { DEMO_ROLES } from "../../config/roleAccess";

const roleCards = [
  {
    role: DEMO_ROLES.FRONT_LINE_WORKER,
    title: "Front Line Workers",
    subtitle: "Field Data Operations",
    description:
      "For ASHA and data entry teams to upload CIF documents, edit case records, and verify entries for downstream medical review.",
    buttonLabel: "Login as Front Line Worker",
    route: "/upload",
    icon: UploadFileRoundedIcon,
    accentColor: "#1f6f5f",
  },
  {
    role: DEMO_ROLES.MEDICAL_OFFICER,
    title: "Medical Officers",
    subtitle: "Monitoring Access",
    description:
      "Focused access to dashboard metrics for clinical and administrative supervision of case trends and operational health.",
    buttonLabel: "Login as Medical Officer",
    route: "/dashboard",
    icon: MedicalServicesRoundedIcon,
    accentColor: "#7a3e1d",
  },
];

const adminAccess = {
  role: DEMO_ROLES.USER_ANALYTICS,
  title: "Admin",
  buttonLabel: "Admin Login",
  route: "/dashboard",
};

const announcements = [
  "Official Notice: All Front Line Workers shall complete daily CIF document uploads before 17:00 hrs to ensure same-day processing.",
  "Data entered by Front Line Workers will be available for Medical Officer review only after successful processing and validation.",
  "Mandatory Compliance: Patient identifiers, case number, and document date must be verified before submission to avoid rejection.",
  "Quality Advisory: Blurred, incomplete, or improperly scanned documents may be returned for correction and re-upload.",
  "Review Protocol: Medical Officers are requested to prioritize flagged and high-risk cases within the assigned review window.",
  "Confidentiality Reminder: CIF records contain sensitive health information; unauthorized sharing or download is strictly prohibited.",
];

const supportDesk = {
  heading: "Support Desk Assistance",
  contact:
    "For technical support related to CIF Digitisation, contact the Helpdesk at +91-XXXXXXXXXX or cif-support@district.gov.in during Monday to Saturday, 10:00 hrs to 18:00 hrs.",
  note:
    "For prompt resolution, kindly include the Case ID, a clear screenshot, and the exact error message in your request.",
};

const GATEKEEPER_BASE_URL = "http://localhost:8000";

function getGatekeeperAuthUrl(path, routePath) {
  const redirectUrl = `${window.location.origin}${routePath}`;
  return `${GATEKEEPER_BASE_URL}${path}?redirect=${encodeURIComponent(redirectUrl)}`;
}

function LandingPage({ authError = "" }) {
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [selectedAccess, setSelectedAccess] = useState(null);
  const announcementText = announcements.join(" \u2022 ");

  const openAuthDialog = (accessItem) => {
    setSelectedAccess(accessItem);
    setAuthDialogOpen(true);
  };

  const handleGatekeeperRedirect = (authPath) => {
    if (!selectedAccess) return;
    window.location.href = getGatekeeperAuthUrl(authPath, selectedAccess.route);
  };

  return (
    <Box
      sx={{
        position: "relative",
        minHeight: "calc(100vh - 48px)",
        px: { xs: 1, md: 2 },
        py: { xs: 2.5, md: 4 },
      }}
    >
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 18% 12%, rgba(18, 60, 107, 0.11), transparent 34%), radial-gradient(circle at 84% 0%, rgba(201, 120, 50, 0.1), transparent 30%), linear-gradient(180deg, #f8fafc 0%, #edf2f7 100%)",
          zIndex: 0,
        }}
      />

      <Stack spacing={3} sx={{ position: "relative", zIndex: 1 }}>
        <Card
          sx={{
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              height: 10,
              background: "linear-gradient(90deg, #f28c28 0%, #f7f7f7 50%, #2e7d32 100%)",
            }}
          />
          <CardContent sx={{ p: { xs: 3, md: 4 }, textAlign: "center" }}>
            <Typography variant="h4" sx={{ color: "primary.dark", mt: 0.6, fontSize: { xs: "2rem", sm: "2.3rem" } }}>
              CIF Digitisation System
            </Typography>
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ maxWidth: 880, mx: "auto", mt: 1.2, lineHeight: 1.7 }}
            >
              District-level case investigation digitisation platform for structured health record intake and
              verification. Current operational region is Gadchiroli.
            </Typography>
          </CardContent>
        </Card>

        <Card
          sx={{
            borderRadius: 2,
            border: "1px solid rgba(122, 62, 29, 0.24)",
            bgcolor: "#fff8e8",
            overflow: "hidden",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 1.1, px: { xs: 1.5, md: 2 } }}>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 700,
                letterSpacing: 0.4,
                textTransform: "uppercase",
                color: "#7a3e1d",
                flexShrink: 0,
              }}
            >
              Official Announcements
            </Typography>
            <Box sx={{ overflow: "hidden", width: "100%" }}>
              <Box
                sx={{
                  display: "inline-flex",
                  whiteSpace: "nowrap",
                  minWidth: "max-content",
                  animation: "announcementTicker 62s linear infinite",
                  "@keyframes announcementTicker": {
                    "0%": { transform: "translateX(0)" },
                    "100%": { transform: "translateX(-50%)" },
                  },
                  "@media (prefers-reduced-motion: reduce)": {
                    animation: "none",
                  },
                  "&:hover": {
                    animationPlayState: "paused",
                  },
                }}
              >
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ pr: 5, fontSize: { xs: "0.82rem", sm: "0.9rem" } }}
                >
                  {announcementText}
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  aria-hidden="true"
                  sx={{ pr: 5, fontSize: { xs: "0.82rem", sm: "0.9rem" } }}
                >
                  {announcementText}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Card>

        <Box sx={{ display: "flex", justifyContent: "flex-end", px: { xs: 0.5, md: 1 } }}>
          <Button
            size="small"
            variant="text"
            onClick={() => openAuthDialog(adminAccess)}
            sx={{ color: "text.secondary" }}
          >
            {adminAccess.buttonLabel}
          </Button>
        </Box>

        <Grid container spacing={2.5}>
          {roleCards.map((role) => {
            const IconComponent = role.icon;

            return (
              <Grid key={role.title} item xs={12} md={6}>
                <Card
                  sx={{
                    height: "100%",
                    borderTop: `4px solid ${role.accentColor}`,
                    transition: "transform 0.25s ease, box-shadow 0.25s ease",
                    "&:hover": {
                      transform: "translateY(-6px)",
                      boxShadow: "0 16px 28px rgba(8, 34, 61, 0.12)",
                    },
                  }}
                >
                  <CardContent sx={{ display: "flex", flexDirection: "column", gap: 2.2, height: "100%" }}>
                    <Stack direction="row" spacing={1.2} alignItems="center">
                      <Box
                        sx={{
                          width: 42,
                          height: 42,
                          borderRadius: "50%",
                          bgcolor: "primary.light",
                          display: "grid",
                          placeItems: "center",
                          color: role.accentColor,
                        }}
                      >
                        <IconComponent />
                      </Box>
                      <Box>
                        <Typography variant="h6" sx={{ color: "primary.dark", lineHeight: 1.2 }}>
                          {role.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {role.subtitle}
                        </Typography>
                      </Box>
                    </Stack>

                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                      {role.description}
                    </Typography>

                    <Button
                      variant="contained"
                      endIcon={<ArrowForwardRoundedIcon />}
                      onClick={() => openAuthDialog(role)}
                      sx={{
                        mt: "auto",
                        bgcolor: role.accentColor,
                        "&:hover": {
                          bgcolor: role.accentColor,
                          filter: "brightness(0.92)",
                        },
                      }}
                    >
                      {role.buttonLabel}
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>

        <Card
          sx={{
            borderRadius: 2,
            border: "1px solid rgba(18, 60, 107, 0.18)",
            bgcolor: "#f8fbff",
          }}
        >
          <CardContent sx={{ py: 2, px: { xs: 2, md: 2.5 } }}>
            <Typography
              variant="caption"
              sx={{
                display: "block",
                mb: 0.75,
                letterSpacing: 0.4,
                textTransform: "uppercase",
                fontWeight: 700,
                color: "primary.main",
              }}
            >
              {supportDesk.heading}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
              {supportDesk.contact}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.7, lineHeight: 1.7 }}>
              {supportDesk.note}
            </Typography>
          </CardContent>
        </Card>

        {authError && <Alert severity="warning">{authError}</Alert>}
      </Stack>

      <Dialog open={authDialogOpen} onClose={() => setAuthDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>{selectedAccess?.title || "User Access"}</DialogTitle>
        <DialogContent>
          <Stack spacing={1.25}>
            <Typography variant="body2" color="text.secondary">
              New user? Choose <strong>Sign Up</strong>. Existing user? Choose <strong>Sign In</strong>.
            </Typography>
            <Alert severity="info">
              After login, you will be redirected to {selectedAccess?.buttonLabel || "selected access page"}.
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 2.5, pb: 2 }}>
          <Button onClick={() => setAuthDialogOpen(false)}>Cancel</Button>
          <Button variant="outlined" onClick={() => handleGatekeeperRedirect("/signup")}>
            Sign Up
          </Button>
          <Button variant="contained" onClick={() => handleGatekeeperRedirect("/signin")}>
            Sign In
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default LandingPage;
