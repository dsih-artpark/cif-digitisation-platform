import CloudUploadRoundedIcon from "@mui/icons-material/CloudUploadRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import { Box, Button, Card, CardContent, Stack, Typography } from "@mui/material";
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createDigitizeJob } from "../../api/digitizeClient";
import BackButton from "../../components/BackButton/BackButton";
import { useCif } from "../../context/CifContext";

const SUPPORTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

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

    if (!SUPPORTED_IMAGE_TYPES.has(file.type)) {
      setStartError("Only JPG, PNG, and WEBP images are supported for OCR extraction.");
      return;
    }

    setUploadedFile(file);
    addUploadedDocument(file, activeRole);
    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return;
    }
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
              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
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
            {uploadedFile.type.startsWith("image/") && previewUrl && (
              <Box
                component="img"
                src={previewUrl}
                alt="Uploaded CIF preview"
                sx={{ maxHeight: 360, width: "100%", objectFit: "contain", borderRadius: 1 }}
              />
            )}
            <Stack spacing={1} mt={2}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                <DescriptionRoundedIcon color="primary" />
                <Typography variant="body2" color="text.secondary">
                  OCR currently supports JPG, PNG, and WEBP image uploads.
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
