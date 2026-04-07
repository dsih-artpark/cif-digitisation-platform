import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import {
  AppBar,
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { ROLE_ACCESS } from "../../config/roleAccess";

function Navbar({ activeRole, onSignOut }) {
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navItems = ROLE_ACCESS[activeRole]?.navItems ?? [];
  const roleLabel = ROLE_ACCESS[activeRole]?.label ?? "";

  return (
    <AppBar position="sticky" elevation={0} sx={{ bgcolor: "primary.dark" }}>
      <Toolbar
        sx={{
          minHeight: { xs: 60, md: 68 },
          display: "flex",
          gap: 1.5,
          justifyContent: "space-between",
          px: { xs: 1.5, sm: 2, md: 3 },
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
          <Typography
            variant="h6"
            sx={{
              mr: 0.5,
              fontSize: { xs: "1.05rem", md: "1.25rem" },
              lineHeight: 1.2,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            CIF Digitisation System
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: "rgba(255,255,255,0.82)",
              display: { xs: "none", sm: "block" },
            }}
          >
            {roleLabel}
          </Typography>
        </Box>
        {isMobile ? (
          <>
            <IconButton color="inherit" aria-label="open navigation" onClick={() => setDrawerOpen(true)}>
              <MenuRoundedIcon />
            </IconButton>
            <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
              <Box sx={{ width: 280 }}>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{ p: 1.5, bgcolor: "primary.dark", color: "white" }}
                >
                  <Box>
                    <Typography variant="subtitle2">Navigation</Typography>
                    <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.82)" }}>
                      {roleLabel}
                    </Typography>
                  </Box>
                  <IconButton size="small" sx={{ color: "white" }} onClick={() => setDrawerOpen(false)}>
                    <CloseRoundedIcon fontSize="small" />
                  </IconButton>
                </Stack>
                <List sx={{ py: 0.5 }}>
                  {navItems.map((item) => (
                    <ListItemButton
                      key={item.path}
                      component={NavLink}
                      to={item.path}
                      selected={location.pathname === item.path}
                      onClick={() => setDrawerOpen(false)}
                    >
                      <ListItemText primary={item.label} />
                    </ListItemButton>
                  ))}
                </List>
                <Divider />
                <Box sx={{ p: 1.5 }}>
                  <Button
                    startIcon={<LogoutRoundedIcon />}
                    variant="outlined"
                    fullWidth
                    onClick={() => {
                      onSignOut();
                      setDrawerOpen(false);
                    }}
                  >
                    Sign Out
                  </Button>
                </Box>
              </Box>
            </Drawer>
          </>
        ) : (
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, justifyContent: "flex-end" }}>
            {navItems.map((item) => (
              <Button
                key={item.path}
                component={NavLink}
                to={item.path}
                color="inherit"
                variant={location.pathname === item.path ? "outlined" : "text"}
                sx={{
                  borderColor: "rgba(255,255,255,0.4)",
                  color: "white",
                  borderRadius: 999,
                  "&:hover": { bgcolor: "rgba(255,255,255,0.12)" },
                }}
              >
                {item.label}
              </Button>
            ))}
            <Button
              startIcon={<LogoutRoundedIcon />}
              color="inherit"
              variant="outlined"
              onClick={onSignOut}
              sx={{
                borderColor: "rgba(255,255,255,0.4)",
                color: "white",
                borderRadius: 999,
                "&:hover": { bgcolor: "rgba(255,255,255,0.12)" },
              }}
            >
              Sign Out
            </Button>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
}

export default Navbar;
