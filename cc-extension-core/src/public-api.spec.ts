import { describe, expect, it, vi } from "vitest";

vi.mock("webextension-polyfill", () => ({
  default: {
    storage: {
      local: { get: vi.fn(async (d: unknown) => d), set: vi.fn(), remove: vi.fn() },
      onChanged: { addListener: vi.fn(), removeListener: vi.fn() },
    },
    action: { onClicked: { addListener: vi.fn() } },
    runtime: { openOptionsPage: vi.fn() },
  },
}));

const api = await import("./index.js");
const background = await import("./background.js");

describe("public API (src/index.ts)", () => {
  it("exports exactly the documented names, each one defined", () => {
    expect(Object.keys(api).sort()).toEqual(
      [
        "AppComponent",
        "CCLiteLayoutComponent",
        "HIGHLIGHT_SETTING",
        "ICONS",
        "KEYBOARD_LAYOUTS",
        "LITE_ASPECT_RATIO",
        "LITE_PRESET_DEVICE_LAYOUTS",
        "LayoutComponent",
        "LayoutContainerComponent",
        "LogoComponent",
        "OVERLAY_MARGIN",
        "OptionsComponent",
        "PRESET_DEVICE_LAYOUTS",
        "SwitchComponent",
        "findDeviceLayoutForExport",
        "generateCCLiteKeyboard",
        "getHighlightKeyCombinationFromText",
        "getRootElementId",
        "getViewBoxAspectRatio",
        "getViewBoxHeight",
        "mountContentScript",
        "mountOptionsPage",
        "nextOpacityForWheel",
        "normalizeText",
        "normalizedAxisPosition",
        "parseDeviceLayoutFromBackup",
        "pixelAxisPosition",
        "registerBackground",
        "upsertDeviceLayout",
        "useSettingsStore",
      ].sort(),
    );
    for (const [name, value] of Object.entries(api)) expect(value, name).toBeDefined();
  });

  it("offers the three entry points an extension normally needs as functions", () => {
    for (const name of ["mountContentScript", "mountOptionsPage", "registerBackground"] as const) {
      expect(typeof api[name]).toBe("function");
    }
  });
});

describe("background entry (src/background.ts)", () => {
  it("exports only registerBackground, the same function the main entry has", () => {
    expect(Object.keys(background)).toEqual(["registerBackground"]);
    expect(background.registerBackground).toBe(api.registerBackground);
  });
});
