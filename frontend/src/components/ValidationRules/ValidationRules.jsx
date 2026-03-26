import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ErrorRoundedIcon from "@mui/icons-material/ErrorRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import { Alert, Card, CardContent, Chip, Stack, Typography } from "@mui/material";

function iconByStatus(status) {
  if (status === "pass") return <CheckCircleRoundedIcon fontSize="small" color="success" />;
  if (status === "warning") return <WarningAmberRoundedIcon fontSize="small" color="warning" />;
  return <ErrorRoundedIcon fontSize="small" color="error" />;
}

function colorByStatus(status) {
  if (status === "pass") return "success";
  if (status === "warning") return "warning";
  return "error";
}

function ValidationRules({ rules }) {
  const passed = rules.filter((rule) => rule.status === "pass").length;
  const warnings = rules.filter((rule) => rule.status === "warning").length;
  const failed = rules.filter((rule) => rule.status === "error").length;

  return (
    <Card>
      <CardContent>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
          spacing={{ xs: 1, sm: 0 }}
          mb={1.5}
        >
          <Typography variant="h6">Validation Rules</Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip size="small" color="success" label={`Pass: ${passed}`} />
            <Chip size="small" color="warning" label={`Warn: ${warnings}`} />
            <Chip size="small" color="error" label={`Fail: ${failed}`} />
          </Stack>
        </Stack>
        <Stack spacing={1}>
          {rules.map((rule) => (
            <Alert
              key={rule.id}
              icon={iconByStatus(rule.status)}
              severity={colorByStatus(rule.status)}
              variant="outlined"
            >
              <Typography variant="body2" fontWeight={700}>
                {rule.title}
              </Typography>
              <Typography variant="body2">{rule.message}</Typography>
            </Alert>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}

export default ValidationRules;
