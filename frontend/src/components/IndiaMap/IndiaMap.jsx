import OpenInFullRoundedIcon from "@mui/icons-material/OpenInFullRounded";
import CloseFullscreenRoundedIcon from "@mui/icons-material/CloseFullscreenRounded";
import {
  Box,
  Card,
  CardContent,
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
import { gadchiroliTalukaNames } from "../../data/gadchiroliVillageDirectory";

const LEAFLET_CSS_ID = "leaflet-cdn-css";
const LEAFLET_SCRIPT_ID = "leaflet-cdn-js";
const LEAFLET_CSS_URL = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const LEAFLET_SCRIPT_URL = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
const DEFAULT_GADCHIROLI_CENTER = [20.1849, 80.0066];
const TALUKA_QUERY_SUFFIX = "tehsil, tahsil, taluka, Gadchiroli district, Maharashtra, India";
const GADCHIROLI_TALUKAS = gadchiroliTalukaNames;

const TALUKA_STYLE = {
  color: "#a63b12",
  fillColor: "#f28c28",
  fillOpacity: 0.38,
  weight: 3,
  opacity: 1,
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
    `${normalizedTaluka} ${TALUKA_QUERY_SUFFIX}`,
    `${normalizedTaluka}, Gadchiroli district, Maharashtra, India`,
    `${normalizedTaluka} tehsil, Gadchiroli district, Maharashtra, India`,
    `${normalizedTaluka} tahsil, Gadchiroli district, Maharashtra, India`,
    `${normalizedTaluka} taluka, Gadchiroli district, Maharashtra, India`,
    `${talukaName}, Gadchiroli, Maharashtra, India`,
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

function IndiaMap() {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);
  const [isBoundaryLoading, setIsBoundaryLoading] = useState(false);
  const [selectedTaluka, setSelectedTaluka] = useState("");
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const talukaLayerRef = useRef(null);
  const loadRequestRef = useRef(0);

  const mapHeight = isMobile ? (isMaximized ? 420 : 300) : isMaximized ? 540 : 360;

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
          zoomSnap: 0.25,
        });

        mapInstanceRef.current = map;
        setIsMapReady(true);
      } catch {
        if (!isCancelled) {
          // Keep the map area plain if Leaflet fails to initialize.
        }
      } finally {
        if (!isCancelled) {
          setIsBoundaryLoading(false);
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
      talukaLayerRef.current = null;
    };
  }, [isMobile]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const leaflet = window.L;
    if (!map || !leaflet) return;

    const requestId = ++loadRequestRef.current;
    let isCancelled = false;

    const updateBoundary = async () => {
      if (talukaLayerRef.current) {
        map.removeLayer(talukaLayerRef.current);
        talukaLayerRef.current = null;
      }

      if (!selectedTaluka) {
        setIsBoundaryLoading(false);
        map.setView(DEFAULT_GADCHIROLI_CENTER, isMobile ? 8 : 9);
        return;
      }

      setIsBoundaryLoading(true);

      try {
        const feature = await fetchTalukaFeature(selectedTaluka);
        if (isCancelled || requestId !== loadRequestRef.current) return;

        const layer = leaflet.geoJSON(feature, { style: TALUKA_STYLE });
        layer.addTo(map);
        talukaLayerRef.current = layer;

        const bounds = layer.getBounds?.();
        if (bounds?.isValid?.()) {
          map.fitBounds(bounds, {
            padding: [16, 16],
            maxZoom: isMobile ? 10 : 11,
          });
        }
      } catch (error) {
        if (requestId === loadRequestRef.current) {
          console.warn("Unable to load tehsil boundary:", error);
        }
      } finally {
        if (!isCancelled && requestId === loadRequestRef.current) {
          setIsBoundaryLoading(false);
        }
      }
    };

    updateBoundary();

    return () => {
      isCancelled = true;
    };
  }, [selectedTaluka, isMobile]);

  useEffect(() => {
    if (!mapInstanceRef.current) return;

    const timeout = setTimeout(() => {
      mapInstanceRef.current?.invalidateSize();
      if (selectedTaluka && talukaLayerRef.current) {
        const bounds = talukaLayerRef.current.getBounds?.();
        if (bounds?.isValid?.()) {
          mapInstanceRef.current?.fitBounds(bounds, {
            padding: [16, 16],
            maxZoom: isMobile ? 10 : 11,
          });
        }
      } else {
        mapInstanceRef.current?.setView(DEFAULT_GADCHIROLI_CENTER, isMobile ? 8 : 9);
      }
    }, 260);

    return () => clearTimeout(timeout);
  }, [isMaximized, isMobile, mapHeight, selectedTaluka]);

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

        <Stack spacing={1.5} mb={2}>
          <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 280 } }}>
            <InputLabel id="taluka-select-label">Select Tehsil</InputLabel>
            <Select
              labelId="taluka-select-label"
              label="Select Tehsil"
              value={selectedTaluka}
              onChange={(event) => setSelectedTaluka(event.target.value)}
            >
              <MenuItem value="">All Tehsils</MenuItem>
              {GADCHIROLI_TALUKAS.map((taluka) => (
                <MenuItem key={taluka} value={taluka}>
                  {taluka}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
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
          {!isMapReady && (
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
            </Stack>
          )}
          {isBoundaryLoading && selectedTaluka && (
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{
                position: "absolute",
                top: 12,
                right: 12,
                bgcolor: "rgba(255,255,255,0.92)",
                px: 1.25,
                py: 0.75,
                borderRadius: 1,
                boxShadow: "0 1px 8px rgba(15, 45, 82, 0.08)",
              }}
            >
              <CircularProgress size={16} />
            </Stack>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}

export default IndiaMap;
