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

const PDF_MIME_TYPE_ALIASES = new Set([
  "application/pdf",
  "application/x-pdf",
  "application/acrobat",
  "applications/vnd.pdf",
  "text/pdf",
  "text/x-pdf",
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
  if (PDF_MIME_TYPE_ALIASES.has(normalized)) {
    return "application/pdf";
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

function buildFileNameWithExtension(fileName, extension) {
  const baseName = (fileName || "document").replace(/\.[^./\\]+$/, "");
  return `${baseName}${extension}`;
}

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const imageUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(imageUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(imageUrl);
      reject(new Error("Unable to read the selected image."));
    };
    image.src = imageUrl;
  });
}

async function optimizeImageFile(file, resolvedMimeType) {
  const shouldKeepOriginal =
    file.size <= 3 * 1024 * 1024 &&
    ["image/jpeg", "image/png", "image/webp"].includes(resolvedMimeType);

  if (shouldKeepOriginal && normalizeMimeType(file.type) === resolvedMimeType) {
    return file;
  }

  try {
    const image = await loadImageFromFile(file);
    const canvas = document.createElement("canvas");
    const maxWidth = 1800;
    const maxHeight = 2400;
    const scale = Math.min(maxWidth / image.width, maxHeight / image.height, 1);
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Canvas is unavailable for image processing.");
    }

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (nextBlob) => {
          if (nextBlob) {
            resolve(nextBlob);
            return;
          }
          reject(new Error("Image conversion failed."));
        },
        "image/jpeg",
        0.88
      );
    });

    return new File([blob], buildFileNameWithExtension(file.name, ".jpg"), {
      type: "image/jpeg",
      lastModified: file.lastModified,
    });
  } catch {
    if (normalizeMimeType(file.type) === resolvedMimeType) {
      return file;
    }

    return new File([file], file.name, {
      type: resolvedMimeType,
      lastModified: file.lastModified,
    });
  }
}

export async function prepareDocumentFile(file) {
  if (!file) return null;

  const resolvedMimeType = resolveDocumentMimeType(file);
  if (!resolvedMimeType) {
    return null;
  }

  if (resolvedMimeType === "application/pdf") {
    if (normalizeMimeType(file.type) === resolvedMimeType) {
      return file;
    }

    return new File([file], buildFileNameWithExtension(file.name, ".pdf"), {
      type: resolvedMimeType,
      lastModified: file.lastModified,
    });
  }

  if (resolvedMimeType.startsWith("image/")) {
    return optimizeImageFile(file, resolvedMimeType);
  }

  if (normalizeMimeType(file.type) === resolvedMimeType) {
    return file;
  }

  return new File([file], file.name, {
    type: resolvedMimeType,
    lastModified: file.lastModified,
  });
}
