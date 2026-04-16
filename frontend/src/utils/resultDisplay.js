function normalizeWhitespace(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

export function formatResultDisplay(value) {
  const text = normalizeWhitespace(value);
  if (!text) return "";
  if (/^n\/a$/i.test(text)) return "N/A";
  if (/^review required$/i.test(text)) return "Review Required";

  return text
    .toLowerCase()
    .replace(/\s*(?:,|;|\||&)\s*/g, " and ")
    .replace(/\s+and\s+/g, " and ")
    .replace(/\s+/g, " ")
    .trim();
}
