import { useMemo, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import BackButton from "../../components/BackButton/BackButton";
import RegionalBarChart from "../../components/Charts/RegionalBarChart";
import RegionalLineChart from "../../components/Charts/RegionalLineChart";
import StatCard from "../../components/Charts/StatCard";
import StateSegmentationCard from "../../components/Charts/StateSegmentationCard";
import StatusPieChart from "../../components/Charts/StatusPieChart";
import WeeklyCaseTrendChart from "../../components/Charts/WeeklyCaseTrendChart";
import IndiaMap from "../../components/IndiaMap/IndiaMap";
import { DEMO_ROLES } from "../../config/roleAccess";
import { useCif } from "../../context/CifContext";
import {
  gadchiroliTalukaCases,
  nationalSegments,
  regionalTrend,
  statusBreakdown,
  stateProfiles,
  summaryStats,
  weeklyCaseTrend,
} from "../../data/mockData";

function Dashboard({ activeRole }) {
  const navigate = useNavigate();
  const { uploadedDocuments, clearUploadedDocuments } = useCif();
  const [selectedStateName, setSelectedStateName] = useState("Maharashtra");
  const isAnalyticsRole = activeRole === DEMO_ROLES.ADMIN;
  const recentUploads = useMemo(() => uploadedDocuments.slice(0, 5), [uploadedDocuments]);

  const regionOptions = useMemo(
    () => [
      { label: "Gadchiroli", value: "Maharashtra", disabled: false },
      { label: "Nagpur", value: "Nagpur", disabled: true },
      { label: "Chandrapur", value: "Chandrapur", disabled: true },
      { label: "Nashik", value: "Nashik", disabled: true },
    ],
    []
  );

  const activeStateProfile = selectedStateName ? stateProfiles[selectedStateName] : null;
  const selectedRegionLabel =
    regionOptions.find((item) => item.value === selectedStateName)?.label || "Gadchiroli";

  const statCards = useMemo(() => {
    if (!activeStateProfile) return summaryStats;
    return [
      { title: "Total Cases", value: activeStateProfile.totalCases },
      { title: "Follow-up Cases", value: activeStateProfile.followUpCases },
      { title: "New Cases This Week", value: activeStateProfile.newCasesThisWeek },
      { title: "Verified Records", value: activeStateProfile.verifiedRecords },
    ];
  }, [activeStateProfile]);

  const trendData = activeStateProfile ? activeStateProfile.weeklyTrend : weeklyCaseTrend;
  const statusData = activeStateProfile ? activeStateProfile.statusBreakdown : statusBreakdown;
  const segmentData = activeStateProfile ? activeStateProfile.segments : nationalSegments;

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5">Public Health Case Dashboard</Typography>
        <Typography color="text.secondary">
          Government case investigation digitisation analytics overview.
        </Typography>
      </Box>

      <Card>
        <CardContent>
          <FormControl size="small" sx={{ minWidth: { xs: "100%", md: 320 } }}>
            <InputLabel id="state-select-label">Region</InputLabel>
            <Select
              labelId="state-select-label"
              label="Region"
              value={selectedStateName}
              onChange={(event) => setSelectedStateName(event.target.value)}
            >
              {regionOptions.map((region) => (
                <MenuItem
                  key={region.value}
                  value={region.value}
                  disabled={region.disabled}
                  sx={
                    region.disabled
                      ? { color: "text.disabled", bgcolor: "action.disabledBackground" }
                      : undefined
                  }
                >
                  {region.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </CardContent>
      </Card>

      <Grid container spacing={2}>
        {statCards.map((item) => (
          <Grid key={item.title} item xs={12} sm={6} md={3}>
            <StatCard title={item.title} value={item.value} />
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <WeeklyCaseTrendChart
            data={trendData}
            title={selectedStateName ? `${selectedRegionLabel} Weekly Trend` : "Weekly Case Trend"}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <StatusPieChart
            data={statusData}
            title={selectedStateName ? `${selectedRegionLabel} Status Breakdown` : "Case Status Breakdown"}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <StateSegmentationCard
            title={selectedStateName ? `${selectedRegionLabel} Segmentation` : "National Segmentation"}
            segments={segmentData}
          />
        </Grid>
      </Grid>

      <Box>
        <Typography variant="h6" mb={1}>
          Regional Trend Analysis - Gadchiroli Talukas
        </Typography>
      </Box>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <RegionalBarChart data={gadchiroliTalukaCases} title="Cases by Taluka" dataKey="taluka" />
        </Grid>
        <Grid item xs={12} md={6}>
          <RegionalLineChart data={regionalTrend} />
        </Grid>
      </Grid>

      {isAnalyticsRole && (
        <Card>
          <CardContent>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} justifyContent="space-between">
              <Box>
                <Typography variant="h6">Recent Uploads</Typography>
              </Box>
              <Stack direction="row" spacing={1} sx={{ alignSelf: { xs: "flex-start", sm: "center" } }}>
                <Button variant="outlined" size="small" onClick={() => navigate("/results")}>
                  View More
                </Button>
                <Button
                  variant="text"
                  color="error"
                  size="small"
                  disabled={uploadedDocuments.length === 0}
                  onClick={clearUploadedDocuments}
                >
                  Clear All
                </Button>
              </Stack>
            </Stack>

            {recentUploads.length > 0 && (
              <Stack mt={2} spacing={1}>
                {recentUploads.map((item) => (
                  <Typography key={item.id} fontWeight={600} sx={{ wordBreak: "break-word" }}>
                    {item.fileName}
                  </Typography>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>
      )}

      <IndiaMap />
      <BackButton fallbackPath="/" />
    </Stack>
  );
}

export default Dashboard;
