export function formatPathogenDisplay(value) {
  const normalized = String(value ?? "").trim();
  if (!normalized || normalized === "N/A") return "N/A";

  const lower = normalized.toLowerCase();
  if (lower === "pf" || lower.includes("falciparum")) return "P. falciparum";
  if (lower === "pv" || lower.includes("vivax")) return "P. vivax";
  if (lower === "mixed") return "Mixed";
  return normalized;
}
