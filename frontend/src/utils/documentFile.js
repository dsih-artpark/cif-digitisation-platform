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

export const MAX_UPLOAD_FILE_SIZE = 15 * 1024 * 1024;

async function readFileHeaderBytes(file, byteCount = 16) {
  try {
    const slice = file.slice(0, Math.min(byteCount, file.size));
    const buffer = await slice.arrayBuffer();
    return new Uint8Array(buffer);
  } catch {
    return new Uint8Array(0);
  }
}

function detectMimeTypeFromHeader(header) {
  if (!header || header.length < 2) return "";
  if (header[0] === 0x25 && header[1] === 0x50 && header[2] === 0x44 && header[3] === 0x46) {
    return "application/pdf";
  }
  if (header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) {
    return "image/jpeg";
  }
  if (header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4e && header[3] === 0x47) {
    return "image/png";
  }
  if (header[0] === 0x47 && header[1] === 0x49 && header[2] === 0x46) {
    return "image/gif";
  }
  if (header[0] === 0x42 && header[1] === 0x4d) {
    return "image/bmp";
  }
  if (
    header.length >= 12 &&
    header[0] === 0x52 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x46 &&
    header[8] === 0x57 && header[9] === 0x45 && header[10] === 0x42 && header[11] === 0x50
  ) {
    return "image/webp";
  }
  if (
    header.length >= 12 &&
    header[4] === 0x66 && header[5] === 0x74 && header[6] === 0x79 && header[7] === 0x70 &&
    header[8] === 0x61 && header[9] === 0x76 && header[10] === 0x69 && header[11] === 0x66
  ) {
    return "image/avif";
  }
  if (
    header.length >= 12 &&
    header[4] === 0x66 && header[5] === 0x74 && header[6] === 0x79 && header[7] === 0x70
  ) {
    const brand = String.fromCharCode(header[8], header[9], header[10], header[11]);
    if (["heic", "heix", "heif", "hevc", "heim", "mif1", "msf1"].includes(brand)) {
      return "image/heic";
    }
  }
  return "";
}

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

async function convertImageToBlob(image, dimensionScale, quality) {
  const maxWidth = Math.round(1800 * dimensionScale);
  const maxHeight = Math.round(2400 * dimensionScale);
  const scale = Math.min(maxWidth / image.width, maxHeight / image.height, 1);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas is unavailable for image processing.");
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise((resolve) => {
    canvas.toBlob((nextBlob) => resolve(nextBlob), "image/jpeg", quality);
  });

  canvas.width = 0;
  canvas.height = 0;
  return blob;
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

    const compressionSteps = [
      { dimensionScale: 1, quality: 0.88 },
      { dimensionScale: 1, quality: 0.72 },
      { dimensionScale: 0.7, quality: 0.72 },
      { dimensionScale: 0.5, quality: 0.65 },
    ];

    let resultBlob = null;
    for (const step of compressionSteps) {
      try {
        const blob = await convertImageToBlob(image, step.dimensionScale, step.quality);
        if (blob && blob.size > 0) {
          resultBlob = blob;
          if (blob.size <= MAX_UPLOAD_FILE_SIZE) {
            break;
          }
        }
      } catch {
        continue;
      }
    }

    if (!resultBlob) {
      throw new Error("Image conversion failed after all attempts.");
    }

    return new File([resultBlob], buildFileNameWithExtension(file.name, ".jpg"), {
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

  let resolvedMimeType = resolveDocumentMimeType(file);
  if (!resolvedMimeType) {
    const header = await readFileHeaderBytes(file, 16);
    resolvedMimeType = detectMimeTypeFromHeader(header);
  }

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
