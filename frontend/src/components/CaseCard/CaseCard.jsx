import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import { Box, Button, Card, CardContent, Chip, Stack, Typography } from "@mui/material";

function formatFileSize(size = 0) {
  if (!Number.isFinite(size) || size <= 0) return "N/A";
  const units = ["B", "KB", "MB", "GB"];
  let value = size;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const digits = unitIndex === 0 ? 0 : value >= 10 ? 1 : 2;
  return `${value.toFixed(digits)} ${units[unitIndex]}`;
}

function sanitizeFileName(value = "cif-report") {
  return String(value)
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function buildReportContent({ caseData, recordStatus, extractionMetadata, uploadedFile }) {
  const extractedAt = extractionMetadata?.extractedAt
    ? new Date(extractionMetadata.extractedAt).toLocaleString()
    : "N/A";
  const model = extractionMetadata?.model || "N/A";

  return [
    "CIF Digitisation System",
    "Extracted Case Report",
    "",
    `Record Status: ${recordStatus}`,
    `Generated At: ${new Date().toLocaleString()}`,
    `Extracted At: ${extractedAt}`,
    `Model: ${model}`,
    "",
    "Source Document",
    `File Name: ${uploadedFile?.name || "N/A"}`,
    `File Type: ${uploadedFile?.type || "N/A"}`,
    `File Size: ${formatFileSize(uploadedFile?.size || 0)}`,
    "",
    "Extracted Fields",
    `Patient Name: ${caseData.patientName}`,
    `Age: ${caseData.age}`,
    `Sex: ${caseData.sex}`,
    `Location/Village: ${caseData.locationVillage}`,
    `Test Date: ${caseData.testDate}`,
    `Test Type: ${caseData.testType}`,
    `Result: ${caseData.result}`,
    `Pathogen: ${caseData.pathogen}`,
    `Treatment: ${caseData.treatment}`,
    `Temperature: ${caseData.temperature}`,
    `HB Level: ${caseData.hbLevel}`,
    "",
  ].join("\n");
}

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

function CaseCard({ caseData, recordStatus, extractionMetadata, uploadedFile }) {
  const chipColor = recordStatus === "Verified" ? "success" : "warning";
  const handleDownloadReport = () => {
    const reportContent = buildReportContent({
      caseData,
      recordStatus,
      extractionMetadata,
      uploadedFile,
    });
    const blob = new Blob([reportContent], { type: "text/plain;charset=utf-8" });
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = `${sanitizeFileName(uploadedFile?.name || caseData.patientName || "cif-report")}-report.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  };

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
          <Button
            size="small"
            variant="outlined"
            startIcon={<DownloadRoundedIcon />}
            onClick={handleDownloadReport}
            sx={{ width: { xs: "100%", sm: "auto" } }}
          >
            Download Report
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default CaseCard;
