import { useEffect, useMemo, useRef, useState } from "react";
import { Box, Card, CardContent, FormControl, InputLabel, MenuItem, Select, Typography } from "@mui/material";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const TALUKS = [
  "Achalpur",
  "Aheri",
  "Akkalkot",
  "Alibag",
  "Amalner",
  "Ambegaon",
  "Amravati",
  "Arjuni Morgaon",
  "Bhiwandi",
  "Chandrapur",
  "Gadchiroli",
  "Karjat",
  "Latur",
  "Nagpur Rural",
  "Pune City",
  "Solapur North",
];

const TALUK_NAME_ALIASES = {
  "Nagpur Rural": "Nagpur (Rural)",
};

const MAHARASHTRA_BOUNDARY_URL =
  "https://raw.githubusercontent.com/Subhash9325/GeoJson-Data-of-Indian-States/master/Indian_States";

function isMaharashtraFeature(feature) {
  const props = feature?.properties || {};
  const values = Object.values(props);

  return values.some((value) => typeof value === "string" && value.toLowerCase() === "maharashtra");
}

function resolveGeoJsonName(talukName) {
  return TALUK_NAME_ALIASES[talukName] || talukName;
}

function buildMarkerStyle(selectedTaluk, displayName) {
  const isSelected = selectedTaluk === displayName;

  return {
    radius: isSelected ? 10 : 7,
    color: isSelected ? "red" : "#6b7280",
    weight: isSelected ? 3 : 1,
    fillColor: isSelected ? "#ef4444" : "#94a3b8",
    fillOpacity: isSelected ? 0.95 : 0.55,
    opacity: 1,
  };
}

function getPopupHtml(feature) {
  const name = feature?.properties?.NAME11 ?? "Unknown";
  const district = feature?.properties?.dtname ?? "Unknown";

  return `
    <div style="min-width: 160px">
      <div><strong>Taluk Name:</strong> ${name}</div>
      <div><strong>District:</strong> ${district}</div>
    </div>
  `;
}

