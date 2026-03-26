import { Box, Button, Card, CardContent, Stack, Typography } from "@mui/material";
import BackButton from "../../components/BackButton/BackButton";
import { useCif } from "../../context/CifContext";

function Reports() {
  const { uploadedDocuments, clearUploadedDocuments } = useCif();

  return (
    <Stack spacing={2.5}>
      <BackButton fallbackPath="/dashboard" />
      <Box>
        <Typography variant="h5">Reports</Typography>
      </Box>
      <Card>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={700}>
            CIF Reporting Module
          </Typography>
          <Typography color="text.secondary">
            Monthly and district-level downloadable reporting views can be configured in this section.
          </Typography>
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} justifyContent="space-between">
            <Typography variant="subtitle1" fontWeight={700}>
              Uploaded Documents
            </Typography>
            <Button
              variant="text"
              color="error"
              size="small"
              disabled={uploadedDocuments.length === 0}
              onClick={clearUploadedDocuments}
              sx={{ alignSelf: { xs: "flex-start", sm: "center" } }}
            >
              Clear All
            </Button>
          </Stack>

          {uploadedDocuments.length > 0 && (
            <Stack mt={2} spacing={1}>
              {uploadedDocuments.map((item) => (
                <Typography key={item.id} fontWeight={600} sx={{ wordBreak: "break-word" }}>
                  {item.fileName}
                </Typography>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
}

export default Reports;
