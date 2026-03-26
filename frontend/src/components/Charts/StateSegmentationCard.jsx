import { Card, CardContent, LinearProgress, Stack, Typography } from "@mui/material";

function StateSegmentationCard({ title, segments = [] }) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0) || 1;

  return (
    <Card sx={{ height: 320 }}>
      <CardContent>
        <Typography variant="subtitle1" fontWeight={700} mb={2}>
          {title}
        </Typography>
        <Stack spacing={1.4}>
          {segments.map((segment) => {
            const pct = Math.round((segment.value / total) * 100);
            return (
              <Stack key={segment.label} spacing={0.5}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2">{segment.label}</Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {segment.value}
                  </Typography>
                </Stack>
                <LinearProgress variant="determinate" value={pct} sx={{ height: 7, borderRadius: 7 }} />
              </Stack>
            );
          })}
        </Stack>
      </CardContent>
    </Card>
  );
}

export default StateSegmentationCard;
