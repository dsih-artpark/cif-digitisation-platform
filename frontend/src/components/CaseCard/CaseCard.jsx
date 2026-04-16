import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import PreviewRoundedIcon from "@mui/icons-material/PreviewRounded";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { formatResultDisplay } from "../../utils/resultDisplay";

function sanitizeFileName(value = "cif-report") {
  return String(value)
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function normalizePdfText(value = "") {
  return String(value)
    .replace(/°/g, " deg")
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "");
}

function wrapPdfLine(text, maxChars = 88) {
  const normalized = normalizePdfText(text).trim();
  if (!normalized) return [""];

  const words = normalized.split(/\s+/);
  const lines = [];
  let currentLine = "";

  words.forEach((word) => {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;
    if (nextLine.length <= maxChars) {
      currentLine = nextLine;
      return;
    }
    if (currentLine) {
      lines.push(currentLine);
      currentLine = word;
      return;
    }
    lines.push(word.slice(0, maxChars));
    currentLine = word.slice(maxChars);
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

function buildReportLines({ caseData }) {
  return [
    "Extracted Case Report",
    "",
    `Patient Name: ${caseData.patientName}`,
    `Age: ${caseData.age}`,
    `Gender: ${caseData.sex}`,
    `Location/Village: ${caseData.locationVillage}`,
    `Test Date: ${caseData.testDate}`,
    `Test Type: ${caseData.testType}`,
    `Result: ${formatResultDisplay(caseData.result)}`,
    `Pathogen: ${caseData.pathogen}`,
    `Treatment: ${caseData.treatment}`,
    `Temperature: ${caseData.temperature}`,
    `HB Level: ${caseData.hbLevel}`,
    `Contacts: ${caseData.contacts}`,
    "",
  ].flatMap((line) => wrapPdfLine(line));
}

function escapePdfText(value) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function createPdfBlob(lines) {
  const linesPerPage = 40;
  const lineChunks = [];
  for (let index = 0; index < lines.length; index += linesPerPage) {
    lineChunks.push(lines.slice(index, index + linesPerPage));
  }

  const fontObjectNumber = 3;
  let nextObjectNumber = 4;
  const pageEntries = [];
  const contentEntries = [];

  lineChunks.forEach((chunk) => {
    const pageObjectNumber = nextObjectNumber++;
    const contentObjectNumber = nextObjectNumber++;
    pageEntries.push(pageObjectNumber);
    contentEntries.push({ objectNumber: contentObjectNumber, lines: chunk, pageObjectNumber });
  });

  const objects = new Map();
  objects.set(1, "<< /Type /Catalog /Pages 2 0 R >>");
  objects.set(
    2,
    `<< /Type /Pages /Kids [${pageEntries.map((page) => `${page} 0 R`).join(" ")}] /Count ${pageEntries.length} >>`
  );
  objects.set(fontObjectNumber, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");

  contentEntries.forEach(({ objectNumber, lines: chunk, pageObjectNumber }) => {
    const commands = ["BT", "/F1 11 Tf", "14 TL", "50 770 Td"];
    chunk.forEach((line, index) => {
      if (index > 0) {
        commands.push("T*");
      }
      commands.push(`(${escapePdfText(line)}) Tj`);
    });
    commands.push("ET");

    const stream = commands.join("\n");
    const streamLength = new TextEncoder().encode(stream).length;
    objects.set(
      objectNumber,
      `<< /Length ${streamLength} >>\nstream\n${stream}\nendstream`
    );
    objects.set(
      pageObjectNumber,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${objectNumber} 0 R /Resources << /Font << /F1 ${fontObjectNumber} 0 R >> >> >>`
    );
  });

  const orderedObjectNumbers = Array.from(objects.keys()).sort((a, b) => a - b);
  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  orderedObjectNumbers.forEach((objectNumber) => {
    offsets[objectNumber] = pdf.length;
    pdf += `${objectNumber} 0 obj\n${objects.get(objectNumber)}\nendobj\n`;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${orderedObjectNumbers.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  orderedObjectNumbers.forEach((objectNumber) => {
    pdf += `${String(offsets[objectNumber]).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${orderedObjectNumbers.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefOffset}\n%%EOF`;

  return new Blob([pdf], { type: "application/pdf" });
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

function CaseCard({ caseData, recordStatus, uploadedFile, onEditRecord }) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const chipColor = recordStatus === "Verified" ? "success" : "warning";
  const handleDownloadReport = () => {
    const reportLines = buildReportLines({ caseData });
    const blob = createPdfBlob(reportLines);
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = `${sanitizeFileName(uploadedFile?.name || caseData.patientName || "cif-report")}-report.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  };

  return (
    <>
      <Card>
        <CardContent>
          <Typography variant="h6" mb={2}>
            Case Record Summary
          </Typography>
          <Stack direction="row" alignItems="center" spacing={1} mb={2}>
            <Typography color="text.secondary">Status:</Typography>
            <Chip label={recordStatus} color={chipColor} size="small" />
          </Stack>
          <Button
            size="small"
            variant="outlined"
            startIcon={<PreviewRoundedIcon />}
            onClick={() => setPreviewOpen(true)}
            sx={{ width: { xs: "100%", sm: "auto" } }}
          >
            Preview Case Record
          </Button>
        </CardContent>
      </Card>

      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ pb: 0.8 }}>Case Record Preview</DialogTitle>
        <DialogContent>
          <Stack spacing={1.2} mb={2.5}>
            <SummaryRow label="Patient Name" value={caseData.patientName} />
            <SummaryRow label="Age" value={caseData.age} />
            <SummaryRow label="Gender" value={caseData.sex} />
            <SummaryRow label="Location/Village" value={caseData.locationVillage} />
            <SummaryRow label="Test Date" value={caseData.testDate} />
            <SummaryRow label="Test Type" value={caseData.testType} />
            <SummaryRow label="Result" value={formatResultDisplay(caseData.result)} />
            <SummaryRow label="Pathogen" value={caseData.pathogen} />
            <SummaryRow label="Treatment" value={caseData.treatment} />
            <SummaryRow label="Temperature" value={caseData.temperature} />
            <SummaryRow label="HB Level" value={caseData.hbLevel} />
            <SummaryRow label="Contacts" value={caseData.contacts} />
          </Stack>
          <Stack direction="row" alignItems="center" spacing={1} mb={2}>
            <Typography color="text.secondary">Status:</Typography>
            <Chip label={recordStatus} color={chipColor} size="small" />
          </Stack>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<EditRoundedIcon />}
              sx={{ width: { xs: "100%", sm: "auto" } }}
              onClick={() => {
                setPreviewOpen(false);
                onEditRecord?.();
              }}
            >
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
        </DialogContent>
      </Dialog>
    </>
  );
}

export default CaseCard;
