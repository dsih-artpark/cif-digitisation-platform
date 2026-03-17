const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8787";

function parseErrorMessage(payload, fallbackMessage) {
  if (!payload || typeof payload !== "object") return fallbackMessage;
  if (typeof payload.message === "string" && payload.message.trim()) return payload.message;
  if (typeof payload.error === "string" && payload.error.trim()) return payload.error;
  return fallbackMessage;
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string" || !reader.result.startsWith("data:")) {
        reject(new Error("Unable to prepare file for upload."));
        return;
      }
      resolve(reader.result);
    };
    reader.onerror = () => reject(new Error("Unable to read selected file."));
    reader.readAsDataURL(file);
  });
}

export async function createDigitizeJob(file) {
  const fileDataUrl = await fileToDataUrl(file);
  const response = await fetch(`${API_BASE_URL}/api/digitize`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fileName: file.name,
      fileType: file.type,
      fileDataUrl,
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(parseErrorMessage(payload, "Unable to start document processing."));
  }

  if (!payload?.jobId) {
    throw new Error("Backend did not return a valid job id.");
  }

  return payload.jobId;
}

export async function getDigitizeJob(jobId) {
  const response = await fetch(`${API_BASE_URL}/api/digitize/${jobId}`);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(parseErrorMessage(payload, "Unable to fetch processing status."));
  }

  if (!payload?.job) {
    throw new Error("Backend status response was incomplete.");
  }

  return payload.job;
}
