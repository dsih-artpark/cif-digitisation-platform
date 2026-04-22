import OpenInFullRoundedIcon from "@mui/icons-material/OpenInFullRounded";
import CloseFullscreenRoundedIcon from "@mui/icons-material/CloseFullscreenRounded";
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { getBoundaryGeoJson } from "../../api/geoClient";
import { stateMapDetails } from "../../data/mockData";
import {
  gadchiroliTalukaNames,
  getGadchiroliTaluka,
} from "../../data/gadchiroliVillageDirectory";

const LEAFLET_CSS_ID = "leaflet-cdn-css";
const LEAFLET_SCRIPT_ID = "leaflet-cdn-js";
const LEAFLET_CSS_URL = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const LEAFLET_SCRIPT_URL = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
const DEFAULT_GADCHIROLI_CENTER = [20.1849, 80.0066];
const DISTRICT_QUERY = "Gadchiroli district, Maharashtra, India";
const TALUKA_QUERY_SUFFIX = "tehsil, tahsil, taluka, Gadchiroli district, Maharashtra, India";
const GADCHIROLI_TALUKAS = gadchiroliTalukaNames;

const DISTRICT_STYLE = {
  color: "#0f2d52",
  fillColor: "#ffffff",
  fillOpacity: 0.01,
  weight: 2.25,
  opacity: 1,
};

const TALUKA_DEFAULT_STYLE = {
  color: "#9aa4b2",
  fillColor: "#d7dee6",
  fillOpacity: 0.08,
  weight: 1.2,
  opacity: 0.55,
};

const TALUKA_SELECTED_STYLE = {
  color: "#a63b12",
  fillColor: "#f28c28",
  fillOpacity: 0.38,
  weight: 3,
  opacity: 1,
};

const TALUKA_DIMMED_STYLE = {
  color: "#c2c9d3",
  fillColor: "#e6ebf1",
  fillOpacity: 0.03,
  weight: 1,
  opacity: 0.22,
};

