import { act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Root } from "react-dom/client";
import type { SiteConfig } from "../model/site-config.model.js";

const appProps = vi.hoisted(() => ({ calls: [] as Record<string, unknown>[] }));
vi.mock("../component/app.component.js", () => ({
  default: (props: Record<string, unknown>) => {
    appProps.calls.push(props);
    return <div data-testid="app" />;
  },
}));

const { mountContentScript } = await import("./mount-content-script.js");

const config = (over: Partial<SiteConfig> = {}): SiteConfig => ({
  id: "keybr",
  siteName: "Keybr",
  readNextText: () => "abc",
  ...over,
});

const roots: Root[] = [];
async function mount(c: SiteConfig) {
  let root!: Root;
  await act(async () => {
    root = mountContentScript(c);
  });
  roots.push(root);
  return root;
}

beforeEach(() => {
  document.body.replaceChildren();
  appProps.calls.length = 0;
});

afterEach(async () => {
  await act(async () => roots.splice(0).forEach((r) => r.unmount()));
});

describe("mountContentScript", () => {
  it("adds one container to the page body, named after the extension", async () => {
    await mount(config());
    const containers = document.body.children;
    expect(containers).toHaveLength(1);
    expect(containers[0].tagName).toBe("DIV");
    expect(containers[0].id).toBe("keybr-cc-extension-root");
  });

  it("makes the container a full-viewport layer that lets clicks through to the page", async () => {
    await mount(config());
    const style = (document.getElementById("keybr-cc-extension-root") as HTMLElement).style;
    expect(style.position).toBe("fixed");
    expect(style.width).toBe("100%");
    expect(style.height).toBe("100vh");
    expect(style.zIndex).toBe("1000");
    expect(style.top).toBe("0px");
    expect(style.pointerEvents).toBe("none");
  });

  it("renders the app inside that container", async () => {
    await mount(config());
    expect(document.querySelector("#keybr-cc-extension-root [data-testid=app]")).not.toBeNull();
  });

  it("hands the app its container and the site's reader", async () => {
    const readNextText = () => "next";
    await mount(config({ readNextText }));
    const props = appProps.calls.at(-1)!;
    expect(props.containerElement).toBe(document.getElementById("keybr-cc-extension-root"));
    expect(props.readNextText).toBe(readNextText);
  });

  it("highlights at half opacity unless the site says otherwise", async () => {
    await mount(config());
    expect(appProps.calls.at(-1)!.highlightOpacity).toBe(0.5);
  });

  it("uses the site's opacity, including 0 (a site that wants no highlight is not overridden)", async () => {
    await mount(config({ id: "a", highlightOpacity: 0.2 }));
    expect(appProps.calls.at(-1)!.highlightOpacity).toBe(0.2);
    await mount(config({ id: "b", highlightOpacity: 0 }));
    expect(appProps.calls.at(-1)!.highlightOpacity).toBe(0);
  });

  it("returns the React root, so the caller can unmount the overlay", async () => {
    const root = await mount(config());
    expect(typeof root.unmount).toBe("function");
    await act(async () => root.unmount());
    expect(document.querySelector("[data-testid=app]")).toBeNull();
  });

  it("gives different sites different containers", async () => {
    await mount(config({ id: "keybr" }));
    await mount(config({ id: "monkeytype" }));
    expect([...document.body.children].map((c) => c.id)).toEqual([
      "keybr-cc-extension-root",
      "monkeytype-cc-extension-root",
    ]);
  });
});
