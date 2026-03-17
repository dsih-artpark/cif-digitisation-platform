import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import RadioButtonUncheckedRoundedIcon from "@mui/icons-material/RadioButtonUncheckedRounded";
import { Box, Card, CardContent, CircularProgress, LinearProgress, Stack, Typography } from "@mui/material";

function ProcessingTimeline({ steps, activeStep, completed, stepProgress, currentNote }) {
  return (
    <Stack spacing={2}>
      {steps.map((step, index) => {
        const isCompleted = completed[index];
        const isActive = activeStep === index;
        const isPending = !isCompleted && !isActive;

        return (
          <Card
            key={step}
            sx={{
              transition: "all 0.3s ease",
              borderColor: isActive ? "primary.light" : undefined,
              bgcolor: isActive ? "#f7fbff" : "background.paper",
            }}
          >
            <CardContent sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
              <Box sx={{ width: 28, display: "grid", placeItems: "center" }}>
                {isCompleted && <CheckCircleRoundedIcon color="success" />}
                {!isCompleted && isActive && (
                  <CircularProgress size={20} variant="determinate" value={Math.max(stepProgress, 8)} />
                )}
                {!isCompleted && !isActive && (
                  <RadioButtonUncheckedRoundedIcon color={isPending ? "disabled" : "action"} />
                )}
              </Box>
              <Box sx={{ width: "100%" }}>
                <Typography variant="subtitle1" fontWeight={600} mb={0.4}>
                  {step}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {isCompleted
                    ? "Completed successfully"
                    : isActive
                      ? `${stepProgress}% complete`
                      : "Queued for processing"}
                </Typography>
                {isActive && (
                  <LinearProgress
                    variant="determinate"
                    value={stepProgress}
                    sx={{ mt: 1.2, height: 6, borderRadius: 6 }}
                  />
                )}
              </Box>
            </CardContent>
          </Card>
        );
      })}
    </Stack>
  );
}

export default ProcessingTimeline;
