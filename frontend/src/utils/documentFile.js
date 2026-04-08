const SUPPORTED_DOCUMENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "image/avif",
  "image/bmp",
  "image/gif",
  "application/pdf",
]);

const EXTENSION_TO_MIME_TYPE = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".jfif": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".heic": "image/heic",
  ".heif": "image/heif",
  ".avif": "image/avif",
  ".bmp": "image/bmp",
  ".gif": "image/gif",
  ".pdf": "application/pdf",
};

function normalizeMimeType(mimeType) {
  if (!mimeType) return "";

  const normalized = mimeType.trim().toLowerCase();
  if (normalized === "image/jpg") {
    return "image/jpeg";
  }
  if (normalized === "image/pjpeg") {
    return "image/jpeg";
  }
  if (normalized === "application/octet-stream") {
    return "";
  }
  return normalized;
}

export function resolveDocumentMimeType(file) {
  if (!file) return "";

  const normalizedBrowserType = normalizeMimeType(file.type);
  if (SUPPORTED_DOCUMENT_TYPES.has(normalizedBrowserType)) {
    return normalizedBrowserType;
  }
  if (normalizedBrowserType.startsWith("image/")) {
    return normalizedBrowserType;
  }

  const lowerName = file.name?.trim().toLowerCase() || "";
  const matchedExtension = Object.keys(EXTENSION_TO_MIME_TYPE).find((extension) =>
    lowerName.endsWith(extension)
  );

  return matchedExtension ? EXTENSION_TO_MIME_TYPE[matchedExtension] : "";
}

export function supportsDocumentFile(file) {
  return Boolean(resolveDocumentMimeType(file));
}

export function withResolvedDocumentMimeType(file) {
  if (!file) return null;

  const resolvedMimeType = resolveDocumentMimeType(file);
  if (!resolvedMimeType) {
    return null;
  }

  if (normalizeMimeType(file.type) === resolvedMimeType) {
    return file;
  }

  return new File([file], file.name, {
    type: resolvedMimeType,
    lastModified: file.lastModified,
  });
}
