import { describe, expect, it } from "vitest";
import { getRootElementId, SiteConfig } from "./site-config.model.js";

describe("getRootElementId", () => {
  it("derives the container id from the extension slug", () => {
    const config: SiteConfig = {
      id: "keybr",
      siteName: "Keybr",
      readNextText: () => null,
    };
    expect(getRootElementId(config)).toBe("keybr-cc-extension-root");
  });

  it("keeps ids distinct across sites", () => {
    const ids = ["keybr", "monkeytype"].map((id) =>
      getRootElementId({ id, siteName: id, readNextText: () => null }),
    );
    expect(new Set(ids).size).toBe(ids.length);
  });
});
