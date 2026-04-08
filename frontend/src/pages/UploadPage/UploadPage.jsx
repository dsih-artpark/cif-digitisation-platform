import CloudUploadRoundedIcon from "@mui/icons-material/CloudUploadRounded";
import InsertDriveFileRoundedIcon from "@mui/icons-material/InsertDriveFileRounded";
import PictureAsPdfRoundedIcon from "@mui/icons-material/PictureAsPdfRounded";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  Typography,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createDigitizeJob } from "../../api/digitizeClient";
import BackButton from "../../components/BackButton/BackButton";
import { useCif } from "../../context/CifContext";
import { withResolvedDocumentMimeType } from "../../utils/documentFile";

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
  const selectedDocumentRef = useRef(null);
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

    const normalizedFile = withResolvedDocumentMimeType(file);
    if (!normalizedFile) {
      setStartError("Only image files and PDF files are supported.");
      return;
    }

    setUploadedFile(normalizedFile);
    addUploadedDocument(normalizedFile, activeRole);
    const url = URL.createObjectURL(normalizedFile);
    setPreviewUrl(url);
  };

  useEffect(() => {
    if (!uploadedFile || !selectedDocumentRef.current) return undefined;
    const timer = window.setTimeout(() => {
      selectedDocumentRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 220);

    return () => window.clearTimeout(timer);
  }, [uploadedFile]);

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
      markCurrentUploadStatus({
        extractionStatus: "Failed",
        recordStatus: "Review Required",
      });
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <Stack
      spacing={3}
      sx={{
        width: "100%",
        maxWidth: { xs: 760, lg: 1120 },
        mx: "auto",
      }}
    >
      <Box>
        <BackButton fallbackPath="/" />
      </Box>

      <Card
        sx={{
          width: "100%",
          maxWidth: { xs: "100%", lg: 1080 },
          mx: "auto",
          borderRadius: 4,
          overflow: "hidden",
          background:
            "radial-gradient(circle at top left, rgba(15,118,110,0.12), transparent 28%), linear-gradient(180deg, rgba(247,250,255,0.98) 0%, rgba(255,255,255,1) 54%, rgba(249,251,254,1) 100%)",
          boxShadow: "0 28px 70px rgba(14, 47, 83, 0.10)",
        }}
      >
        <Box
          sx={{
            height: 10,
            background:
              "linear-gradient(90deg, #0f766e 0%, #1d4ed8 52%, #2563eb 100%)",
          }}
        />
        <CardContent sx={{ px: { xs: 3, md: 5 }, py: { xs: 4, md: 5 } }}>
          <Stack spacing={3.2}>
            <Stack spacing={1.3} alignItems="center" textAlign="center">
              <Typography variant="h4" sx={{ fontSize: { xs: "2rem", md: "2.6rem" } }}>
                Upload CIF Document
              </Typography>
              <Typography
                color="text.secondary"
                sx={{ maxWidth: 640, fontSize: { xs: "1rem", md: "1.06rem" } }}
              >
                Add a scan, photo, or PDF and we will prepare a clean structured case draft for
                review.
              </Typography>
              <Stack
                direction="row"
                spacing={1}
                useFlexGap
                flexWrap="wrap"
                justifyContent="center"
              >
                <Chip label="Images" size="small" />
                <Chip label="PDF" size="small" />
              </Stack>
            </Stack>

            <Box
              onDrop={handleDrop}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragActive(true);
              }}
              onDragLeave={() => setIsDragActive(false)}
              sx={{
                border: "2px dashed",
                borderColor: isDragActive ? "#1d4ed8" : "rgba(18,60,107,0.18)",
                borderRadius: 4,
                p: { xs: 3, sm: 4.5, md: 6 },
                textAlign: "center",
                bgcolor: isDragActive ? "rgba(29,78,216,0.05)" : "rgba(255,255,255,0.72)",
                transition: "all 0.2s ease",
              }}
            >
              <Stack spacing={2} alignItems="center">
                <Box
                  sx={{
                    width: 82,
                    height: 82,
                    borderRadius: "50%",
                    display: "grid",
                    placeItems: "center",
                    background:
                      "radial-gradient(circle at 35% 35%, rgba(29,78,216,0.16), rgba(15,118,110,0.08) 55%, rgba(255,255,255,0.5) 100%)",
                    border: "1px solid rgba(29,78,216,0.12)",
                  }}
                >
                  <CloudUploadRoundedIcon color="primary" sx={{ fontSize: 40 }} />
                </Box>

                <Stack spacing={0.8}>
                  <Typography variant="h6">Drop your document here</Typography>
                  <Typography color="text.secondary">
                    or choose a file from your computer
                  </Typography>
                </Stack>

                <input
                  ref={inputRef}
                  type="file"
                  hidden
                  accept="image/*,.pdf,application/pdf"
                  onChange={(event) => {
                    handleFile(event.target.files?.[0]);
                    event.target.value = "";
                  }}
                />
                <Button
                  variant="contained"
                  size="large"
                  onClick={() => inputRef.current?.click()}
                  sx={{
                    minWidth: 190,
                    borderRadius: 999,
                    px: 3.2,
                    py: 1.2,
                  }}
                >
                  Select Document
                </Button>
              </Stack>
            </Box>

            {uploadedFile && (
              <Card
                ref={selectedDocumentRef}
                sx={{
                  scrollMarginTop: { xs: 92, md: 116 },
                  borderRadius: 3,
                  bgcolor: "rgba(255,255,255,0.88)",
                  borderColor: "rgba(18,60,107,0.12)",
                  boxShadow: "none",
                  animation: "selectedCardReveal 0.45s ease",
                  "@keyframes selectedCardReveal": {
                    from: {
                      opacity: 0,
                      transform: "translateY(22px) scale(0.99)",
                    },
                    to: {
                      opacity: 1,
                      transform: "translateY(0) scale(1)",
                    },
                  },
                }}
              >
                <CardContent sx={{ p: { xs: 2.2, md: 3 } }}>
                  <Stack spacing={2}>
                    <Stack
                      direction={{ xs: "column", md: "row" }}
                      spacing={1.5}
                      justifyContent="space-between"
                      alignItems={{ xs: "flex-start", md: "center" }}
                    >
                      <Stack spacing={0.7}>
                        <Typography variant="subtitle1" fontWeight={700}>
                          Selected Document
                        </Typography>
                        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                          <Chip
                            icon={
                              uploadedFile.type === "application/pdf" ? (
                                <PictureAsPdfRoundedIcon />
                              ) : (
                                <InsertDriveFileRoundedIcon />
                              )
                            }
                            label={uploadedFile.name}
                            sx={{
                              maxWidth: { xs: "100%", md: 420 },
                              "& .MuiChip-label": {
                                display: "block",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              },
                            }}
                          />
                          <Chip label={formatFileSize(uploadedFile.size)} variant="outlined" />
                        </Stack>
                      </Stack>

                      <Button
                        variant="contained"
                        size="large"
                        disabled={isStarting}
                        onClick={handleStartProcessing}
                        sx={{
                          width: { xs: "100%", md: "auto" },
                          minWidth: 180,
                          borderRadius: 999,
                        }}
                      >
                        {isStarting ? "Starting..." : "Start Processing"}
                      </Button>
                    </Stack>

                    {uploadedFile.type.startsWith("image/") && previewUrl && (
                      <Box
                        sx={{
                          border: "1px solid rgba(18,60,107,0.10)",
                          borderRadius: 3,
                          bgcolor: "#f8fafc",
                          minHeight: { xs: 260, sm: 320, md: 560 },
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          overflow: "hidden",
                        }}
                      >
                        <Box
                          component="img"
                          src={previewUrl}
                          alt="Uploaded CIF preview"
                          sx={{
                            width: "100%",
                            maxHeight: { xs: 260, sm: 320, md: 560 },
                            objectFit: "contain",
                          }}
                        />
                      </Box>
                    )}

                    {uploadedFile.type === "application/pdf" && previewUrl && (
                      <Box
                        sx={{
                          border: "1px solid rgba(18,60,107,0.10)",
                          borderRadius: 3,
                          bgcolor: "#f8fafc",
                          overflow: "hidden",
                        }}
                      >
                        <Box
                          component="iframe"
                          src={previewUrl}
                          title={uploadedFile.name}
                          sx={{
                            width: "100%",
                            height: { xs: 380, sm: 500, md: 860 },
                            border: 0,
                            display: "block",
                            bgcolor: "#f8fafc",
                          }}
                        />
                      </Box>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            )}

            {startError && (
              <Typography color="error.main" variant="body2" textAlign="center">
                {startError}
              </Typography>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}

export default UploadPage;
