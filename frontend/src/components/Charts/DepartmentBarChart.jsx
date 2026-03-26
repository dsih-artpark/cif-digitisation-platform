import { Card, CardContent, Typography } from "@mui/material";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

function DepartmentBarChart({ data, title = "Department Case Distribution" }) {
  return (
    <Card sx={{ height: 320 }}>
      <CardContent>
        <Typography variant="subtitle1" fontWeight={700} mb={2}>
          {title}
        </Typography>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="department" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="cases" fill="#275b90" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export default DepartmentBarChart;
