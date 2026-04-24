import { Alert, Box, Button, Card, CardContent, Grid, Snackbar, Stack, Typography } from "@mui/material";
import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import BackButton from "../../components/BackButton/BackButton";
import CaseCard from "../../components/CaseCard/CaseCard";
import CaseTable from "../../components/CaseTable/CaseTable";
import DocumentCompare from "../../components/DocumentCompare/DocumentCompare";
import ValidationRules from "../../components/ValidationRules/ValidationRules";
import { DEMO_ROLES } from "../../config/roleAccess";
import { useCif } from "../../context/CifContext";

function isMissingValue(value) {
  if (value === null || value === undefined) return true;
  const normalized = String(value).trim().toLowerCase();
  return !normalized || normalized === "n/a" || normalized === "unknown";
}

function isValidAgeValue(value) {
  if (isMissingValue(value)) return false;
  const text = String(value).trim();
  const withUnitMatch = text.match(
    /\b(\d{1,3}(?:\.\d+)?)\s*(years?|year|yrs?|yr|months?|month|mos?|mths?|mth|mo)\b/i
  );
  const agePrefixMatch = text.match(
    /^\s*age\s*[:=-]?\s*(\d{1,3}(?:\.\d+)?)\s*(years?|year|yrs?|yr|months?|month|mos?|mths?|mth|mo)?\s*$/i
  );
  const bareMatch = text.match(/^\s*(\d{1,3}(?:\.\d+)?)\s*$/);
  const match = withUnitMatch || agePrefixMatch || bareMatch;
  if (!match) return false;

  const number = Number(match[1]);
  if (!Number.isFinite(number) || number < 0) return false;

  const unit = (match[2] || "").toLowerCase();
  if (unit && /month|mo|mth/.test(unit)) {
    return number <= 1200;
  }
  return number <= 120;
}

function isValidDateValue(value) {
  const text = String(value || "").trim();
  if (!text || text.toLowerCase() === "n/a") return false;
  const normalized = text.match(/^(\d{2})-(\d{2})-(\d{4})$/) || text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!normalized) return false;
  const day = Number(normalized[1]);
  const month = Number(normalized[2]);
  const year = Number(normalized[3]);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

function isDateNotFuture(value) {
  if (!isValidDateValue(value)) return false;
  const text = String(value || "").trim();
  const match = text.match(/^(\d{2})-(\d{2})-(\d{4})$/) || text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return false;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const selected = new Date(year, month - 1, day);
  const now = new Date();
  selected.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  return selected <= now;
}

const FIELD_SEVERITY = {
  patient_name: "Critical",
  age: "Critical",
  sex: "Critical",
  result: "Critical",
  pathogen: "Critical",
  location: "High",
  village: "High",
  date: "High",
  test_type: "High",
  treatment: "Medium",
  temperature: "Medium",
  hb_level: "Medium",
};

const FIELD_LABELS = {
  patient_name: "Patient Name",
  age: "Age",
  sex: "Sex",
  location: "Location",
  village: "Village",
  date: "Test Date",
  test_type: "Test Type",
  result: "Result",
  pathogen: "Pathogen",
  treatment: "Treatment",
  temperature: "Temperature",
  hb_level: "HB Level",
};

