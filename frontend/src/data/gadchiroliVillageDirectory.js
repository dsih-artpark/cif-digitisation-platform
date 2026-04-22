import directory from "./gadchiroliVillageDirectory.json";

export const gadchiroliVillageDirectory = directory;
export const gadchiroliTalukas = directory.talukas;
export const gadchiroliTalukaNames = directory.talukas.map((taluka) => taluka.name);

export function getGadchiroliTaluka(talukaName) {
  return directory.talukas.find((taluka) => taluka.name === talukaName) || null;
}

// TODO(low): wire optional village geocoding/cache when we need lat/lng markers per village.
