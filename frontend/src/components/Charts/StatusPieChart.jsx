import { Card, CardContent, Typography } from "@mui/material";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = ["#2e7d32", "#ed6c02", "#0288d1"];

function StatusPieChart({ data, title = "Case Status Breakdown" }) {
  return (
    <Card sx={{ height: 320 }}>
      <CardContent>
        <Typography variant="subtitle1" fontWeight={700} mb={2}>
          {title}
        </Typography>
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="status" innerRadius={45} outerRadius={80}>
              {data.map((entry) => (
                <Cell key={entry.status} fill={COLORS[data.indexOf(entry) % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export default StatusPieChart;
