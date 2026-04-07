import { Alert, Box, Button, Grid, Snackbar, Stack, Typography } from "@mui/material";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import BackButton from "../../components/BackButton/BackButton";
import CaseCard from "../../components/CaseCard/CaseCard";
import CaseTable from "../../components/CaseTable/CaseTable";
import DocumentCompare from "../../components/DocumentCompare/DocumentCompare";
import ValidationRules from "../../components/ValidationRules/ValidationRules";
import { DEMO_ROLES } from "../../config/roleAccess";
import { useCif } from "../../context/CifContext";

function isValidDdmmyyyy(value) {
  if (!value || String(value).toLowerCase() === "n/a") return false;
  const pattern = /^(\d{2})-(\d{2})-(\d{4})$/;
  const match = value.match(pattern);
  if (!match) return false;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

function isDateNotFuture(value) {
  if (!isValidDdmmyyyy(value)) return false;
  const [day, month, year] = value.split("-").map(Number);
  const selected = new Date(year, month - 1, day);
  const now = new Date();
  selected.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  return selected <= now;
}

function isMissingValue(value) {
  if (value === null || value === undefined) return true;
  const normalized = String(value).trim().toLowerCase();
  return !normalized || normalized === "n/a" || normalized === "unknown";
}

function CaseReviewPage({ activeRole = "" }) {
  const navigate = useNavigate();
  const [toastOpen, setToastOpen] = useState(false);
  const {
    uploadedFile,
    previewUrl,
    caseData,
    setCaseData,
    fieldStatus,
    setFieldStatus,
    recordStatus,
    setRecordStatus,
    extractionMetadata,
  } = useCif();
  const showValidationRules = activeRole === DEMO_ROLES.ADMIN;

  const rows = useMemo(
    () => [
      { key: "patientName", label: "Patient Name", value: caseData.patientName, status: fieldStatus.patientName },
      { key: "age", label: "Age", value: caseData.age, status: fieldStatus.age },
      { key: "sex", label: "Sex", value: caseData.sex, status: fieldStatus.sex },
      {
        key: "locationVillage",
        label: "Location/Village",
        value: caseData.locationVillage,
        status: fieldStatus.locationVillage,
      },
      { key: "testDate", label: "Test Date", value: caseData.testDate, status: fieldStatus.testDate },
      { key: "testType", label: "Test Type", value: caseData.testType, status: fieldStatus.testType },
      { key: "result", label: "Result", value: caseData.result, status: fieldStatus.result },
      { key: "pathogen", label: "Pathogen", value: caseData.pathogen, status: fieldStatus.pathogen },
      {
        key: "treatment",
        label: "Treatment",
        value: caseData.treatment,
        status: fieldStatus.treatment,
        multiline: true,
      },
      { key: "temperature", label: "Temperature", value: caseData.temperature, status: fieldStatus.temperature },
      { key: "hbLevel", label: "HB Level", value: caseData.hbLevel, status: fieldStatus.hbLevel },
    ],
    [caseData, fieldStatus]
  );

  const validationRules = useMemo(() => {
    const requiredKeys = [
      "patientName",
      "age",
      "sex",
      "locationVillage",
      "testDate",
      "testType",
      "result",
      "pathogen",
      "treatment",
      "temperature",
      "hbLevel",
    ];
    const missingFields = requiredKeys.filter((key) => isMissingValue(caseData[key]));
    const ageNumber = Number(caseData.age);
    const normalizedSex = String(caseData.sex || "").trim().toLowerCase();
    const treatmentLines = String(caseData.treatment || "")
      .split("\n")
      .map((item) => item.trim())
      .filter((value) => value && !isMissingValue(value));
    const hasDoseInfo = treatmentLines.some((item) => /\b\d+\s?(mg|ml|mcg|gm)\b/i.test(item));
    const verifiedCount = Object.values(fieldStatus).filter((status) => status === "Verified").length;
    const validAge = !isMissingValue(caseData.age) && Number.isFinite(ageNumber) && ageNumber >= 0 && ageNumber <= 120;
    const validSex = ["male", "female", "other"].includes(normalizedSex);

    return [
      {
        id: "required-fields",
        title: "Required Field Completeness",
        status: missingFields.length === 0 ? "pass" : "error",
        message:
          missingFields.length === 0
            ? "All required CIF fields are present."
            : `Missing values: ${missingFields.join(", ")}.`,
      },
      {
        id: "age-validation",
        title: "Age Range Validation",
        status: validAge ? "pass" : "error",
        message: validAge ? "Age format and range look valid." : "Age must be a number between 0 and 120.",
      },
      {
        id: "date-validation",
        title: "Case Date Validation",
        status: isDateNotFuture(caseData.testDate) ? "pass" : "error",
        message: isDateNotFuture(caseData.testDate)
          ? "Date format is valid and not in the future."
          : "Date must be in DD-MM-YYYY format and not be future dated.",
      },
      {
        id: "sex-validation",
        title: "Sex Validation",
        status: validSex ? "pass" : "warning",
        message: validSex ? "Sex field is captured in a supported format." : "Review sex field manually.",
      },
      {
        id: "treatment-check",
        title: "Treatment Extraction Quality",
        status: treatmentLines.length >= 1 && hasDoseInfo ? "pass" : "warning",
        message:
          treatmentLines.length >= 1 && hasDoseInfo
            ? "Treatment includes dosage markers."
            : "Review treatment manually. Dosage/frequency may be incomplete.",
      },
      {
        id: "verification-readiness",
        title: "Verification Readiness",
        status: verifiedCount >= 8 ? "pass" : "warning",
        message:
          verifiedCount >= 8
            ? `${verifiedCount} fields are already marked as verified.`
            : `Only ${verifiedCount} fields are verified. Review before final approval.`,
      },
    ];
  }, [caseData, fieldStatus]);

  const handleChange = (key, value) => {
    setCaseData((prev) => ({ ...prev, [key]: value }));
    setFieldStatus((prev) => ({ ...prev, [key]: "Review Required" }));
    setRecordStatus("Review Required");
  };

  const handleMarkVerified = () => {
    setFieldStatus((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((key) => {
        updated[key] = "Verified";
      });
      return updated;
    });
    setRecordStatus("Verified");
  };

  const handleSave = () => {
    setToastOpen(true);
    const allVerified = Object.values(fieldStatus).every((status) => status === "Verified");
    setRecordStatus(allVerified ? "Verified" : "Review Required");
    setTimeout(() => navigate("/dashboard"), 1800);
  };

  return (
    <Stack spacing={3}>
      <Box>
        <BackButton fallbackPath="/processing" />
        <Typography variant="h5">Case Data Review</Typography>
        <Typography color="text.secondary">Review, edit and verify extracted CIF fields.</Typography>
      </Box>

      <DocumentCompare
        uploadedFile={uploadedFile}
        previewUrl={previewUrl}
        caseData={caseData}
        fieldStatus={fieldStatus}
      />

      {showValidationRules && <ValidationRules rules={validationRules} />}

      <CaseTable rows={rows} onValueChange={handleChange} />

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
        <Button variant="contained" onClick={handleSave} sx={{ width: { xs: "100%", sm: "auto" } }}>
          Save Record
        </Button>
        <Button variant="outlined" onClick={handleMarkVerified} sx={{ width: { xs: "100%", sm: "auto" } }}>
          Mark Verified
        </Button>
      </Stack>

      <Grid container spacing={2}>
        <Grid item xs={12} md={8}>
          <CaseCard
            caseData={caseData}
            recordStatus={recordStatus}
            extractionMetadata={extractionMetadata}
            uploadedFile={uploadedFile}
          />
        </Grid>
      </Grid>

      <Snackbar
        open={toastOpen}
        autoHideDuration={1500}
        onClose={() => setToastOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert severity="success" variant="filled">
          <Typography variant="body2">Case Record Successfully Digitised</Typography>
          <Typography variant="body2">Record ID: CIF-00021</Typography>
        </Alert>
      </Snackbar>
    </Stack>
  );
}

export default CaseReviewPage;
