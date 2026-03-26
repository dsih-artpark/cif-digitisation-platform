import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import { Button } from "@mui/material";
import { useNavigate } from "react-router-dom";

function BackButton({ fallbackPath = "/", label = "Back" }) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate(fallbackPath);
  };

  return (
    <Button
      size="small"
      startIcon={<ArrowBackRoundedIcon />}
      onClick={handleBack}
      sx={{ alignSelf: "flex-start", mb: 0.8 }}
    >
      {label}
    </Button>
  );
}

export default BackButton;
