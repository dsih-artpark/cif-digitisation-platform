import MedicalServicesRoundedIcon from "@mui/icons-material/MedicalServicesRounded";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  Stack,
  Typography,
} from "@mui/material";
import { DEMO_ROLES } from "../../config/roleAccess";

const roleCards = [
  {
    role: DEMO_ROLES.FRONT_LINE_WORKER,
    title: "Front Line Workers",
    subtitle: "Field Data Operations",
    description:
      "For ASHA and data entry teams to upload CIF documents, edit case records, and verify entries for downstream medical review.",
    buttonLabel: "Front Line Workers",
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
    buttonLabel: "Medical Officers",
    route: "/dashboard",
    icon: MedicalServicesRoundedIcon,
    accentColor: "#2563eb",
  },
];

const adminAccess = {
  role: DEMO_ROLES.ADMIN,
  title: "Admin",
  buttonLabel: "Login",
  route: "/dashboard",
};

function LandingPage({ authMessage = "", onLogin = () => {} }) {
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
        {authMessage ? <Alert severity="error">{authMessage}</Alert> : null}
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
                onClick={onLogin}
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
                      onClick={() => {}}
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
      </Stack>
    </Box>
  );
}

export default LandingPage;
