import InsertDriveFileRoundedIcon from "@mui/icons-material/InsertDriveFileRounded";
import { Alert, Box, Card, CardContent, Chip, Divider, LinearProgress, Stack, Typography } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getDigitizeJob } from "../../api/digitizeClient";
import BackButton from "../../components/BackButton/BackButton";
import ProcessingTimeline from "../../components/ProcessingTimeline/ProcessingTimeline";
import { DEMO_ROLES } from "../../config/roleAccess";
import { useCif } from "../../context/CifContext";

const STEP_CONFIG = [
  "Document Received",
  "Image Pre-processing",
  "Text Detection",
  "Field Extraction",
  "Structured Record Generation",
];

const QUALITY_REDIRECT_MESSAGES = [
  "The image is too dark. Please retake with better lighting.",
  "The image is too bright. Please avoid excessive lighting and retake.",
];

function formatSeconds(totalMs) {
  const totalSeconds = Math.max(0, Math.ceil(totalMs / 1000));
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function getFallbackNote(stepLabel) {
  if (stepLabel === "Document Received") return "Validating file integrity and metadata";
  if (stepLabel === "Image Pre-processing") return "Preparing image payload for extraction";
  if (stepLabel === "Text Detection") return "Extracting text from document";
  if (stepLabel === "Field Extraction") return "Mapping extracted text to CIF fields";
  return "Generating final structured record";
}

function shouldRedirectToUpload(message = "") {
  return QUALITY_REDIRECT_MESSAGES.includes(message.trim());
}

function ProcessingPage({ activeRole = "" }) {
  const navigate = useNavigate();
  const {
    uploadedFile,
    processingJobId,
    processingError,
    setProcessingError,
    applyExtractionResult,
    markCurrentUploadStatus,
  } = useCif();
  const isFrontLineWorker = activeRole === DEMO_ROLES.FRONT_LINE_WORKER;
  const [activeStep, setActiveStep] = useState(0);
  const [completed, setCompleted] = useState(Array(STEP_CONFIG.length).fill(false));
  const [stepProgress, setStepProgress] = useState(0);
  const [progress, setProgress] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [etaMs, setEtaMs] = useState(0);
  const [processingLog, setProcessingLog] = useState([]);
  const [currentNote, setCurrentNote] = useState(getFallbackNote(STEP_CONFIG[0]));

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

    const syncFromJob = (job) => {
      const stageStates = Array.isArray(job?.stages) ? job.stages : [];
      const completedFlags = STEP_CONFIG.map((_, index) => stageStates[index]?.status === "completed");
      setCompleted(completedFlags);

      let currentStepIndex = stageStates.findIndex((stage) => stage.status === "running");
      if (currentStepIndex === -1) {
        currentStepIndex = stageStates.findIndex((stage) => stage.status === "pending");
      }
      if (currentStepIndex === -1) {
        currentStepIndex = Math.max(stageStates.length - 1, 0);
      }

      const stageLabel = STEP_CONFIG[currentStepIndex] || STEP_CONFIG[0];
      const stageProgress = stageStates[currentStepIndex]?.progress || (completedFlags[currentStepIndex] ? 100 : 0);
      const note = stageStates[currentStepIndex]?.note || getFallbackNote(stageLabel);

      setActiveStep(currentStepIndex);
      setStepProgress(stageProgress);
      setProgress(job?.progress || 0);
      setElapsedMs(job?.elapsedMs || 0);
      setEtaMs(job?.etaMs || 0);
      setCurrentNote(note);
      setProcessingLog(
        (job?.logs || []).map((item) => {
          const timestamp = item?.timestamp ? new Date(item.timestamp).toLocaleTimeString() : "--:--:--";
          return `[${timestamp}] ${item?.message || ""}`;
        })
      );
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
        syncFromJob(job);

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
          setCurrentNote(message);
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
        setCurrentNote(message);
        setProcessingError(message);
        scheduleUploadRedirect(message);
        markCurrentUploadStatus({
          extractionStatus: "Failed",
          recordStatus: "Review Required",
          processedAt: new Date().toISOString(),
        });
      }
    };

    pollJob();
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
        <Typography variant="h5">Document Processing Screen</Typography>
        <Typography color="text.secondary">
          {isFrontLineWorker
            ? "Processing uploaded document for case extraction."
            : "Processing uploaded document through real extraction workflow."}
        </Typography>
      </Box>

      {processingError && (
        <Alert severity="error" variant="outlined">
          {processingError}
        </Alert>
      )}

      <Card>
        <CardContent>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={1}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", md: "center" }}
            mb={1}
          >
            <Typography variant="subtitle1" fontWeight={700}>
              Processing Progress
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Chip icon={<InsertDriveFileRoundedIcon />} label={uploadedFile?.name || "No file"} size="small" />
              <Chip label={`Elapsed: ${formatSeconds(elapsedMs)}`} size="small" />
              <Chip label={`ETA: ${formatSeconds(etaMs)}`} color="primary" size="small" />
            </Stack>
          </Stack>
          <LinearProgress variant="determinate" value={progress} sx={{ mb: 1, height: 8, borderRadius: 10 }} />
          <Typography variant="body2" color="text.secondary" mb={2}>
            {progress}% complete
          </Typography>
          {!isFrontLineWorker && (
            <>
              <Divider sx={{ mb: 2 }} />
              <ProcessingTimeline
                steps={STEP_CONFIG}
                activeStep={activeStep}
                completed={completed}
                stepProgress={stepProgress}
                currentNote={currentNote}
              />
              <Box
                sx={{
                  mt: 2,
                  p: 1.5,
                  bgcolor: "#f6f8fb",
                  border: "1px solid #d8e0ea",
                  borderRadius: 1,
                  maxHeight: 140,
                  overflowY: "auto",
                }}
              >
                <Typography variant="body2" fontWeight={700} mb={0.8}>
                  Live Processor Log
                </Typography>
                <Stack spacing={0.5}>
                  {processingLog.slice(-5).map((item, index) => (
                    <Typography variant="caption" color="text.secondary" key={`${item}-${index}`}>
                      {item}
                    </Typography>
                  ))}
                </Stack>
              </Box>
            </>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
}

export default ProcessingPage;
