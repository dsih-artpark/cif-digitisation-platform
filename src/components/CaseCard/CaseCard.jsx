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
        <Typography fontWeight={600}>{value}</Typography>
      </Box>
    </Box>
  );
}

function CaseCard({ caseData, recordStatus }) {
  const diagnosisValue = String(caseData.diagnosis || "N/A");
  const formattedDiagnosis =
    diagnosisValue.toLowerCase() === "n/a"
      ? "N/A"
      : diagnosisValue
          .split(" ")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(" ");
  const medicines = (caseData.medicines || "")
    .split("\n")
    .map((item) => item.trim())
    .filter((item) => item && item.toLowerCase() !== "n/a");
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
                <SummaryRow label="Date" value={caseData.date} />
                <SummaryRow label="Symptoms" value={caseData.symptoms} />
                <SummaryRow label="Diagnosis" value={formattedDiagnosis} />
        </Stack>
        <Box sx={{ mb: 2 }}>
          <Typography color="text.secondary" mb={0.8}>
            Prescribed Medicines
          </Typography>
          <Stack spacing={0.5}>
            {medicines.length > 0 ? (
              medicines.map((item, index) => (
                <Typography key={`${item}-${index}`} fontWeight={600} variant="body2">
                  - {item}
                </Typography>
              ))
            ) : (
              <Typography variant="body2" color="text.secondary">
                No medicines extracted
              </Typography>
            )}
          </Stack>
        </Box>
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
