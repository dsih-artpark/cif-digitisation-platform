import OpenInFullRoundedIcon from "@mui/icons-material/OpenInFullRounded";
import CloseFullscreenRoundedIcon from "@mui/icons-material/CloseFullscreenRounded";
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  IconButton,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { useEffect, useMemo, useRef, useState } from "react";
import { stateMapDetails } from "../../data/mockData";

const LEAFLET_CSS_ID = "leaflet-cdn-css";
const LEAFLET_SCRIPT_ID = "leaflet-cdn-js";
const LEAFLET_CSS_URL = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const LEAFLET_SCRIPT_URL = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
const NOMINATIM_QUERY_URL =
  "https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&polygon_geojson=1&q=Gadchiroli%20district%2C%20Maharashtra%2C%20India";
const DEFAULT_GADCHIROLI_CENTER = [20.1849, 80.0066];

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

async function fetchGadchiroliBoundary() {
  const response = await fetch(NOMINATIM_QUERY_URL);
  if (!response.ok) {
    throw new Error("Unable to fetch Gadchiroli district boundary.");
  }

  const results = await response.json();
  const boundary = results.find(
    (item) => item.geojson && (item.geojson.type === "Polygon" || item.geojson.type === "MultiPolygon")
  );

  if (!boundary?.geojson) {
    throw new Error("Gadchiroli boundary shape is unavailable.");
  }

  return boundary.geojson;
}

function buildOutsideMaskFeature(boundaryGeoJson) {
  const worldRing = [
    [-180, -90],
    [-180, 90],
    [180, 90],
    [180, -90],
    [-180, -90],
  ];

  if (boundaryGeoJson.type === "Polygon") {
    return {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [worldRing, boundaryGeoJson.coordinates[0]],
      },
    };
  }

  if (boundaryGeoJson.type === "MultiPolygon") {
    const holes = boundaryGeoJson.coordinates.map((polygon) => polygon[0]);
    return {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [worldRing, ...holes],
      },
    };
  }

  throw new Error("Unsupported boundary geometry.");
}

function IndiaMap() {
  const [isMaximized, setIsMaximized] = useState(false);
  const [mapError, setMapError] = useState("");
  const [isMapReady, setIsMapReady] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const districtLayerRef = useRef(null);
  const outsideMaskLayerRef = useRef(null);
  const districtLabelRef = useRef(null);

  const mapHeight = isMobile ? (isMaximized ? 420 : 300) : isMaximized ? 540 : 360;
  const maharashtraMetrics = stateMapDetails.Maharashtra;
  const activeState = useMemo(
    () => ({
      state: "Gadchiroli",
      cases: maharashtraMetrics?.cases ?? "-",
      trend: maharashtraMetrics?.trend ?? "-",
    }),
    [maharashtraMetrics?.cases, maharashtraMetrics?.trend]
  );

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
        });

        leaflet
          .tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "&copy; OpenStreetMap contributors",
            maxZoom: 19,
          })
          .addTo(map);

        districtLayerRef.current = leaflet.geoJSON(null, {
          style: {
            color: "#a63b12",
            fillColor: "#f28c28",
            fillOpacity: 0.08,
            weight: 3,
          },
        }).addTo(map);

        outsideMaskLayerRef.current = leaflet.geoJSON(null, {
          style: {
            color: "transparent",
            fillColor: "#8d99a8",
            fillOpacity: 0.56,
            fillRule: "evenodd",
          },
        }).addTo(map);

        outsideMaskLayerRef.current.on("click dblclick mousedown mouseup contextmenu", (event) => {
          leaflet.DomEvent.stop(event);
        });

        mapInstanceRef.current = map;
        setIsMapReady(true);

        setIsDataLoading(true);
        const boundaryGeoJson = await fetchGadchiroliBoundary();
        if (isCancelled) return;

        districtLayerRef.current?.clearLayers();
        districtLayerRef.current?.addData(boundaryGeoJson);

        outsideMaskLayerRef.current?.clearLayers();
        outsideMaskLayerRef.current?.addData(buildOutsideMaskFeature(boundaryGeoJson));
        districtLayerRef.current?.bringToFront();

        const districtBounds = districtLayerRef.current?.getBounds?.();
        if (districtBounds?.isValid?.()) {
          map.fitBounds(districtBounds, { padding: [16, 16], maxZoom: isMobile ? 9 : 10 });
          const districtCenter = districtBounds.getCenter();

          if (districtLabelRef.current) {
            map.removeLayer(districtLabelRef.current);
          }

          districtLabelRef.current = leaflet
            .marker(districtCenter, {
              interactive: false,
              keyboard: false,
              icon: leaflet.divIcon({
                className: "",
                html:
                  '<span style="display:inline-block;padding:4px 10px;border-radius:999px;background:rgba(15, 45, 82, 0.9);color:#fff;font-weight:700;font-size:13px;letter-spacing:0.2px;">Gadchiroli</span>',
                iconSize: [96, 28],
                iconAnchor: [48, 14],
              }),
            })
            .addTo(map);
        }
      } catch (error) {
        if (!isCancelled) {
          setMapError(error?.message || "Unable to load Gadchiroli map data.");
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
      outsideMaskLayerRef.current = null;
      districtLabelRef.current = null;
    };
  }, [isMobile]);

  useEffect(() => {
    if (!mapInstanceRef.current) return;

    const timeout = setTimeout(() => {
      mapInstanceRef.current?.invalidateSize();
      const districtBounds = districtLayerRef.current?.getBounds?.();
      if (districtBounds?.isValid?.()) {
        mapInstanceRef.current?.fitBounds(districtBounds, { padding: [16, 16], maxZoom: isMobile ? 9 : 10 });
        districtLabelRef.current?.setLatLng(districtBounds.getCenter());
      }
    }, 260);

    return () => clearTimeout(timeout);
  }, [isMaximized, isMobile, mapHeight]);

  return (
    <Card>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1} spacing={1}>
          <Typography variant="subtitle1" fontWeight={700}>
            Regional Trend Analysis - Maharashtra / Gadchiroli Map
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
          Exact Gadchiroli district boundary with non-Gadchiroli regions masked.
        </Typography>
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
          <Box ref={mapContainerRef} sx={{ width: "100%", height: "100%" }} />
          {!mapError && (isDataLoading || !isMapReady) && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                position: "absolute",
                top: 12,
                left: 12,
                bgcolor: "rgba(255,255,255,0.92)",
                px: 1,
                py: 0.5,
                borderRadius: 1,
              }}
            >
              Loading Gadchiroli boundary...
            </Typography>
          )}
        </Box>
        {mapError && (
          <Alert severity="warning" sx={{ mt: 1.5 }}>
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
            {activeState.state}
          </Typography>
          <Stack direction="row" spacing={1} mt={1} flexWrap="wrap">
            <Chip label={`Number of Cases: ${activeState.cases}`} size="small" />
            <Chip label={`Weekly Trend: ${activeState.trend}`} size="small" color="primary" />
          </Stack>
        </Box>
      </CardContent>
    </Card>
  );
}

export default IndiaMap;
