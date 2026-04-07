import CloudUploadRoundedIcon from "@mui/icons-material/CloudUploadRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import { Box, Button, Card, CardContent, Stack, Typography } from "@mui/material";
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createDigitizeJob } from "../../api/digitizeClient";
import BackButton from "../../components/BackButton/BackButton";
import { useCif } from "../../context/CifContext";

const SUPPORTED_DOCUMENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

function formatFileSize(size = 0) {
  if (!Number.isFinite(size) || size <= 0) return "0 KB";
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

function UploadPage({ activeRole }) {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState("");
  const {
    uploadedFile,
    setUploadedFile,
    previewUrl,
    setPreviewUrl,
    addUploadedDocument,
    setProcessingJobId,
    setProcessingError,
    resetExtractionState,
    markCurrentUploadStatus,
  } = useCif();

  const handleFile = (file) => {
    if (!file) return;
    setStartError("");
    setProcessingError("");
    resetExtractionState();
    setUploadedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl("");

    if (!SUPPORTED_DOCUMENT_TYPES.has(file.type)) {
      setStartError("Only JPG, PNG, WEBP images, and PDF files are supported.");
      return;
    }

    setUploadedFile(file);
    addUploadedDocument(file, activeRole);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragActive(false);
    const file = event.dataTransfer.files?.[0];
    handleFile(file);
  };

  const handleStartProcessing = async () => {
    if (!uploadedFile || isStarting) return;
    setStartError("");
    setProcessingError("");
    setIsStarting(true);
    markCurrentUploadStatus({ extractionStatus: "Processing" });

    try {
      const jobId = await createDigitizeJob(uploadedFile);
      setProcessingJobId(jobId);
      navigate("/processing");
    } catch (error) {
      const message = error?.message || "Unable to start document processing.";
      setStartError(message);
      setProcessingError(message);
      markCurrentUploadStatus({ extractionStatus: "Failed", recordStatus: "Review Required" });
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <Stack spacing={3}>
      <Box>
        <BackButton fallbackPath="/" />
        <Typography variant="h5">Upload CIF Document</Typography>
        <Typography color="text.secondary">Digitise handwritten case investigation files.</Typography>
      </Box>
      <Card>
        <CardContent>
          <Box
            onDrop={handleDrop}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragActive(true);
            }}
            onDragLeave={() => setIsDragActive(false)}
            sx={{
              border: "2px dashed",
              borderColor: isDragActive ? "primary.main" : "#b6c2ce",
              borderRadius: 2,
              p: { xs: 2.5, sm: 4, md: 5 },
              textAlign: "center",
              bgcolor: isDragActive ? "#f0f6fe" : "background.paper",
              transition: "all 0.2s ease",
            }}
          >
            <CloudUploadRoundedIcon color="primary" sx={{ fontSize: 42 }} />
            <Typography mt={1} fontWeight={600}>
              Drag and drop CIF document
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              or select a file from your computer
            </Typography>
            <input
              ref={inputRef}
              type="file"
              hidden
              accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
              onChange={(event) => {
                handleFile(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
            <Button variant="outlined" onClick={() => inputRef.current?.click()}>
              Select Document
            </Button>
          </Box>
        </CardContent>
      </Card>

      {uploadedFile && (
        <Card>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={700} mb={1}>
              Document Preview
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              File: {uploadedFile.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Size: {formatFileSize(uploadedFile.size)}
            </Typography>
            {uploadedFile.type.startsWith("image/") && previewUrl && (
              <Box
                component="img"
                src={previewUrl}
                alt="Uploaded CIF preview"
                sx={{ maxHeight: 360, width: "100%", objectFit: "contain", borderRadius: 1 }}
              />
            )}
            {uploadedFile.type === "application/pdf" && previewUrl && (
              <Box
                sx={{
                  width: "100%",
                  display: "flex",
                  justifyContent: { xs: "center", md: "flex-start" },
                }}
              >
                <Box
                  sx={{
                    width: { xs: "100%", md: "50%" },
                    maxWidth: 760,
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
                    <DescriptionRoundedIcon color="primary" />
                    <Typography variant="body2" color="text.secondary">
                      PDF preview shown below. OCR will render the PDF pages for extraction.
                    </Typography>
                  </Box>
                  <Box
                    component="iframe"
                    src={previewUrl}
                    title="Uploaded PDF preview"
                    sx={{
                      width: "100%",
                      height: { xs: 320, md: 440 },
                      border: "1px solid #d7dee6",
                      borderRadius: 1.5,
                      bgcolor: "#f8fafc",
                    }}
                  />
                </Box>
              </Box>
            )}
            <Stack spacing={1} mt={2}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                <DescriptionRoundedIcon color="primary" />
                <Typography variant="body2" color="text.secondary">
                  OCR currently supports JPG, PNG, WEBP, and PDF uploads.
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      )}

      <Box>
        <Button
          variant="contained"
          size="large"
          disabled={!uploadedFile || isStarting}
          onClick={handleStartProcessing}
          sx={{ width: { xs: "100%", sm: "auto" } }}
        >
          {isStarting ? "Starting..." : "Start Processing"}
        </Button>
        {startError && (
          <Typography mt={1} color="error.main" variant="body2">
            {startError}
          </Typography>
        )}
      </Box>
    </Stack>
  );
}

export default UploadPage;