function CaseReviewPage({ activeRole = "" }) {
  const navigate = useNavigate();
  const editableFieldsRef = useRef(null);
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
  } = useCif();
  const showValidationRules = activeRole === DEMO_ROLES.ADMIN;

  const rows = useMemo(
    () => [
      {
        key: "patient_name",
        label: "Patient Name",
        value: caseData.patient_name,
        status: fieldStatus.patient_name,
      },
      {
        key: "age",
        label: "Age",
        value: caseData.age,
        status: fieldStatus.age,
        editorType: "age",
      },
      {
        key: "sex",
        label: "Sex",
        value: caseData.sex,
        status: fieldStatus.sex,
        editorType: "select",
        options: ["M", "F"],
        placeholder: "Select sex",
      },
      {
        key: "location",
        label: "Location",
        value: caseData.location,
        status: fieldStatus.location,
      },
      {
        key: "village",
        label: "Village",
        value: caseData.village,
        status: fieldStatus.village,
      },
      {
        key: "date",
        label: "Test Date",
        value: caseData.date,
        status: fieldStatus.date,
        editorType: "date",
        dateFormat: "dash",
      },
      {
        key: "test_type",
        label: "Test Type",
        value: caseData.test_type,
        status: fieldStatus.test_type,
      },
      {
        key: "result",
        label: "Result",
        value: caseData.result,
        status: fieldStatus.result,
        editorType: "select",
        options: [
          { value: "Positive", label: "Positive" },
          { value: "Negative", label: "Negative" },
        ],
        placeholder: "Select result",
      },
      {
        key: "pathogen",
        label: "Pathogen",
        value: caseData.pathogen,
        status: fieldStatus.pathogen,
        editorType: "select",
        options: [
          { value: "Pf", label: "P. falciparum" },
          { value: "Pv", label: "P. vivax" },
        ],
        placeholder: "Select pathogen",
      },
      {
        key: "treatment",
        label: "Treatment",
        value: caseData.treatment,
        status: fieldStatus.treatment,
        multiline: true,
      },
      {
        key: "temperature",
        label: "Temperature",
        value: caseData.temperature,
        status: fieldStatus.temperature,
      },
      {
        key: "hb_level",
        label: "HB Level",
        value: caseData.hb_level,
        status: fieldStatus.hb_level,
      },
    ],
    [caseData, fieldStatus]
  );

  const validationRules = useMemo(() => {
    const requiredKeys = [
      "patient_name",
      "age",
      "sex",
      "location",
      "village",
      "date",
      "test_type",
      "result",
      "pathogen",
      "treatment",
      "temperature",
      "hb_level",
    ];
    const missingFields = requiredKeys.filter((key) => {
      if (key === "pathogen" && String(caseData.result || "").trim().toLowerCase() === "negative") {
        return false;
      }
      return isMissingValue(caseData[key]);
    });
    const missingBySeverity = {
      Critical: [],
      High: [],
      Medium: [],
    };
    missingFields.forEach((key) => {
      const severity = FIELD_SEVERITY[key] || "Medium";
      missingBySeverity[severity].push(FIELD_LABELS[key] || key);
    });
    const severityMessages = [
      missingBySeverity.Critical.length
        ? `Critical: ${missingBySeverity.Critical.join(", ")}`
        : "",
      missingBySeverity.High.length ? `High: ${missingBySeverity.High.join(", ")}` : "",
      missingBySeverity.Medium.length
        ? `Medium: ${missingBySeverity.Medium.join(", ")}`
        : "",
    ].filter(Boolean);

    const normalizedSex = String(caseData.sex || "").trim().toLowerCase();
    const normalizedResult = String(caseData.result || "").trim().toLowerCase();
    const treatmentLines = String(caseData.treatment || "")
      .split("\n")
      .map((item) => item.trim())
      .filter((value) => value && !isMissingValue(value));
    const hasDoseInfo = treatmentLines.some((item) => /\b\d+\s?(mg|ml|mcg|gm)\b/i.test(item));
    const validAge = isValidAgeValue(caseData.age);
    const validSex = ["m", "f"].includes(normalizedSex);
    const validResult = ["positive", "negative"].includes(normalizedResult);
    const validDate = isDateNotFuture(caseData.date);
    const validPathogen =
      normalizedResult === "negative"
        ? true
        : ["pf", "pv", "mixed"].includes(String(caseData.pathogen || "").trim().toLowerCase());

    return [
      {
        id: "required-fields",
        title: "Required Field Completeness (Severity-Based)",
        status:
          missingBySeverity.Critical.length > 0
            ? "error"
            : missingFields.length > 0
              ? "warning"
              : "pass",
        message:
          missingFields.length === 0
            ? "All required CIF fields are present."
            : `Missing values by severity: ${severityMessages.join(" | ")}.`,
      },
      {
        id: "age-validation",
        title: "Age Range Validation",
        status: validAge ? "pass" : "error",
        message: validAge
          ? "Age format and range look valid."
          : "Age should use the number field plus the years/months selector.",
      },
      {
        id: "date-validation",
        title: "Case Date Validation",
        status: validDate ? "pass" : "error",
        message: validDate
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
        id: "result-validation",
        title: "Result Validation",
        status: validResult ? "pass" : "warning",
        message: validResult
          ? "Result field is captured as positive or negative."
          : "Review result field manually. Use positive or negative where applicable.",
      },
      {
        id: "pathogen-validation",
        title: "Pathogen Validation",
        status: validPathogen ? "pass" : "warning",
        message: validPathogen
          ? "Pathogen field is captured in a supported format."
          : "Review pathogen field manually. Use P. falciparum or P. vivax where applicable.",
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

      <Grid container spacing={2} alignItems="stretch">
        <Grid item xs={12} md={6}>
          <DocumentCompare uploadedFile={uploadedFile} previewUrl={previewUrl} />
        </Grid>
        <Grid item xs={12} md={6} ref={editableFieldsRef}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Typography variant="h6" mb={1.5}>
                Extracted Structured Fields
              </Typography>
              <CaseTable rows={rows} onValueChange={handleChange} />
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} mt={2}>
                <Button variant="contained" onClick={handleSave} sx={{ width: { xs: "100%", sm: "auto" } }}>
                  Save Record
                </Button>
                <Button variant="outlined" onClick={handleMarkVerified} sx={{ width: { xs: "100%", sm: "auto" } }}>
                  Mark Verified
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {showValidationRules && <ValidationRules rules={validationRules} />}

      <Grid container spacing={2}>
        <Grid item xs={12} md={8}>
          <CaseCard
            caseData={caseData}
            recordStatus={recordStatus}
            uploadedFile={uploadedFile}
            onEditRecord={() => {
              editableFieldsRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "start",
              });
            }}
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
