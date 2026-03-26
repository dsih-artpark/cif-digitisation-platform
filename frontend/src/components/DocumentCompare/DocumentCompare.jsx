import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import { Box, Card, CardContent, Chip, Divider, Grid, Stack, Typography } from "@mui/material";

function statusColor(status) {
  if (status === "Verified") return "success";
  if (status === "Review Required") return "warning";
  return "info";
}

function SummaryItem({ label, value, status }) {
  return (
    <Stack spacing={0.6}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={{ xs: 0.5, sm: 0 }}
      >
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        <Chip label={status} size="small" color={statusColor(status)} />
      </Stack>
      <Typography variant="body2" sx={{ whiteSpace: "pre-line" }}>
        {value || "-"}
      </Typography>
    </Stack>
  );
}

function DocumentCompare({ uploadedFile, previewUrl, caseData, fieldStatus }) {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" mb={2}>
          Original vs Extracted
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" fontWeight={700} mb={1}>
              Original Document
            </Typography>
            <Box
              sx={{
                border: "1px solid #d8e0ea",
                borderRadius: 1,
                p: 1,
                bgcolor: "#fafbfd",
                minHeight: { xs: 260, sm: 360 },
              }}
            >
              {uploadedFile?.type?.startsWith("image/") && previewUrl && (
                <Box
                  component="img"
                  src={previewUrl}
                  alt="Original uploaded CIF"
                  sx={{ width: "100%", maxHeight: { xs: 300, sm: 420 }, objectFit: "contain", borderRadius: 1 }}
                />
              )}
              {uploadedFile?.type === "application/pdf" && previewUrl && (
                <Box
                  component="iframe"
                  src={previewUrl}
                  title="Original CIF PDF"
                  sx={{ width: "100%", height: { xs: 300, sm: 420 }, border: 0, borderRadius: 1 }}
                />
              )}
              {!previewUrl && (
                <Stack alignItems="center" justifyContent="center" sx={{ height: { xs: 220, sm: 320 } }}>
                  <DescriptionRoundedIcon color="disabled" sx={{ fontSize: 40 }} />
                  <Typography color="text.secondary">No document preview available</Typography>
                </Stack>
              )}
            </Box>
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" fontWeight={700} mb={1}>
              Extracted Structured Fields
            </Typography>
            <Box
              sx={{
                border: "1px solid #d8e0ea",
                borderRadius: 1,
                p: 1.5,
                bgcolor: "background.paper",
                minHeight: { xs: 260, sm: 360 },
              }}
            >
              <Stack spacing={1.3}>
                <SummaryItem
                  label="Patient Name"
                  value={caseData.patientName}
                  status={fieldStatus.patientName}
                />
                <Divider />
                <SummaryItem label="Age" value={caseData.age} status={fieldStatus.age} />
                <Divider />
                <SummaryItem label="Sex" value={caseData.sex} status={fieldStatus.sex} />
                <Divider />
                <SummaryItem
                  label="Location/Village"
                  value={caseData.locationVillage}
                  status={fieldStatus.locationVillage}
                />
                <Divider />
                <SummaryItem
                  label="Test Date"
                  value={caseData.testDate}
                  status={fieldStatus.testDate}
                />
                <Divider />
                <SummaryItem label="Test Type" value={caseData.testType} status={fieldStatus.testType} />
                <Divider />
                <SummaryItem label="Result" value={caseData.result} status={fieldStatus.result} />
                <Divider />
                <SummaryItem label="Pathogen" value={caseData.pathogen} status={fieldStatus.pathogen} />
                <Divider />
                <SummaryItem label="Treatment" value={caseData.treatment} status={fieldStatus.treatment} />
                <Divider />
                <SummaryItem
                  label="Temperature"
                  value={caseData.temperature}
                  status={fieldStatus.temperature}
                />
                <Divider />
                <SummaryItem label="HB Level" value={caseData.hbLevel} status={fieldStatus.hbLevel} />
              </Stack>
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}

export default DocumentCompare;
