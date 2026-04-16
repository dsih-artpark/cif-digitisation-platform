import {
  Chip,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";

function statusColor(status) {
  if (status === "Verified") return "success";
  if (status === "Review Required") return "warning";
  return "info";
}

function normalizeAgeEditorValue(value) {
  const text = String(value ?? "").trim();
  if (!text) return "";

  const withUnitMatch = text.match(
    /\b(?<number>\d{1,3}(?:\.\d+)?)\s*(?<unit>years?|year|yrs?|yr|months?|month|mos?|mths?|mth|mo)\b/i
  );
  const agePrefixMatch = text.match(
    /^\s*age\s*[:=-]?\s*(?<number>\d{1,3}(?:\.\d+)?)\s*(?<unit>years?|year|yrs?|yr|months?|month|mos?|mths?|mth|mo)?\s*$/i
  );
  const bareMatch = text.match(/^\s*(?<number>\d{1,3}(?:\.\d+)?)\s*$/);
  const match = withUnitMatch || agePrefixMatch || bareMatch;
  if (!match) return text;

  const numberText = match.groups?.number || match[1];
  const numericValue = Number(numberText);
  if (!Number.isFinite(numericValue) || numericValue < 0) return text;

  const formattedNumber = numberText.includes(".")
    ? numberText.replace(/\.0+$/, "").replace(/\.$/, "")
    : String(Math.trunc(numericValue));
  const unit = (match.groups?.unit || "").toLowerCase();
  const isMonthUnit = /month|mo|mth/.test(unit);
  const unitLabel = isMonthUnit
    ? numericValue === 1
      ? "month"
      : "months"
    : numericValue === 1
      ? "year"
      : "years";

  return `${formattedNumber} ${unitLabel}`;
}

function toDateInputValue(value) {
  const text = String(value ?? "").trim();
  if (!text || text === "N/A") return "";

  const dashMatch = text.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (dashMatch) {
    return `${dashMatch[3]}-${dashMatch[2]}-${dashMatch[1]}`;
  }

  const slashMatch = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (slashMatch) {
    return `${slashMatch[3]}-${slashMatch[2]}-${slashMatch[1]}`;
  }

  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return text;
  }

  return "";
}

function fromDateInputValue(value, separator = "-") {
  const text = String(value ?? "").trim();
  if (!text) return "N/A";

  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!isoMatch) return text;
  return `${isoMatch[3]}${separator}${isoMatch[2]}${separator}${isoMatch[1]}`;
}

function renderFieldEditor(row, onValueChange) {
  const displayValue =
    row.editorType === "select" || row.editorType === "date"
      ? row.value === "N/A"
        ? ""
        : row.editorType === "date"
          ? toDateInputValue(row.value)
          : row.value ?? ""
      : row.value ?? "";

  const commonProps = {
    fullWidth: true,
    size: "small",
    value: displayValue,
    onChange: (event) => onValueChange(row.key, event.target.value),
  };

  if (row.editorType === "select") {
    return (
      <TextField {...commonProps} select SelectProps={{ displayEmpty: true }}>
        <MenuItem value="" disabled>
          {row.placeholder || "Select value"}
        </MenuItem>
        {(row.options || []).map((option) => (
          <MenuItem key={option} value={option}>
            {option}
          </MenuItem>
        ))}
      </TextField>
    );
  }

  if (row.editorType === "date") {
    return (
      <TextField
        {...commonProps}
        type="date"
        InputLabelProps={{ shrink: true }}
        placeholder="DD-MM-YYYY"
        onChange={(event) =>
          onValueChange(row.key, fromDateInputValue(event.target.value, row.dateFormat === "slash" ? "/" : "-"))
        }
      />
    );
  }

  return (
    <TextField
      {...commonProps}
      multiline={Boolean(row.multiline)}
      minRows={row.multiline ? 3 : undefined}
      inputProps={row.editorType === "age" ? { inputMode: "text" } : undefined}
      onBlur={
        row.editorType === "age"
          ? (event) => {
              const normalizedValue = normalizeAgeEditorValue(event.target.value);
              if (normalizedValue !== row.value) {
                onValueChange(row.key, normalizedValue);
              }
            }
          : undefined
      }
    />
  );
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
            {renderFieldEditor(row, onValueChange)}
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
              <TableCell>{renderFieldEditor(row, onValueChange)}</TableCell>
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