export default function IndiaMap() {
  const mapElRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const boundaryRef = useRef(null);
  const layerByNameRef = useRef(new Map());
  const featureByNameRef = useRef(new Map());
  const [selectedTaluk, setSelectedTaluk] = useState("");
  const [loadState, setLoadState] = useState("loading");

  const talukOptions = useMemo(() => TALUKS, []);

  useEffect(() => {
    if (!mapElRef.current || mapRef.current) return;

    const map = L.map(mapElRef.current, {
      zoomControl: true,
      attributionControl: true,
      zoomAnimation: true,
      fadeAnimation: true,
      scrollWheelZoom: true,
      zoomSnap: 0.25,
      zoomDelta: 0.5,
    }).setView([19.5, 75.5], 6);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
      boundaryRef.current = null;
      layerByNameRef.current = new Map();
      featureByNameRef.current = new Map();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadMaharashtraBoundary() {
      if (!mapRef.current) return;

      try {
        const response = await fetch(MAHARASHTRA_BOUNDARY_URL);
        if (!response.ok) return;

        const boundaryGeoJson = await response.json();
        if (cancelled || !mapRef.current) return;

        if (boundaryRef.current) {
          boundaryRef.current.remove();
          boundaryRef.current = null;
        }

        const boundaryFeature =
          boundaryGeoJson?.type === "FeatureCollection"
            ? (boundaryGeoJson.features || []).find(isMaharashtraFeature)
            : isMaharashtraFeature(boundaryGeoJson)
              ? boundaryGeoJson
              : null;

        if (!boundaryFeature) return;

        const boundaryCollection =
          boundaryGeoJson?.type === "FeatureCollection"
            ? {
                type: "FeatureCollection",
                features: [boundaryFeature],
              }
            : boundaryFeature;

        const boundaryLayer = L.geoJSON(boundaryCollection, {
          style: {
            color: "#0f172a",
            weight: 2,
            opacity: 0.85,
            fillColor: "#ffffff",
            fillOpacity: 0.03,
          },
          interactive: false,
        });

        boundaryLayer.addTo(mapRef.current);
        boundaryLayer.bringToBack();
        boundaryRef.current = boundaryLayer;

        const bounds = boundaryLayer.getBounds();
        if (bounds.isValid()) {
          mapRef.current.fitBounds(bounds, { padding: [20, 20], animate: true });
        }
      } catch (error) {
        // Keep the map usable even if the boundary layer cannot load.
      }
    }

    loadMaharashtraBoundary();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadTalukPoints() {
      if (!mapRef.current) return;

      setLoadState("loading");

      try {
        const response = await fetch("/maharashtra-subdistricts.geojson");
        const geoJson = await response.json();
        const allowedSourceNames = new Set(TALUKS.map(resolveGeoJsonName));

        const filteredFeatures = (geoJson.features || []).filter((feature) => {
          const sourceName = feature?.properties?.NAME11;
          return allowedSourceNames.has(sourceName);
        });

        const featureIndex = new Map();
        const sourceNameToDisplayName = new Map(
          TALUKS.map((taluk) => [resolveGeoJsonName(taluk), taluk])
        );

        filteredFeatures.forEach((feature) => {
          const sourceName = feature?.properties?.NAME11;
          const displayName = sourceNameToDisplayName.get(sourceName);

          if (displayName) {
            featureIndex.set(displayName, feature);
          }
        });

        if (cancelled) return;

        featureByNameRef.current = featureIndex;
        layerByNameRef.current = new Map();

        if (layerRef.current) {
          layerRef.current.remove();
          layerRef.current = null;
        }

        if (boundaryRef.current) {
          boundaryRef.current.remove();
          boundaryRef.current = null;
        }

        if (!filteredFeatures.length) {
          setLoadState("empty");
          return;
        }

        const filteredCollection = {
          type: "FeatureCollection",
          features: filteredFeatures,
        };

        const layer = L.geoJSON(filteredCollection, {
          pointToLayer: (feature, latlng) => {
            const sourceName = feature?.properties?.NAME11;
            const displayName = sourceNameToDisplayName.get(sourceName) || sourceName;
            return L.circleMarker(latlng, buildMarkerStyle(selectedTaluk, displayName));
          },
          onEachFeature: (feature, featureLayer) => {
            const sourceName = feature?.properties?.NAME11;
            const displayName = sourceNameToDisplayName.get(sourceName) || sourceName;

            layerByNameRef.current.set(displayName, featureLayer);

            featureLayer.bindPopup(getPopupHtml(feature), {
              className: "maharashtra-taluk-popup",
            });

            featureLayer.on("click", () => {
              setSelectedTaluk(displayName);
              featureLayer.openPopup();

              if (mapRef.current && featureLayer.getLatLng) {
                mapRef.current.flyTo(featureLayer.getLatLng(), 8, {
                  animate: true,
                  duration: 0.75,
                });
              }
            });
          },
        });

        layer.addTo(mapRef.current);
        layerRef.current = layer;

        const bounds = boundaryRef.current?.getBounds?.() || layer.getBounds();
        if (bounds.isValid()) {
          mapRef.current.fitBounds(bounds, { padding: [24, 24], animate: true });
        }

        setLoadState("ready");
      } catch (error) {
        if (!cancelled) {
          setLoadState("error");
        }
      }
    }

    loadTalukPoints();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!layerRef.current) return;

    layerRef.current.eachLayer((featureLayer) => {
      const feature = featureLayer.feature;
      const sourceName = feature?.properties?.NAME11;
      const displayName = TALUKS.find((taluk) => resolveGeoJsonName(taluk) === sourceName) || sourceName;

      if (displayName && featureLayer.setStyle) {
        featureLayer.setStyle(buildMarkerStyle(selectedTaluk, displayName));
      }
    });
  }, [selectedTaluk]);

  function handleTalukChange(event) {
    const value = event.target.value;
    setSelectedTaluk(value);

    const selectedFeature = featureByNameRef.current.get(value);
    const selectedLayer = layerByNameRef.current.get(value);

    if (!selectedFeature || !selectedLayer || !mapRef.current) return;

    const latlng = selectedLayer.getLatLng?.();
    if (latlng) {
      mapRef.current.flyTo(latlng, 8, {
        animate: true,
        duration: 0.75,
      });
    }

    if (selectedLayer.openPopup) {
      selectedLayer.openPopup();
    }
  }

  return (
    <Card className="maharashtra-taluk-card page-fade" sx={{ overflow: "hidden" }}>
      <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
        <Typography variant="h6" fontWeight={700}>
          Maharashtra taluks
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Pick a taluk to highlight its HQ location on the map.
        </Typography>

        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
          <InputLabel id="taluk-select-label">Select taluk</InputLabel>
          <Select
            labelId="taluk-select-label"
            label="Select taluk"
            value={selectedTaluk}
            onChange={handleTalukChange}
          >
            <MenuItem value="">
              <em>None</em>
            </MenuItem>
            {talukOptions.map((taluk) => (
              <MenuItem key={taluk} value={taluk}>
                {taluk}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Box className="maharashtra-taluk-map">
          <Box ref={mapElRef} className="maharashtra-taluk-map__canvas" />

          {loadState !== "ready" && (
            <Box className="maharashtra-taluk-map__empty">
              <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                {loadState === "loading"
                  ? "Loading taluk coordinates..."
                  : "No matching taluk coordinates found."}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                This map uses the local GeoJSON points from Maharashtra Sub District Hq and zooms to the
                matching taluks only.
              </Typography>
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
