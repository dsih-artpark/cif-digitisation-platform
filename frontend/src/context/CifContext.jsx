import { createContext, useCallback, useContext, useMemo, useState } from "react";

const CifContext = createContext(null);

const EMPTY_CASE_DATA = {
  patient_name: "N/A",
  age: "N/A",
  sex: "N/A",
  location: "N/A",
  village: "N/A",
  date: "N/A",
  test_type: "N/A",
  result: "N/A",
  pathogen: "N/A",
  treatment: "N/A",
  temperature: "N/A",
  hb_level: "N/A",
};

const EMPTY_FIELD_STATUS = {
  patient_name: "Review Required",
  age: "Review Required",
  sex: "Review Required",
  location: "Review Required",
  village: "Review Required",
  date: "Review Required",
  test_type: "Review Required",
  result: "Review Required",
  pathogen: "Review Required",
  treatment: "Review Required",
  temperature: "Review Required",
  hb_level: "Review Required",
};

export function CifProvider({ children }) {
  const [uploadedFile, setUploadedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [caseData, setCaseData] = useState(EMPTY_CASE_DATA);
  const [extractedCaseData, setExtractedCaseData] = useState(EMPTY_CASE_DATA);
  const [fieldStatus, setFieldStatus] = useState(EMPTY_FIELD_STATUS);
  const [recordStatus, setRecordStatus] = useState("Review Required");
  const [processingJobId, setProcessingJobId] = useState("");
  const [processingError, setProcessingError] = useState("");
  const [extractionMetadata, setExtractionMetadata] = useState(null);

  function splitLocationValue(location, village = "") {
    const normalize = (value) => {
      const text = String(value || "").trim();
      const normalized = text.toLowerCase();
      if (!text || ["n/a", "na", "unknown", "none", "null"].includes(normalized)) {
        return "N/A";
      }
      return text;
    };
    const splitPattern = /\s*[-|\/,]\s*/;

    let resolvedLocation = normalize(location);
    let resolvedVillage = normalize(village);

    if (resolvedLocation !== "N/A") {
      const parts = resolvedLocation.split(splitPattern).map((part) => part.trim()).filter(Boolean);
      if (parts.length >= 3) {
        resolvedLocation = parts[0];
        if (resolvedVillage === "N/A") resolvedVillage = parts.slice(1).join(" - ");
      } else if (parts.length === 2) {
        resolvedLocation = parts[0];
        if (resolvedVillage === "N/A") resolvedVillage = parts[1];
      }
    } else if (resolvedVillage !== "N/A") {
      resolvedLocation = resolvedVillage;
    }

    return {
      location: resolvedLocation,
      village: resolvedVillage,
    };
  }

  const addUploadedDocument = useCallback((file, uploadedByRole) => {
    void file;
    void uploadedByRole;
    return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }, []);

  const updateUploadedDocument = useCallback((uploadId, updates) => {
    void uploadId;
    void updates;
  }, []);

  const resetExtractionState = useCallback(() => {
    setCaseData(EMPTY_CASE_DATA);
    setExtractedCaseData(EMPTY_CASE_DATA);
    setFieldStatus(EMPTY_FIELD_STATUS);
    setRecordStatus("Review Required");
    setProcessingError("");
    setProcessingJobId("");
    setExtractionMetadata(null);
  }, []);

  const applyExtractionResult = useCallback((result, metadataOverrides = null) => {
    if (!result) return;
    const nextCaseData = {
      patient_name:
        result?.caseData?.patient_name ??
        result?.caseData?.patientName ??
        result?.caseData?.name_english ??
        result?.caseData?.name_hindi ??
        result?.caseData?.fullName ??
        "N/A",
      age: result?.caseData?.age ?? "N/A",
      sex: result?.caseData?.sex ?? "N/A",
      ...splitLocationValue(
        result?.caseData?.location ?? 
          result?.caseData?.locationVillage ?? 
          result?.caseData?.village ?? 
          "N/A",
        result?.caseData?.village ?? result?.caseData?.villageName ?? "N/A"
      ),
      date: result?.caseData?.date ?? result?.caseData?.testDate ?? "N/A",
      test_type: result?.caseData?.test_type ?? result?.caseData?.testType ?? "N/A",
      result: result?.caseData?.result ?? "N/A",
      pathogen: result?.caseData?.pathogen ?? "N/A",
      treatment: result?.caseData?.treatment ?? "N/A",
      temperature: result?.caseData?.temperature ?? "N/A",
      hb_level: result?.caseData?.hb_level ?? result?.caseData?.hbLevel ?? "N/A",
    };

    const nextFieldStatus = {
      patient_name: result?.fieldStatus?.patient_name || "Review Required",
      age: result?.fieldStatus?.age || "Review Required",
      sex: result?.fieldStatus?.sex || "Review Required",
      location: result?.fieldStatus?.location || "Review Required",
      village: result?.fieldStatus?.village || "Review Required",
      date: result?.fieldStatus?.date || "Review Required",
      test_type: result?.fieldStatus?.test_type || "Review Required",
      result: result?.fieldStatus?.result || "Review Required",
      pathogen: result?.fieldStatus?.pathogen || "Review Required",
      treatment: result?.fieldStatus?.treatment || "Review Required",
      temperature: result?.fieldStatus?.temperature || "Review Required",
      hb_level: result?.fieldStatus?.hb_level || "Review Required",
    };

    setCaseData(nextCaseData);
    setExtractedCaseData(nextCaseData);
    setFieldStatus(nextFieldStatus);
    setRecordStatus(result?.recordStatus || "Review Required");
    const baseMetadata =
      result?.metadata && typeof result.metadata === "object" ? result.metadata : {};
    const overrideMetadata =
      metadataOverrides && typeof metadataOverrides === "object" ? metadataOverrides : {};
    const mergedMetadata = { ...baseMetadata, ...overrideMetadata };
    setExtractionMetadata(Object.keys(mergedMetadata).length ? mergedMetadata : null);
  }, []);

  const markCurrentUploadStatus = useCallback(
    (updates) => {
      void updates;
    },
    []
  );

  const value = useMemo(
    () => ({
      uploadedFile,
      setUploadedFile,
      previewUrl,
      setPreviewUrl,
      addUploadedDocument,
      updateUploadedDocument,
      markCurrentUploadStatus,
      caseData,
      setCaseData,
      extractedCaseData,
      setExtractedCaseData,
      fieldStatus,
      setFieldStatus,
      recordStatus,
      setRecordStatus,
      processingJobId,
      setProcessingJobId,
      processingError,
      setProcessingError,
      extractionMetadata,
      setExtractionMetadata,
      resetExtractionState,
      applyExtractionResult,
    }),
    [
      uploadedFile,
      previewUrl,
      addUploadedDocument,
      updateUploadedDocument,
      markCurrentUploadStatus,
      caseData,
      fieldStatus,
      extractedCaseData,
      recordStatus,
      processingJobId,
      processingError,
      extractionMetadata,
      resetExtractionState,
      applyExtractionResult,
    ]
  );

  return <CifContext.Provider value={value}>{children}</CifContext.Provider>;
}

export function useCif() {
  const context = useContext(CifContext);
  if (!context) {
    throw new Error("useCif must be used within CifProvider");
  }
  return context;
}
