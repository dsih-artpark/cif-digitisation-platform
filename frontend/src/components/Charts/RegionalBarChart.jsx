import { Card, CardContent, Typography } from "@mui/material";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

function RegionalBarChart({ data, highlightedState = "" }) {
  return (
    <Card sx={{ height: 320 }}>
      <CardContent>
        <Typography variant="subtitle1" fontWeight={700} mb={2}>
          Cases by State
        </Typography>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="state" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="cases">
              {data.map((entry) => (
                <Cell
                  key={entry.state}
                  fill={entry.state === highlightedState ? "#123c6b" : "#6f94bd"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export default RegionalBarChart;
