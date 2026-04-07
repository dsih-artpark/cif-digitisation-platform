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

function shouldRedirectToUpload(message = "") {
  return QUALITY_REDIRECT_MESSAGES.includes(message.trim());
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
          applyExtractionResult(job.result);
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
          const message = job?.error?.message || "Document processing failed. Please try again.";
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
        const message = error?.message || "Unable to fetch processing status.";
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
    <Stack spacing={3}>
      <Box>
        <BackButton fallbackPath="/upload" />
      </Box>

      {processingError && (
        <Alert severity="error" variant="outlined">
          {processingError}
        </Alert>
      )}

      <Card
        sx={{
          maxWidth: 780,
          mx: "auto",
          width: "100%",
          borderRadius: 4,
          overflow: "hidden",
          background:
            "linear-gradient(180deg, rgba(245,250,255,0.96) 0%, rgba(255,255,255,1) 52%, rgba(251,252,254,1) 100%)",
          boxShadow: "0 24px 60px rgba(14, 47, 83, 0.10)",
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
                width: 90,
                height: 90,
                borderRadius: "50%",
                display: "grid",
                placeItems: "center",
                background:
                  "radial-gradient(circle at 30% 30%, rgba(29,78,216,0.18), rgba(15,118,110,0.08) 55%, rgba(255,255,255,0.4) 100%)",
                border: "1px solid rgba(29,78,216,0.10)",
              }}
            >
              <CircularProgress size={44} thickness={4.4} />
            </Box>

            <Stack spacing={1.2} alignItems="center">
              <Typography variant="h4" sx={{ fontSize: { xs: "1.9rem", md: "2.35rem" } }}>
                Analysing Document
              </Typography>
              <Typography
                color="text.secondary"
                sx={{ maxWidth: 560, fontSize: { xs: "0.98rem", md: "1.05rem" } }}
              >
                Your CIF file is being processed securely. This usually takes a few moments.
              </Typography>
            </Stack>

            <Chip
              icon={<InsertDriveFileRoundedIcon />}
              label={uploadedFile?.name || "Uploaded document"}
              sx={{
                maxWidth: "100%",
                px: 1,
                height: 38,
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

            <Box sx={{ width: "100%", maxWidth: 520 }}>
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
                direction="row"
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
    </Stack>
  );
}

export default ProcessingPage;
