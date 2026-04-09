import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import { Box, Card, CardContent, Stack, Typography } from "@mui/material";

function DocumentCompare({ uploadedFile, previewUrl }) {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" mb={2}>
          Original Document
        </Typography>
        <Box
          sx={{
            border: "1px solid #d8e0ea",
            borderRadius: 1,
            p: 1,
            bgcolor: "#fafbfd",
            minHeight: { xs: 260, sm: 360 },
          }}
        >
          {uploadedFile?.type?.startsWith("image/") && previewUrl && (
            <Box
              component="img"
              src={previewUrl}
              alt="Original uploaded CIF"
              sx={{ width: "100%", maxHeight: { xs: 300, sm: 540 }, objectFit: "contain", borderRadius: 1 }}
            />
          )}
          {uploadedFile?.type === "application/pdf" && previewUrl && (
            <Box
              component="iframe"
              src={previewUrl}
              title="Original CIF PDF"
              sx={{ width: "100%", height: { xs: 300, sm: 560 }, border: 0, borderRadius: 1 }}
            />
          )}
          {!previewUrl && (
            <Stack alignItems="center" justifyContent="center" sx={{ height: { xs: 220, sm: 320 } }}>
              <DescriptionRoundedIcon color="disabled" sx={{ fontSize: 40 }} />
              <Typography color="text.secondary">No document preview available</Typography>
            </Stack>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}

export default DocumentCompare;
