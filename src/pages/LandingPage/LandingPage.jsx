import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import CampaignRoundedIcon from "@mui/icons-material/CampaignRounded";
import MedicalServicesRoundedIcon from "@mui/icons-material/MedicalServicesRounded";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
    accentColor: "#0f766e",
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
    accentColor: "#2563eb",
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

const GATEKEEPER_BASE_URL = import.meta.env.VITE_GATEKEEPER_URL

function getGatekeeperAuthUrl(path, routePath) {
  const redirectUrl = `${window.location.origin}${routePath}`;
  return `${GATEKEEPER_BASE_URL}${path}?redirect=${encodeURIComponent(redirectUrl)}`;
}

function getGatekeeperSignoutUrl(redirectUrl) {
  return `${GATEKEEPER_BASE_URL}/signout?redirect=${encodeURIComponent(redirectUrl)}`;
}

function LandingPage({ authError = "" }) {
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [selectedAccess, setSelectedAccess] = useState(null);
  const highlightedAnnouncements = announcements.slice(0, 3);

  const openAuthDialog = (accessItem) => {
    setSelectedAccess(accessItem);
    setAuthDialogOpen(true);
  };

  const handleGatekeeperRedirect = (authPath) => {
    if (!selectedAccess) return;
    const authUrl = getGatekeeperAuthUrl(authPath, selectedAccess.route);

    // Force a clean auth session before signup so Gatekeeper does not auto-redirect
    // using an already authenticated user cookie.
    if (authPath === "/signup") {
      window.location.href = getGatekeeperSignoutUrl(authUrl);
      return;
    }

    window.location.href = authUrl;
  };

  return (
    <Box
      sx={{
        position: "relative",
        minHeight: "calc(100vh - 48px)",
        px: { xs: 1, md: 2.5 },
        py: { xs: 2, md: 4 },
        fontFamily: '"Plus Jakarta Sans", "Segoe UI", sans-serif',
      }}
    >
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 12% 8%, rgba(15, 52, 96, 0.14), transparent 36%), radial-gradient(circle at 88% 4%, rgba(42, 122, 101, 0.13), transparent 34%), linear-gradient(180deg, #f3f7fc 0%, #e9eef6 100%)",
          zIndex: 0,
        }}
      />

      <Stack spacing={2.5} sx={{ position: "relative", zIndex: 1 }}>
        <Card
          sx={{
            borderRadius: 4,
            overflow: "hidden",
            border: "1px solid rgba(13, 37, 63, 0.1)",
            boxShadow: "0 12px 28px rgba(12, 35, 58, 0.08)",
            background:
              "linear-gradient(132deg, rgba(255,255,255,0.96) 0%, rgba(247,251,255,0.98) 55%, rgba(240,248,245,0.98) 100%)",
          }}
        >
          <Box
            sx={{
              height: 6,
              background: "linear-gradient(90deg, #0f3460 0%, #1f6f5f 100%)",
            }}
          />
          <CardContent sx={{ p: { xs: 2.5, md: 4 } }}>
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={{ xs: 2, md: 2.5 }}
              justifyContent="space-between"
              alignItems={{ xs: "flex-start", md: "center" }}
            >
              <Stack spacing={1.2} sx={{ maxWidth: 820 }}>
                <Typography
                  variant="h3"
                  sx={{
                    color: "#0f3460",
                    fontSize: { xs: "1.8rem", sm: "2.3rem", md: "2.6rem" },
                    lineHeight: 1.15,
                    fontWeight: 800,
                  }}
                >
                  CIF Digitisation System
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                  Structured case investigation digitisation for district operations, record verification, and
                  monitoring workflows in Gadchiroli.
                </Typography>
              </Stack>

              <Button
                variant="outlined"
                onClick={() => openAuthDialog(adminAccess)}
                sx={{
                  flexShrink: 0,
                  borderRadius: 2.5,
                  borderColor: "rgba(15, 52, 96, 0.36)",
                  color: "#0f3460",
                  px: 2.2,
                  py: 0.8,
                  fontWeight: 700,
                  "&:hover": {
                    borderColor: "#0f3460",
                    backgroundColor: "rgba(15, 52, 96, 0.06)",
                  },
                }}
              >
                {adminAccess.buttonLabel}
              </Button>
            </Stack>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 2.2 }}>
              <Chip
                label="Operational Region: Gadchiroli"
                sx={{ borderRadius: 2, bgcolor: "rgba(31, 111, 95, 0.1)", color: "#184f44", fontWeight: 600 }}
              />
            </Stack>
          </CardContent>
        </Card>

        <Card
          sx={{
            borderRadius: 3,
            border: "1px solid rgba(15, 52, 96, 0.12)",
            bgcolor: "rgba(255, 255, 255, 0.88)",
            boxShadow: "0 8px 20px rgba(12, 35, 58, 0.06)",
          }}
        >
          <CardContent sx={{ px: { xs: 2, md: 2.5 }, py: { xs: 1.8, md: 2 } }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.2 }}>
              <CampaignRoundedIcon sx={{ color: "#0f3460", fontSize: 20 }} />
              <Typography sx={{ fontWeight: 700, letterSpacing: 0.3, color: "#0f3460", textTransform: "uppercase" }}>
                Operational Notices
              </Typography>
            </Stack>

            <Stack spacing={0.8}>
              {highlightedAnnouncements.map((item) => (
                <Typography key={item} variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                  {"\u2022"} {item}
                </Typography>
              ))}
            </Stack>
          </CardContent>
        </Card>

        <Grid container spacing={2.5}>
          {roleCards.map((role) => {
            const IconComponent = role.icon;

            return (
              <Grid key={role.title} item xs={12} md={6}>
                <Card
                  sx={{
                    height: "100%",
                    borderRadius: 3,
                    border: "1px solid rgba(15, 52, 96, 0.12)",
                    boxShadow: "0 12px 24px rgba(12, 35, 58, 0.08)",
                    background: "linear-gradient(180deg, #ffffff 0%, #f9fbfd 100%)",
                    transition: "transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease",
                    "&:hover": {
                      transform: "translateY(-4px)",
                      boxShadow: "0 18px 34px rgba(12, 35, 58, 0.14)",
                      borderColor: "rgba(15, 52, 96, 0.24)",
                    },
                  }}
                >
                  <CardContent sx={{ display: "flex", flexDirection: "column", gap: 2, height: "100%", p: 2.5 }}>
                    <Stack direction="row" spacing={1.2} alignItems="center">
                      <Box
                        sx={{
                          width: 46,
                          height: 46,
                          borderRadius: 2.2,
                          bgcolor: `${role.accentColor}1F`,
                          display: "grid",
                          placeItems: "center",
                          color: role.accentColor,
                        }}
                      >
                        <IconComponent />
                      </Box>
                      <Box>
                        <Typography variant="h6" sx={{ color: "#102f52", lineHeight: 1.2, fontWeight: 700 }}>
                          {role.title}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            color: role.accentColor,
                            fontWeight: 700,
                            letterSpacing: 0.25,
                            textTransform: "uppercase",
                          }}
                        >
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
                        borderRadius: 2.1,
                        py: 1.15,
                        fontWeight: 700,
                        letterSpacing: 0.1,
                        bgcolor: role.accentColor,
                        boxShadow: "none",
                        "&:hover": {
                          bgcolor: role.accentColor,
                          filter: "brightness(0.95)",
                          boxShadow: "none",
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
            borderRadius: 3,
            border: "1px solid rgba(15, 52, 96, 0.14)",
            bgcolor: "rgba(248, 251, 255, 0.9)",
          }}
        >
          <CardContent sx={{ py: 2.2, px: { xs: 2, md: 2.5 } }}>
            <Typography
              variant="caption"
              sx={{
                display: "block",
                mb: 0.75,
                letterSpacing: 0.5,
                textTransform: "uppercase",
                fontWeight: 800,
                color: "#0f3460",
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
