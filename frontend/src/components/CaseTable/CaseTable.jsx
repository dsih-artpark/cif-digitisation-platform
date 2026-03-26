import { Chip, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography, useMediaQuery, useTheme } from "@mui/material";

function statusColor(status) {
  if (status === "Verified") return "success";
  if (status === "Review Required") return "warning";
  return "info";
}

function CaseTable({ rows, onValueChange }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  if (isMobile) {
    return (
      <Stack spacing={1.2}>
        {rows.map((row) => (
          <Paper key={row.key} sx={{ p: 1.2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="subtitle2">{row.label}</Typography>
              <Chip label={row.status} color={statusColor(row.status)} size="small" />
            </Stack>
            <TextField
              fullWidth
              size="small"
              value={row.value}
              multiline={Boolean(row.multiline)}
              minRows={row.multiline ? 3 : undefined}
              onChange={(event) => onValueChange(row.key, event.target.value)}
            />
          </Paper>
        ))}
      </Stack>
    );
  }

  return (
    <TableContainer component={Paper}>
      <Table sx={{ minWidth: 720 }}>
        <TableHead>
          <TableRow sx={{ bgcolor: "#eef3f9" }}>
            <TableCell sx={{ fontWeight: 700 }}>Field</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Value</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.key} hover>
              <TableCell sx={{ width: "25%" }}>{row.label}</TableCell>
              <TableCell>
                <TextField
                  fullWidth
                  size="small"
                  value={row.value}
                  multiline={Boolean(row.multiline)}
                  minRows={row.multiline ? 3 : undefined}
                  onChange={(event) => onValueChange(row.key, event.target.value)}
                />
              </TableCell>
              <TableCell sx={{ width: "20%" }}>
                <Chip label={row.status} color={statusColor(row.status)} size="small" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export default CaseTable;
