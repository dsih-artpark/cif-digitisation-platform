import { Card, CardContent, Typography } from "@mui/material";

function StatCard({ title, value }) {
  return (
    <Card sx={{ height: "100%" }}>
      <CardContent>
        <Typography variant="body2" color="text.secondary">
          {title}
        </Typography>
        <Typography variant="h5" mt={1}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
}

export default StatCard;
