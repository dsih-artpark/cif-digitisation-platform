import { Box, Button, Card, CardContent, Chip, Stack, Typography } from "@mui/material";
import { ROLE_SELECTION_LABELS } from "../../config/roleAccess";

function RoleSelectionPage({ availableRoles = [], onSelectRole = () => {} }) {
  return (
    <Box
      sx={{
        minHeight: "calc(100vh - 48px)",
        display: "grid",
        placeItems: "center",
        px: { xs: 1, md: 2.5 },
        py: { xs: 2, md: 4 },
      }}
    >
      <Card
        sx={{
          width: "100%",
          maxWidth: 760,
          borderRadius: 4,
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
          <Stack spacing={2.2}>
            <Stack spacing={1}>
              <Typography variant="h4" sx={{ color: "#0f3460", fontWeight: 800 }}>
                Select Workspace
              </Typography>
              <Typography color="text.secondary">
                Your account has access to multiple roles. Choose the workspace you want to open.
              </Typography>
            </Stack>

            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              <Chip label={`Available Roles: ${availableRoles.length}`} />
            </Stack>

            <Stack spacing={1.4}>
              {availableRoles.map((role) => (
                <Button
                  key={role}
                  variant="contained"
                  onClick={() => onSelectRole(role)}
                  sx={{
                    justifyContent: "flex-start",
                    borderRadius: 2.1,
                    py: 1.15,
                    px: 2,
                    fontWeight: 700,
                    letterSpacing: 0.1,
                    bgcolor: "#0f3460",
                    boxShadow: "none",
                    "&:hover": {
                      bgcolor: "#0f3460",
                      filter: "brightness(0.95)",
                      boxShadow: "none",
                    },
                  }}
                >
                  {ROLE_SELECTION_LABELS[role] || role}
                </Button>
              ))}
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}

export default RoleSelectionPage;
