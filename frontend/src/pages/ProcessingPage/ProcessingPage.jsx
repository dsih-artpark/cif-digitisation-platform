import InsertDriveFileRoundedIcon from "@mui/icons-material/InsertDriveFileRounded";
import AutorenewRoundedIcon from "@mui/icons-material/AutorenewRounded";
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  LinearProgress,
  Stack,
  Typography,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getDigitizeJob } from "../../api/digitizeClient";
import BackButton from "../../components/BackButton/BackButton";
import { useCif } from "../../context/CifContext";

const QUALITY_REDIRECT_MESSAGES = [
  "The image is too dark. Please retake with better lighting.",
  "The image is too bright. Please avoid excessive lighting and retake.",
];
const PUBLIC_CREDIT_FAILURE_MESSAGE =
  "Document processing is temporarily unavailable right now. Please try again later.";
const PUBLIC_PROCESSING_FAILURE_MESSAGE =
  "We could not finish processing this document right now. Please try again in a little while.";

function shouldRedirectToUpload(message = "") {
  return QUALITY_REDIRECT_MESSAGES.includes(message.trim());
}

function formatProcessingMessage(message = "") {
  const trimmedMessage = String(message || "").trim();
  if (!trimmedMessage) return PUBLIC_PROCESSING_FAILURE_MESSAGE;
  if (QUALITY_REDIRECT_MESSAGES.includes(trimmedMessage)) {
    return trimmedMessage;
  }

  const normalizedMessage = trimmedMessage.toLowerCase();
  if (
    normalizedMessage.includes("credit") ||
    normalizedMessage.includes("balance") ||
    normalizedMessage.includes("billing") ||
    normalizedMessage.includes("payment required") ||
    normalizedMessage.includes("quota") ||
    normalizedMessage.includes("insufficient funds")
  ) {
    return PUBLIC_CREDIT_FAILURE_MESSAGE;
  }

  return PUBLIC_PROCESSING_FAILURE_MESSAGE;
}

