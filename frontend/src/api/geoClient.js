function parseErrorMessage(payload, fallbackMessage) {
  if (!payload || typeof payload !== "object") return fallbackMessage;
  if (typeof payload.detail === "string" && payload.detail.trim()) return payload.detail;
  if (typeof payload.message === "string" && payload.message.trim()) return payload.message;
  if (typeof payload.error === "string" && payload.error.trim()) return payload.error;
  return fallbackMessage;
}

export async function getBoundaryGeoJson(query) {
  const response = await fetch(`/api/geo/boundary?query=${encodeURIComponent(query)}`);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(parseErrorMessage(payload, `Unable to load boundary for ${query}.`));
  }

  if (!payload?.geojson) {
    throw new Error(`Boundary response was incomplete for ${query}.`);
  }

  return payload.geojson;
}
