import { CssBaseline } from "@mui/material";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import React from "react";
import { createRoot } from "react-dom/client";
import { SiteConfig } from "../model/site-config.model.js";
import OptionsComponent from "../options/options.component.js";

const darkTheme = createTheme({
  palette: {
    mode: "dark",
  },
});

/** Renders the extension's options page into `#root`. */
export function mountOptionsPage(config: SiteConfig) {
  const root = createRoot(document.getElementById("root")!);

  root.render(
    <React.StrictMode>
      <ThemeProvider theme={darkTheme}>
        <CssBaseline />
        <OptionsComponent config={config} />
      </ThemeProvider>
    </React.StrictMode>,
  );

  return root;
}