function ProcessingPage() {
  const navigate = useNavigate();
  const {
    uploadedFile,
    processingJobId,
    processingError,
    setProcessingError,
    applyExtractionResult,
    markCurrentUploadStatus,
  } = useCif();
  const [progress, setProgress] = useState(0);

  const pollIntervalRef = useRef(null);
  const navTimeoutRef = useRef(null);
  const uploadRedirectTimeoutRef = useRef(null);
  const completionHandledRef = useRef(false);

  useEffect(() => {
    if (!uploadedFile) {
      navigate("/upload", { replace: true });
      return undefined;
    }

    if (!processingJobId) {
      const message = "Processing job is missing. Please upload and start processing again.";
      setProcessingError(message);
      navigate("/upload", { replace: true });
      return undefined;
    }

    completionHandledRef.current = false;

    const scheduleUploadRedirect = (message) => {
      if (!shouldRedirectToUpload(message)) return;
      if (uploadRedirectTimeoutRef.current) {
        clearTimeout(uploadRedirectTimeoutRef.current);
      }
      uploadRedirectTimeoutRef.current = setTimeout(() => {
        navigate("/upload", { replace: true });
      }, 3000);
    };

    const stopPolling = () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };

    const pollJob = async () => {
      try {
        const job = await getDigitizeJob(processingJobId);
        setProgress(job?.progress || 0);

        if (job.status === "completed" && !completionHandledRef.current) {
          completionHandledRef.current = true;
          stopPolling();
          setProcessingError("");
          const metadataLatency = Number(job?.result?.metadata?.latencyMs);
          applyExtractionResult(job.result, {
            usage: job?.result?.metadata?.usage || job?.usage || null,
            latencyMs:
              Number.isFinite(metadataLatency) && metadataLatency > 0
                ? metadataLatency
                : null,
            jobId: job?.id || "",
            createdAt: job?.createdAt || "",
            startedAt: job?.startedAt || "",
            completedAt: job?.completedAt || "",
          });
          markCurrentUploadStatus({
            extractionStatus: "Completed",
            recordStatus: job?.result?.recordStatus || "Review Required",
            processedAt: new Date().toISOString(),
          });
          navTimeoutRef.current = setTimeout(() => navigate("/case-review"), 900);
          return;
        }

        if (job.status === "failed") {
          stopPolling();
          const message = formatProcessingMessage(job?.error?.message);
          setProcessingError(message);
          scheduleUploadRedirect(message);
          markCurrentUploadStatus({
            extractionStatus: "Failed",
            recordStatus: "Review Required",
            processedAt: new Date().toISOString(),
          });
        }
      } catch (error) {
        stopPolling();
        const message = formatProcessingMessage(error?.message);
        setProcessingError(message);
        scheduleUploadRedirect(message);
        markCurrentUploadStatus({
          extractionStatus: "Failed",
          recordStatus: "Review Required",
          processedAt: new Date().toISOString(),
        });
      }
    };

    void pollJob();
    pollIntervalRef.current = setInterval(pollJob, 1200);

    return () => {
      stopPolling();
      if (navTimeoutRef.current) {
        clearTimeout(navTimeoutRef.current);
        navTimeoutRef.current = null;
      }
      if (uploadRedirectTimeoutRef.current) {
        clearTimeout(uploadRedirectTimeoutRef.current);
        uploadRedirectTimeoutRef.current = null;
      }
    };
  }, [
    uploadedFile,
    processingJobId,
    navigate,
    setProcessingError,
    applyExtractionResult,
    markCurrentUploadStatus,
  ]);

  return (
    <Stack
      spacing={3}
      sx={{
        minHeight: "100%",
        width: "100%",
        maxWidth: { xs: 760, md: 820 },
        mx: "auto",
      }}
    >
      <Box>
        <BackButton fallbackPath="/upload" />
      </Box>

      {processingError && (
        <Alert
          severity="info"
          variant="outlined"
          sx={{
            borderColor: "rgba(29,78,216,0.18)",
            bgcolor: "rgba(29,78,216,0.04)",
          }}
        >
          {processingError}
        </Alert>
      )}

      <Box
        sx={{
          minHeight: { xs: "calc(100vh - 250px)", md: "calc(100vh - 230px)" },
          display: "grid",
          placeItems: "center",
          px: { xs: 0, md: 1.5 },
        }}
      >
        <Card
          sx={{
            maxWidth: 780,
            width: "100%",
            borderRadius: 4,
            overflow: "hidden",
            background:
              "radial-gradient(circle at top center, rgba(29,78,216,0.14), transparent 30%), linear-gradient(180deg, rgba(245,250,255,0.99) 0%, rgba(255,255,255,1) 56%, rgba(250,252,255,1) 100%)",
            boxShadow: "0 34px 90px rgba(14, 47, 83, 0.14)",
            animation: "processingCardFloatIn 0.45s ease",
            "@keyframes processingCardFloatIn": {
              from: {
                opacity: 0,
                transform: "translateY(22px) scale(0.985)",
              },
              to: {
                opacity: 1,
                transform: "translateY(0) scale(1)",
              },
            },
          }}
        >
          <Box
            sx={{
              height: 10,
              background:
                "linear-gradient(90deg, #0f766e 0%, #1d4ed8 45%, #7c3aed 100%)",
            }}
          />
          <CardContent sx={{ px: { xs: 3, md: 6 }, py: { xs: 5, md: 7 } }}>
            <Stack spacing={3} alignItems="center" textAlign="center">
              <Box
                sx={{
                  width: 104,
                  height: 104,
                  borderRadius: "50%",
                  display: "grid",
                  placeItems: "center",
                  background:
                    "radial-gradient(circle at 30% 30%, rgba(29,78,216,0.18), rgba(15,118,110,0.08) 55%, rgba(255,255,255,0.45) 100%)",
                  border: "1px solid rgba(29,78,216,0.10)",
                  animation: "processingOrbPulse 2.2s ease-in-out infinite",
                  "@keyframes processingOrbPulse": {
                    "0%": { transform: "scale(1)", boxShadow: "0 0 0 rgba(29,78,216,0.08)" },
                    "50%": {
                      transform: "scale(1.04)",
                      boxShadow: "0 14px 36px rgba(29,78,216,0.10)",
                    },
                    "100%": { transform: "scale(1)", boxShadow: "0 0 0 rgba(29,78,216,0.08)" },
                  },
                }}
              >
                <CircularProgress size={50} thickness={4.2} />
              </Box>

              <Stack spacing={1.2} alignItems="center">
                <Typography variant="h4" sx={{ fontSize: { xs: "2rem", md: "2.5rem" } }}>
                  Analysing Document
                </Typography>
                <Typography
                  color="text.secondary"
                  sx={{ maxWidth: 560, fontSize: { xs: "1rem", md: "1.06rem" } }}
                >
                  Your CIF file is being processed securely. Please wait a moment while we prepare
                  the structured output.
                </Typography>
              </Stack>

              <Chip
                icon={<InsertDriveFileRoundedIcon />}
                label={uploadedFile?.name || "Uploaded document"}
                sx={{
                  maxWidth: "100%",
                  px: 1,
                  height: 40,
                  bgcolor: "rgba(18,60,107,0.06)",
                  border: "1px solid rgba(18,60,107,0.10)",
                  "& .MuiChip-label": {
                    display: "block",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  },
                }}
              />

              <Box sx={{ width: "100%", maxWidth: 540 }}>
                <LinearProgress
                  variant="determinate"
                  value={Math.max(progress, 6)}
                  sx={{
                    height: 10,
                    borderRadius: 999,
                    bgcolor: "rgba(18,60,107,0.10)",
                    "& .MuiLinearProgress-bar": {
                      borderRadius: 999,
                      background: "linear-gradient(90deg, #0f766e 0%, #1d4ed8 100%)",
                    },
                  }}
                />
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={{ xs: 0.8, sm: 0 }}
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{ mt: 1.2 }}
                >
                  <Typography variant="body2" color="text.secondary">
                    {progress}% complete
                  </Typography>
                  <Stack direction="row" spacing={0.6} alignItems="center">
                    <AutorenewRoundedIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                    <Typography variant="body2" color="text.secondary">
                      Please keep this page open
                    </Typography>
                  </Stack>
                </Stack>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    </Stack>
  );
}

export default ProcessingPage;
