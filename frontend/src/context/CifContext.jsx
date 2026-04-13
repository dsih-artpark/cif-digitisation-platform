import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const CifContext = createContext(null);
const UPLOAD_HISTORY_STORAGE_KEY = "demoUploadHistory";

const EMPTY_CASE_DATA = {
  patientName: "N/A",
  age: "N/A",
  sex: "N/A",
  locationVillage: "N/A",
  testDate: "N/A",
  testType: "N/A",
  result: "N/A",
  pathogen: "N/A",
  treatment: "N/A",
  temperature: "N/A",
  hbLevel: "N/A",
  contacts: "N/A",
};

const EMPTY_FIELD_STATUS = {
  patientName: "Review Required",
  age: "Review Required",
  sex: "Review Required",
  locationVillage: "Review Required",
  testDate: "Review Required",
  testType: "Review Required",
  result: "Review Required",
  pathogen: "Review Required",
  treatment: "Review Required",
  temperature: "Review Required",
  hbLevel: "Review Required",
  contacts: "Review Required",
};

export function CifProvider({ children }) {
  const [uploadedFile, setUploadedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [uploadedDocuments, setUploadedDocuments] = useState([]);
  const [caseData, setCaseData] = useState(EMPTY_CASE_DATA);
  const [fieldStatus, setFieldStatus] = useState(EMPTY_FIELD_STATUS);
  const [recordStatus, setRecordStatus] = useState("Review Required");
  const [processingJobId, setProcessingJobId] = useState("");
  const [processingError, setProcessingError] = useState("");
  const [currentUploadId, setCurrentUploadId] = useState("");
  const [extractionMetadata, setExtractionMetadata] = useState(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.sessionStorage.removeItem(UPLOAD_HISTORY_STORAGE_KEY);
  }, []);

  const addUploadedDocument = useCallback((file, uploadedByRole) => {
    if (!file) return;
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const metadata = {
      id,
      fileName: file.name,
      fileType: file.type || "unknown",
      fileSize: Number(file.size) || 0,
      uploadedAt: new Date().toISOString(),
      uploadedByRole: uploadedByRole || "unknown",
      extractionStatus: "Queued",
      recordStatus: "Review Required",
    };
    setUploadedDocuments((previous) => [metadata, ...previous]);
    setCurrentUploadId(id);
    return id;
  }, []);

  const updateUploadedDocument = useCallback((uploadId, updates) => {
    if (!uploadId || !updates) return;
    setUploadedDocuments((previous) =>
      previous.map((item) => (item.id === uploadId ? { ...item, ...updates } : item))
    );
  }, []);

  const clearUploadedDocuments = useCallback(() => {
    setUploadedDocuments([]);
  }, []);

  const resetExtractionState = useCallback(() => {
    setCaseData(EMPTY_CASE_DATA);
    setFieldStatus(EMPTY_FIELD_STATUS);
    setRecordStatus("Review Required");
    setProcessingError("");
    setProcessingJobId("");
    setExtractionMetadata(null);
  }, []);

  const applyExtractionResult = useCallback((result, metadataOverrides = null) => {
    if (!result) return;
    const nextCaseData = {
      patientName: result?.caseData?.patientName || "N/A",
      age: result?.caseData?.age || "N/A",
      sex: result?.caseData?.sex || "N/A",
      locationVillage: result?.caseData?.locationVillage || "N/A",
      testDate: result?.caseData?.testDate || "N/A",
      testType: result?.caseData?.testType || "N/A",
      result: result?.caseData?.result || "N/A",
      pathogen: result?.caseData?.pathogen || "N/A",
      treatment: result?.caseData?.treatment || "N/A",
      temperature: result?.caseData?.temperature || "N/A",
      hbLevel: result?.caseData?.hbLevel || "N/A",
      contacts: result?.caseData?.contacts || "N/A",
    };

    const nextFieldStatus = {
      patientName: result?.fieldStatus?.patientName || "Review Required",
      age: result?.fieldStatus?.age || "Review Required",
      sex: result?.fieldStatus?.sex || "Review Required",
      locationVillage: result?.fieldStatus?.locationVillage || "Review Required",
      testDate: result?.fieldStatus?.testDate || "Review Required",
      testType: result?.fieldStatus?.testType || "Review Required",
      result: result?.fieldStatus?.result || "Review Required",
      pathogen: result?.fieldStatus?.pathogen || "Review Required",
      treatment: result?.fieldStatus?.treatment || "Review Required",
      temperature: result?.fieldStatus?.temperature || "Review Required",
      hbLevel: result?.fieldStatus?.hbLevel || "Review Required",
      contacts: result?.fieldStatus?.contacts || "Review Required",
    };

    setCaseData(nextCaseData);
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
      if (!currentUploadId || !updates) return;
      updateUploadedDocument(currentUploadId, updates);
    },
    [currentUploadId, updateUploadedDocument]
  );

  const value = useMemo(
    () => ({
      uploadedFile,
      setUploadedFile,
      previewUrl,
      setPreviewUrl,
      uploadedDocuments,
      addUploadedDocument,
      updateUploadedDocument,
      clearUploadedDocuments,
      currentUploadId,
      setCurrentUploadId,
      markCurrentUploadStatus,
      caseData,
      setCaseData,
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
      uploadedDocuments,
      addUploadedDocument,
      updateUploadedDocument,
      clearUploadedDocuments,
      currentUploadId,
      markCurrentUploadStatus,
      caseData,
      fieldStatus,
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