function ensureLeafletAssets() {
  if (!document.getElementById(LEAFLET_CSS_ID)) {
    const cssLink = document.createElement("link");
    cssLink.id = LEAFLET_CSS_ID;
    cssLink.rel = "stylesheet";
    cssLink.href = LEAFLET_CSS_URL;
    document.head.appendChild(cssLink);
  }

  return new Promise((resolve, reject) => {
    if (window.L) {
      resolve(window.L);
      return;
    }

    const existingScript = document.getElementById(LEAFLET_SCRIPT_ID);
    const handleLoaded = () => {
      if (window.L) {
        resolve(window.L);
        return;
      }
      reject(new Error("Leaflet did not load correctly."));
    };
    const handleError = () => reject(new Error("Failed to load Leaflet script."));

    if (existingScript) {
      existingScript.addEventListener("load", handleLoaded, { once: true });
      existingScript.addEventListener("error", handleError, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = LEAFLET_SCRIPT_ID;
    script.src = LEAFLET_SCRIPT_URL;
    script.async = true;
    script.onload = handleLoaded;
    script.onerror = handleError;
    document.body.appendChild(script);
  });
}

async function fetchTalukaFeature(talukaName) {
  const normalizedTaluka = talukaName.replace(/\s*\(.*\)\s*/g, "").trim();
  const queries = [
    `${talukaName} ${TALUKA_QUERY_SUFFIX}`,
    `${normalizedTaluka} ${TALUKA_QUERY_SUFFIX}`,
    `${normalizedTaluka} tehsil, Gadchiroli district, Maharashtra, India`,
    `${normalizedTaluka} tahsil, Gadchiroli district, Maharashtra, India`,
    `${normalizedTaluka}, Gadchiroli, Maharashtra, India`,
  ];

  let lastError = null;
  for (const query of queries) {
    try {
      const geometry = await getBoundaryGeoJson(query);
      return {
        type: "Feature",
        properties: {
          taluka: talukaName,
          query,
        },
        geometry,
      };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error(`Boundary shape is unavailable for ${talukaName}.`);
}

function buildScopeLabel(leaflet, text, center) {
  return leaflet.marker(center, {
    interactive: false,
    keyboard: false,
    icon: leaflet.divIcon({
      className: "",
      html:
        '<span style="display:inline-block;padding:4px 10px;border-radius:999px;background:rgba(15, 45, 82, 0.92);color:#fff;font-weight:700;font-size:13px;letter-spacing:0.2px;">' +
        text +
        "</span>",
      iconSize: [120, 28],
      iconAnchor: [60, 14],
    }),
  });
}

function IndiaMap() {
  const [isMaximized, setIsMaximized] = useState(false);
  const [mapError, setMapError] = useState("");
  const [isMapReady, setIsMapReady] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [selectedTaluka, setSelectedTaluka] = useState("");
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const districtLayerRef = useRef(null);
  const talukaLayerRef = useRef(null);
  const districtBoundsRef = useRef(null);
  const scopeLabelRef = useRef(null);
  const talukaFeatureCollectionRef = useRef(null);
  const selectedTalukaRef = useRef("");

  const mapHeight = isMobile ? (isMaximized ? 420 : 300) : isMaximized ? 540 : 360;
  const gadchiroliMetrics = stateMapDetails.Gadchiroli ?? stateMapDetails.Maharashtra;
  const selectedScopeLabel = selectedTaluka || "All Gadchiroli talukas";

  useEffect(() => {
    selectedTalukaRef.current = selectedTaluka;
  }, [selectedTaluka]);

  const syncMapToSelection = () => {
    const map = mapInstanceRef.current;
    const leaflet = window.L;
    if (!map || !leaflet || !districtBoundsRef.current) return;
    const activeTaluka = selectedTalukaRef.current;

    if (!activeTaluka && talukaLayerRef.current) {
      map.removeLayer(talukaLayerRef.current);
      talukaLayerRef.current = null;
    }

    if (activeTaluka && talukaFeatureCollectionRef.current) {
      if (!talukaLayerRef.current) {
        talukaLayerRef.current = leaflet.geoJSON(talukaFeatureCollectionRef.current, {
          style: (feature) => {
            const talukaName = feature?.properties?.taluka;
            if (!activeTaluka) return TALUKA_DEFAULT_STYLE;
            return talukaName === activeTaluka ? TALUKA_SELECTED_STYLE : TALUKA_DIMMED_STYLE;
          },
          onEachFeature: (feature, layer) => {
            const talukaName = feature?.properties?.taluka;
            layer.bindTooltip(talukaName, {
              sticky: true,
              direction: "center",
              opacity: 0.95,
              className: "gadchiroli-taluka-tooltip",
            });
            layer.on("mouseover", () => {
              layer.openTooltip();
            });
            layer.on("mouseout", () => {
              layer.closeTooltip();
            });
            layer.on("click", () => {
              if (talukaName) {
                setSelectedTaluka(talukaName);
              }
            });
          },
        }).addTo(map);
      }

      talukaLayerRef.current.setStyle((feature) => {
        const talukaName = feature?.properties?.taluka;
        return talukaName === activeTaluka ? TALUKA_SELECTED_STYLE : TALUKA_DIMMED_STYLE;
      });
      talukaLayerRef.current.bringToFront();
    }

    if (scopeLabelRef.current) {
      map.removeLayer(scopeLabelRef.current);
      scopeLabelRef.current = null;
    }

    const targetLayer = activeTaluka
      ? talukaLayerRef.current?.getLayers?.().find(
          (layer) => layer?.feature?.properties?.taluka === activeTaluka
        )
      : districtLayerRef.current;

    const targetBounds =
      targetLayer?.getBounds?.() && targetLayer.getBounds().isValid()
        ? targetLayer.getBounds()
        : districtBoundsRef.current;

    if (targetBounds?.isValid?.()) {
      const padding = activeTaluka ? 0.18 : 0.12;
      const maxZoom = activeTaluka ? (isMobile ? 10 : 11) : isMobile ? 9 : 10;
      map.setMaxBounds(targetBounds.pad(padding));
      map.fitBounds(targetBounds, { padding: [16, 16], maxZoom });
      scopeLabelRef.current = buildScopeLabel(
        leaflet,
        activeTaluka || "Gadchiroli",
        targetBounds.getCenter()
      ).addTo(map);
    }
  };

  useEffect(() => {
    let isCancelled = false;

    const initializeMap = async () => {
      if (!mapContainerRef.current || mapInstanceRef.current) return;

      try {
        const leaflet = await ensureLeafletAssets();
        if (isCancelled || !mapContainerRef.current) return;

        const map = leaflet.map(mapContainerRef.current, {
          center: DEFAULT_GADCHIROLI_CENTER,
          zoom: isMobile ? 8 : 9,
          zoomControl: true,
          maxBoundsViscosity: 1.0,
          zoomSnap: 0.25,
        });

        mapInstanceRef.current = map;
        setIsMapReady(true);
        setIsDataLoading(true);
        setMapError("");

        const districtGeoJson = await getBoundaryGeoJson(DISTRICT_QUERY);
        if (isCancelled) return;

        districtLayerRef.current = leaflet
          .geoJSON(
            {
              type: "Feature",
              properties: { name: "Gadchiroli District" },
              geometry: districtGeoJson,
            },
            {
              style: DISTRICT_STYLE,
            }
          )
          .addTo(map);

        const districtBounds = districtLayerRef.current?.getBounds?.();
        if (districtBounds?.isValid?.()) {
          districtBoundsRef.current = districtBounds;
          map.setMaxBounds(districtBounds.pad(0.12));
          map.fitBounds(districtBounds, { padding: [16, 16], maxZoom: isMobile ? 9 : 10 });
          scopeLabelRef.current = buildScopeLabel(leaflet, "Gadchiroli", districtBounds.getCenter()).addTo(map);
        }

        const talukaSettled = await Promise.allSettled(
          GADCHIROLI_TALUKAS.map(async (talukaName) => fetchTalukaFeature(talukaName))
        );
        if (isCancelled) return;

        const talukaFeatures = talukaSettled
          .filter((result) => result.status === "fulfilled")
          .map((result) => result.value);

        if (talukaFeatures.length > 0) {
          talukaFeatureCollectionRef.current = {
            type: "FeatureCollection",
            features: talukaFeatures,
          };
        }

        syncMapToSelection();
      } catch (error) {
        if (!isCancelled) {
          setMapError("Map boundaries are temporarily unavailable. Showing district-level insights only.");
        }
      } finally {
        if (!isCancelled) {
          setIsDataLoading(false);
        }
      }
    };

    initializeMap();

    return () => {
      isCancelled = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      districtLayerRef.current = null;
      talukaLayerRef.current = null;
      districtBoundsRef.current = null;
      scopeLabelRef.current = null;
      talukaFeatureCollectionRef.current = null;
    };
  }, [isMobile]);

  useEffect(() => {
    syncMapToSelection();
  }, [selectedTaluka, isMobile]);

  useEffect(() => {
    if (!mapInstanceRef.current) return;

    const timeout = setTimeout(() => {
      mapInstanceRef.current?.invalidateSize();
      const targetBounds =
        (selectedTaluka
          ? talukaLayerRef.current
              ?.getLayers?.()
              .find((layer) => layer?.feature?.properties?.taluka === selectedTaluka)
              ?.getBounds?.()
          : districtBoundsRef.current) || districtBoundsRef.current;
      if (targetBounds?.isValid?.()) {
        mapInstanceRef.current?.setMaxBounds(targetBounds.pad(selectedTaluka ? 0.18 : 0.12));
        mapInstanceRef.current?.fitBounds(targetBounds, {
          padding: [16, 16],
          maxZoom: selectedTaluka ? (isMobile ? 10 : 11) : isMobile ? 9 : 10,
        });
        scopeLabelRef.current?.setLatLng(targetBounds.getCenter());
      }
    }, 260);

    return () => clearTimeout(timeout);
  }, [isMaximized, isMobile, mapHeight, selectedTaluka]);

  const activeTalukaMeta = selectedTaluka ? getGadchiroliTaluka(selectedTaluka) : null;
  const infoLabel = selectedTaluka
    ? `Showing only ${selectedTaluka} taluka.`
    : "Showing the full Gadchiroli district boundary with no taluka overlays yet.";

  return (
    <Card>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1} spacing={1}>
          <Typography variant="subtitle1" fontWeight={700}>
            Regional Trend Analysis - Gadchiroli Map
          </Typography>
          <IconButton
            onClick={() => setIsMaximized((prev) => !prev)}
            size="small"
            aria-label="maximize map"
          >
            {isMaximized ? <CloseFullscreenRoundedIcon /> : <OpenInFullRoundedIcon />}
          </IconButton>
        </Stack>

        <Typography variant="body2" color="text.secondary" mb={2}>
          Gadchiroli district boundary with taluka-level filtering and no outside geography shown.
        </Typography>

        <Stack spacing={1.5} mb={2}>
          <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 280 } }}>
            <InputLabel id="taluka-select-label">Select Taluka</InputLabel>
            <Select
              labelId="taluka-select-label"
              label="Select Taluka"
              value={selectedTaluka}
              onChange={(event) => setSelectedTaluka(event.target.value)}
            >
              <MenuItem value="">All Talukas</MenuItem>
              {GADCHIROLI_TALUKAS.map((taluka) => (
                <MenuItem key={taluka} value={taluka}>
                  {taluka}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Typography variant="body2" color="text.secondary">
            Use the dropdown to highlight a taluka, grey out the rest, and zoom to the selected boundary.
          </Typography>
        </Stack>

        <Box
          sx={{
            height: mapHeight,
            border: "1px solid #d7dee6",
            borderRadius: 1,
            overflow: "hidden",
            bgcolor: "#f8fbff",
            transition: "height 0.3s ease",
            position: "relative",
          }}
        >
          <Box
            ref={mapContainerRef}
            sx={{
              width: "100%",
              height: "100%",
              background:
                "linear-gradient(180deg, rgba(248,251,255,1) 0%, rgba(242,246,251,1) 100%)",
            }}
          />
          {!mapError && (isDataLoading || !isMapReady) && (
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{
                position: "absolute",
                top: 12,
                left: 12,
                bgcolor: "rgba(255,255,255,0.92)",
                px: 1.25,
                py: 0.75,
                borderRadius: 1,
                boxShadow: "0 1px 8px rgba(15, 45, 82, 0.08)",
              }}
            >
              <CircularProgress size={16} />
              <Typography variant="body2" color="text.secondary">
                Loading Gadchiroli GeoJSON...
              </Typography>
            </Stack>
          )}
        </Box>

        {mapError && (
          <Alert severity="info" sx={{ mt: 1.5 }}>
            {mapError}
          </Alert>
        )}

        <Box
          sx={{
            mt: 2,
            p: 1.5,
            border: "1px solid #d7dee6",
            borderRadius: 1,
            bgcolor: "background.paper",
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Focus Area
          </Typography>
          <Typography variant="subtitle1" fontWeight={700}>
            Gadchiroli
          </Typography>
          <Stack direction="row" spacing={1} mt={1} flexWrap="wrap">
            <Chip label={`District Cases: ${gadchiroliMetrics?.cases ?? "-"}`} size="small" />
            <Chip label={`District Trend: ${gadchiroliMetrics?.trend ?? "-"}`} size="small" color="primary" />
            <Chip label={`View: ${selectedScopeLabel}`} size="small" variant="outlined" />
            {activeTalukaMeta ? (
              <Chip label={`Villages: ${activeTalukaMeta.villageCount}`} size="small" variant="outlined" />
            ) : null}
          </Stack>
          <Typography variant="body2" color="text.secondary" mt={1}>
            {infoLabel}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

export default IndiaMap;
