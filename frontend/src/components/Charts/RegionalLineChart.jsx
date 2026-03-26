import { Card, CardContent, Typography } from "@mui/material";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

function RegionalLineChart({ data }) {
  return (
    <Card sx={{ height: 320 }}>
      <CardContent>
        <Typography variant="subtitle1" fontWeight={700} mb={2}>
          Weekly Trend by Region
        </Typography>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="week" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="north" stroke="#123c6b" strokeWidth={2} />
            <Line type="monotone" dataKey="south" stroke="#2e7d32" strokeWidth={2} />
            <Line type="monotone" dataKey="east" stroke="#ed6c02" strokeWidth={2} />
            <Line type="monotone" dataKey="west" stroke="#6d4c9f" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export default RegionalLineChart;
