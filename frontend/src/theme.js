import { createTheme } from "@mui/material/styles";

export const appTheme = createTheme({
  palette: {
    primary: {
      main: "#123c6b",
      dark: "#0e2f53",
      light: "#dce8f4",
    },
    secondary: {
      main: "#5f728c",
    },
    background: {
      default: "#f3f5f7",
      paper: "#ffffff",
    },
    text: {
      primary: "#1b2a3a",
      secondary: "#5d6b7a",
    },
  },
  typography: {
    fontFamily: '"Segoe UI", "Noto Sans", "Arial", sans-serif',
    h4: {
      fontWeight: 700,
    },
    h5: {
      fontWeight: 700,
    },
    h6: {
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          border: "1px solid #d7dee6",
          boxShadow: "0 2px 4px rgba(15, 47, 83, 0.08)",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 600,
        },
      },
    },
  },
});
