import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#0d47a1",
    },
    secondary: {
      main: "#ff6f00",
    },
  },
  shape: {
    borderRadius: 8,
  },
  typography: {
    h5: {
      color: "#172033",
      fontWeight: 600,
    },
  },
});

export default theme;
