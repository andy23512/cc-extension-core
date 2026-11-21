import { useTheme } from "@mui/material/styles";
import { act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Root } from "react-dom/client";
import type { SiteConfig } from "../model/site-config.model.js";

vi.mock("../options/options.component.js", () => ({
  default: ({ config }: { config: SiteConfig }) => {
    const theme = useTheme();
    return (
      <div data-testid="options" data-mode={theme.palette.mode}>
        {config.siteName}
      </div>
    );
  },
}));

const { mountOptionsPage } = await import("./mount-options-page.js");

const config: SiteConfig = { id: "keybr", siteName: "Keybr", readNextText: () => null };
let root: Root | undefined;

beforeEach(() => {
  document.body.innerHTML = '<div id="root"></div>';
});

afterEach(async () => {
  await act(async () => root?.unmount());
  root = undefined;
});

describe("mountOptionsPage", () => {
  it("renders the options component into #root with the site's config", async () => {
    await act(async () => {
      root = mountOptionsPage(config);
    });
    const options = document.querySelector("#root [data-testid=options]");
    expect(options?.textContent).toBe("Keybr");
  });

  it("wraps it in a dark Material theme", async () => {
    await act(async () => {
      root = mountOptionsPage(config);
    });
    expect(document.querySelector("[data-testid=options]")?.getAttribute("data-mode")).toBe("dark");
  });

  it("returns the root, so the caller can unmount", async () => {
    await act(async () => {
      root = mountOptionsPage(config);
    });
    expect(typeof root!.unmount).toBe("function");
    await act(async () => root!.unmount());
    root = undefined;
    expect(document.querySelector("[data-testid=options]")).toBeNull();
  });

  it("fails clearly when the page has no #root element", () => {
    document.body.innerHTML = "";
    expect(() => mountOptionsPage(config)).toThrow();
  });
});
