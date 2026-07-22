import React from "react";
import ReactDOM from "react-dom/client";
import AppComponent from "../component/app.component.js";
import { getRootElementId, SiteConfig } from "../model/site-config.model.js";

/**
 * Injects the layout overlay into the host page.
 *
 * The container spans the viewport and ignores pointer events, so the page
 * underneath stays fully usable; only the overlay itself opts back in while
 * edit mode is on.
 */
export function mountContentScript(config: SiteConfig) {
  const containerElement = document.createElement("div");
  containerElement.id = getRootElementId(config);
  containerElement.style.position = "fixed";
  containerElement.style.width = "100%";
  containerElement.style.height = "100vh";
  containerElement.style.zIndex = "1000";
  containerElement.style.top = "0px";
  containerElement.style.pointerEvents = "none";
  document.body.appendChild(containerElement);

  const root = ReactDOM.createRoot(containerElement);
  root.render(
    <React.StrictMode>
      <AppComponent
        containerElement={containerElement}
        readNextText={config.readNextText}
      />
    </React.StrictMode>,
  );

  return root;
}
