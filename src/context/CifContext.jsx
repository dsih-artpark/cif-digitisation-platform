import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const CifContext = createContext(null);
const UPLOAD_HISTORY_STORAGE_KEY = "demoUploadHistory";

const EMPTY_CASE_DATA = {
  patientName: "N/A",
  age: "N/A",
  sex: "N/A",
  date: "N/A",
  symptoms: "N/A",
  diagnosis: "N/A",
  medicines: "N/A",
};

const EMPTY_FIELD_STATUS = {
  patientName: "Review Required",
  age: "Review Required",
  sex: "Review Required",
  date: "Review Required",
  symptoms: "Review Required",
  diagnosis: "Review Required",
  medicines: "Review Required",
};

function loadStoredUploadHistory() {
  try {
    const storedHistory = sessionStorage.getItem(UPLOAD_HISTORY_STORAGE_KEY);
    if (!storedHistory) return [];
    const parsed = JSON.parse(storedHistory);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return [];
  }
}

export function CifProvider({ children }) {
  const [uploadedFile, setUploadedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [uploadedDocuments, setUploadedDocuments] = useState(loadStoredUploadHistory);
  const [caseData, setCaseData] = useState(EMPTY_CASE_DATA);
  const [fieldStatus, setFieldStatus] = useState(EMPTY_FIELD_STATUS);
  const [recordStatus, setRecordStatus] = useState("Review Required");
  const [processingJobId, setProcessingJobId] = useState("");
  const [processingError, setProcessingError] = useState("");
  const [currentUploadId, setCurrentUploadId] = useState("");
  const [extractionMetadata, setExtractionMetadata] = useState(null);

  useEffect(() => {
    sessionStorage.setItem(UPLOAD_HISTORY_STORAGE_KEY, JSON.stringify(uploadedDocuments));
  }, [uploadedDocuments]);

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

  const applyExtractionResult = useCallback((result) => {
    if (!result) return;
    const nextCaseData = {
      patientName: result?.caseData?.patientName || "N/A",
      age: result?.caseData?.age || "N/A",
      sex: result?.caseData?.sex || "N/A",
      date: result?.caseData?.date || "N/A",
      symptoms: result?.caseData?.symptoms || "N/A",
      diagnosis: result?.caseData?.diagnosis || "N/A",
      medicines: result?.caseData?.medicines || "N/A",
    };

    const nextFieldStatus = {
      patientName: result?.fieldStatus?.patientName || "Review Required",
      age: result?.fieldStatus?.age || "Review Required",
      sex: result?.fieldStatus?.sex || "Review Required",
      date: result?.fieldStatus?.date || "Review Required",
      symptoms: result?.fieldStatus?.symptoms || "Review Required",
      diagnosis: result?.fieldStatus?.diagnosis || "Review Required",
      medicines: result?.fieldStatus?.medicines || "Review Required",
    };

    setCaseData(nextCaseData);
    setFieldStatus(nextFieldStatus);
    setRecordStatus(result?.recordStatus || "Review Required");
    setExtractionMetadata(result?.metadata || null);
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
