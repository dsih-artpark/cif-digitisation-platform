import { Card, CardContent, Typography } from "@mui/material";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

function WeeklyCaseTrendChart({ data, title = "Weekly Case Trend" }) {
  return (
    <Card sx={{ height: 320 }}>
      <CardContent>
        <Typography variant="subtitle1" fontWeight={700} mb={2}>
          {title}
        </Typography>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="week" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="cases" stroke="#123c6b" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export default WeeklyCaseTrendChart;
