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
import { gadchiroliTalukaNames } from "../../data/gadchiroliVillageDirectory";

const LEAFLET_CSS_ID = "leaflet-cdn-css";
const LEAFLET_SCRIPT_ID = "leaflet-cdn-js";
const LEAFLET_CSS_URL = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const LEAFLET_SCRIPT_URL = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
const MAHARASHTRA_CENTER = [19.7515, 75.7139];
const GADCHIROLI_CENTER = [20.1849, 80.0066];

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

function IndiaMap() {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);
  const [selectedTehsil, setSelectedTehsil] = useState("");
  const [mapError, setMapError] = useState("");
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  const mapHeight = isMobile ? (isMaximized ? 420 : 300) : isMaximized ? 540 : 360;

  useEffect(() => {
    let isCancelled = false;

    const initializeMap = async () => {
      if (!mapContainerRef.current || mapInstanceRef.current) return;

      try {
        const leaflet = await ensureLeafletAssets();
        if (isCancelled || !mapContainerRef.current) return;

        const map = leaflet.map(mapContainerRef.current, {
          center: MAHARASHTRA_CENTER,
          zoom: isMobile ? 5.5 : 6,
          zoomControl: true,
          zoomSnap: 0.25,
          preferCanvas: true,
        });

        leaflet
          .tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
            updateWhenIdle: true,
            keepBuffer: 4,
          })
          .addTo(map);

        markerRef.current = leaflet
          .marker(GADCHIROLI_CENTER)
          .addTo(map)
          .bindTooltip("Gadchiroli", {
            permanent: true,
            direction: "top",
            offset: [0, -10],
            opacity: 0.95,
          });

        mapInstanceRef.current = map;
        setIsMapReady(true);
        setMapError("");
      } catch (error) {
        if (!isCancelled) {
          setMapError(error?.message || "Unable to load the map.");
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
      markerRef.current = null;
    };
  }, [isMobile]);

  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const timeout = setTimeout(() => {
      mapInstanceRef.current?.invalidateSize();
    }, 220);

    return () => clearTimeout(timeout);
  }, [isMaximized, isMobile, mapHeight, selectedTehsil]);

  return (
    <Card>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1} spacing={1}>
          <Typography variant="subtitle1" fontWeight={700}>
            Regional Trend Analysis - Gadchiroli Map
          </Typography>
          <IconButton onClick={() => setIsMaximized((prev) => !prev)} size="small" aria-label="maximize map">
            {isMaximized ? <CloseFullscreenRoundedIcon /> : <OpenInFullRoundedIcon />}
          </IconButton>
        </Stack>

        <Stack spacing={1.5} mb={2}>
          <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 280 } }}>
            <InputLabel id="tehsil-select-label">Select Tehsil</InputLabel>
            <Select
              labelId="tehsil-select-label"
              label="Select Tehsil"
              value={selectedTehsil}
              onChange={(event) => setSelectedTehsil(event.target.value)}
            >
              <MenuItem value="">All Tehsils</MenuItem>
              {gadchiroliTalukaNames.map((tehsil) => (
                <MenuItem key={tehsil} value={tehsil}>
                  {tehsil}
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
            transition: "height 0.25s ease",
            position: "relative",
          }}
        >
          <Box
            ref={mapContainerRef}
            sx={{
              width: "100%",
              height: "100%",
              background:
                "radial-gradient(circle at 50% 42%, rgba(255,255,255,0.96) 0%, rgba(247,250,254,1) 55%, rgba(240,245,251,1) 100%)",
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
          <Box
            sx={{
              position: "absolute",
              left: 12,
              bottom: 12,
              bgcolor: "rgba(15, 45, 82, 0.92)",
              color: "#fff",
              px: 1.5,
              py: 0.75,
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 700,
              boxShadow: "0 8px 20px rgba(15, 45, 82, 0.18)",
            }}
          >
            {selectedTehsil || "All Tehsils"}
          </Box>
        </Box>

        {mapError && (
          <Box sx={{ mt: 1.5, color: "text.secondary", fontSize: 13 }}>
            {mapError}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

export default IndiaMap;
