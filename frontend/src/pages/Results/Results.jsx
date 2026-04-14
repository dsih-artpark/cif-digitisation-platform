import {
  Alert,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { getRecentResults } from "../../api/resultsClient";
import BackButton from "../../components/BackButton/BackButton";
import { DEMO_ROLES } from "../../config/roleAccess";
import { useCif } from "../../context/CifContext";

const RESULT_COLUMNS = [
  { key: "id", label: "ID" },
  { key: "file", label: "File" },
  { key: "page", label: "Page" },
  { key: "name_hindi", label: "Name (Hindi)" },
  { key: "name_english", label: "Name (English)" },
  { key: "age", label: "Age" },
  { key: "sex", label: "Sex" },
  { key: "location", label: "Location" },
  { key: "date", label: "Date" },
  { key: "test_type", label: "Test Type" },
  { key: "result", label: "Result" },
  { key: "pathogen", label: "Pathogen" },
  { key: "treatment", label: "Treatment" },
  { key: "temperature", label: "Temperature" },
  { key: "hb_level", label: "HB Level" },
  { key: "rbs", label: "RBS" },
  { key: "bp", label: "BP" },
  { key: "contacts", label: "Contacts" },
  { key: "special_notes", label: "Special Notes" },
  { key: "ocr_status", label: "OCR Status" },
  { key: "job_id", label: "Job ID" },
  { key: "file_type", label: "File Type" },
  { key: "file_size_bytes", label: "File Size (Bytes)" },
  { key: "model_used", label: "Model Used" },
  { key: "latency_ms", label: "Latency (ms)" },
  { key: "prompt_tokens", label: "Prompt Tokens" },
  { key: "completion_tokens", label: "Completion Tokens" },
  { key: "total_tokens", label: "Total Tokens" },
  { key: "extracted_at", label: "Extracted At" },
  { key: "created_at", label: "Created At" },
  { key: "updated_at", label: "Updated At" },
];

function createEmptyRow() {
  return Object.fromEntries(RESULT_COLUMNS.map((column) => [column.key, ""]));
}

function formatCellValue(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value;
  return String(value);
}

function Results({ activeRole = "" }) {
  const [adminRows, setAdminRows] = useState([]);
  const [isLoadingAdminRows, setIsLoadingAdminRows] = useState(false);
  const [adminError, setAdminError] = useState("");
  const { caseData, recordStatus, extractionMetadata, uploadedFile, processingError } = useCif();
  const isAdmin = activeRole === DEMO_ROLES.ADMIN;
  const isFrontLineWorker = activeRole === DEMO_ROLES.FRONT_LINE_WORKER;
  const fallbackPath = isAdmin ? "/dashboard" : "/upload";

  useEffect(() => {
    if (!isAdmin) return undefined;
    let cancelled = false;
    const loadAdminRows = async () => {
      setIsLoadingAdminRows(true);
      setAdminError("");
      try {
        const records = await getRecentResults(10);
        if (!cancelled) {
          setAdminRows(records);
        }
      } catch (error) {
        if (!cancelled) {
          setAdminRows([]);
          setAdminError(error?.message || "Unable to load result records.");
        }
      } finally {
        if (!cancelled) {
          setIsLoadingAdminRows(false);
        }
      }
    };

    void loadAdminRows();

    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  const latestSessionRow = useMemo(() => {
    const hasSessionResult = Boolean(extractionMetadata?.jobId);
    if (!hasSessionResult) return createEmptyRow();
    return {
      ...createEmptyRow(),
      file: uploadedFile?.name || "",
      page: 1,
      name_english: caseData?.patientName || "",
      age: caseData?.age || "",
      sex: caseData?.sex || "",
      location: caseData?.locationVillage || "",
      date: caseData?.testDate || "",
      test_type: caseData?.testType || "",
      result: caseData?.result || "",
      pathogen: caseData?.pathogen || "",
      treatment: caseData?.treatment || "",
      temperature: caseData?.temperature || "",
      hb_level: caseData?.hbLevel || "",
      contacts: caseData?.contacts || "",
      special_notes: processingError || "",
      ocr_status: recordStatus === "Verified" ? "SUCCESS" : "REVIEW_REQUIRED",
      job_id: extractionMetadata?.jobId || "",
      file_type: uploadedFile?.type || "",
      file_size_bytes: Number.isFinite(uploadedFile?.size) ? uploadedFile.size : "",
      model_used: extractionMetadata?.model || "",
      latency_ms: extractionMetadata?.latencyMs || "",
      prompt_tokens: extractionMetadata?.usage?.prompt_tokens || "",
      completion_tokens: extractionMetadata?.usage?.completion_tokens || "",
      total_tokens: extractionMetadata?.usage?.total_tokens || "",
      extracted_at:
        extractionMetadata?.extractedAt ||
        extractionMetadata?.completedAt ||
        "",
    };
  }, [
    caseData,
    extractionMetadata,
    processingError,
    recordStatus,
    uploadedFile?.name,
    uploadedFile?.size,
    uploadedFile?.type,
  ]);

  const rows = useMemo(() => {
    if (isAdmin) {
      if (adminRows.length > 0) return adminRows;
      return Array.from({ length: 10 }, () => createEmptyRow());
    }
    if (isFrontLineWorker) {
      return [latestSessionRow];
    }
    return [createEmptyRow()];
  }, [adminRows, isAdmin, isFrontLineWorker, latestSessionRow]);

  return (
    <Stack spacing={2.5}>
      <BackButton fallbackPath={fallbackPath} />
      <Box>
        <Typography variant="h5">Results</Typography>
      </Box>

      <Card>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={700}>
            {isAdmin ? "Latest Persisted Results (Database)" : "Current Session Result"}
          </Typography>
          <Typography color="text.secondary">
            {isAdmin
              ? "Showing the latest 10 processed records stored in the OCR database."
              : "Showing only the latest processed document from your current session."}
          </Typography>
        </CardContent>
      </Card>

      {isAdmin && isLoadingAdminRows && (
        <Stack direction="row" spacing={1} alignItems="center">
          <CircularProgress size={18} />
          <Typography variant="body2" color="text.secondary">
            Loading latest records...
          </Typography>
        </Stack>
      )}

      {adminError && isAdmin && (
        <Alert severity="error" variant="outlined">
          {adminError}
        </Alert>
      )}

      <Card sx={{ overflow: "hidden" }}>
        <CardContent>
          <TableContainer sx={{ maxHeight: 560, overflowX: "auto" }}>
            <Table stickyHeader size="small" sx={{ minWidth: 2400 }}>
              <TableHead>
                <TableRow>
                  {RESULT_COLUMNS.map((column) => (
                    <TableCell
                      key={column.key}
                      sx={{
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                        bgcolor: "background.paper",
                      }}
                    >
                      {column.label}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row, index) => (
                  <TableRow key={`${row?.id || "row"}-${index}`}>
                    {RESULT_COLUMNS.map((column) => (
                      <TableCell key={column.key} sx={{ verticalAlign: "top" }}>
                        <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", minWidth: 80 }}>
                          {formatCellValue(row?.[column.key])}
                        </Typography>
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Stack>
  );
}

export default Results;
