import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import { Box, Button, Card, CardContent, Chip, Stack, Typography } from "@mui/material";

function SummaryRow({ label, value }) {
  return (
    <Box sx={{ display: "flex", alignItems: { xs: "flex-start", sm: "center" }, flexDirection: { xs: "column", sm: "row" }, gap: { xs: 0.35, sm: 0 } }}>
      <Box sx={{ width: { xs: "100%", sm: "35%" } }}>
        <Typography color="text.secondary">{label}</Typography>
      </Box>
      <Box sx={{ width: { xs: "100%", sm: "65%" } }}>
        <Typography fontWeight={600} sx={{ whiteSpace: "pre-line" }}>
          {value}
        </Typography>
      </Box>
    </Box>
  );
}

function CaseCard({ caseData, recordStatus }) {
  const chipColor = recordStatus === "Verified" ? "success" : "warning";

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" mb={2}>
          Case Record Summary
        </Typography>
        <Stack spacing={1.2} mb={2}>
          <SummaryRow label="Patient Name" value={caseData.patientName} />
          <SummaryRow label="Age" value={caseData.age} />
          <SummaryRow label="Sex" value={caseData.sex} />
          <SummaryRow label="Location/Village" value={caseData.locationVillage} />
          <SummaryRow label="Test Date" value={caseData.testDate} />
          <SummaryRow label="Test Type" value={caseData.testType} />
          <SummaryRow label="Result" value={caseData.result} />
          <SummaryRow label="Pathogen" value={caseData.pathogen} />
          <SummaryRow label="Treatment" value={caseData.treatment} />
          <SummaryRow label="Temperature" value={caseData.temperature} />
          <SummaryRow label="HB Level" value={caseData.hbLevel} />
        </Stack>
        <Stack direction="row" alignItems="center" spacing={1} mb={2}>
          <Typography color="text.secondary">Status:</Typography>
          <Chip label={recordStatus} color={chipColor} size="small" />
        </Stack>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <Button size="small" variant="outlined" startIcon={<EditRoundedIcon />} sx={{ width: { xs: "100%", sm: "auto" } }}>
            Edit Record
          </Button>
          <Button size="small" variant="outlined" startIcon={<DownloadRoundedIcon />} sx={{ width: { xs: "100%", sm: "auto" } }}>
            Download Report
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default CaseCard;
