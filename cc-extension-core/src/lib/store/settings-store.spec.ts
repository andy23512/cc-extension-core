import { beforeEach, describe, expect, it, vi } from "vitest";

// The store reaches for extension APIs at import time, so stub them first.
vi.mock("webextension-polyfill", () => ({
  default: {
    storage: {
      local: {
        get: vi.fn(async (defaults: unknown) => defaults),
        set: vi.fn(async () => undefined),
        remove: vi.fn(async () => undefined),
      },
      onChanged: { addListener: vi.fn(), removeListener: vi.fn() },
    },
  },
}));

const { selectLayoutDependentSetting, useSettingsStore } = await import(
  "./settings-store.js"
);

describe("selectLayoutDependentSetting", () => {
  it("reads the plain setting under the 3D layout", () => {
    const state = { layoutType: "3d", height: 250, liteHeight: 90 } as never;
    expect(selectLayoutDependentSetting("height")(state)).toBe(250);
  });

  it("reads the lite variant under the Lite layout", () => {
    const state = { layoutType: "lite", height: 250, liteHeight: 90 } as never;
    expect(selectLayoutDependentSetting("height")(state)).toBe(90);
  });

  it("falls back to the plain setting for keys with no lite variant", () => {
    const state = {
      layoutType: "lite",
      showThumb3Switch: true,
    } as never;
    // `showThumb3Switch` is shared across layout types.
    expect(
      selectLayoutDependentSetting("showThumb3Switch" as never)(state),
    ).toBe(true);
  });
});

describe("useSettingsStore.set", () => {
  beforeEach(() => {
    useSettingsStore.setState({
      layoutType: "3d",
      height: 250,
      liteHeight: 250,
    });
  });

  it("writes the plain setting under the 3D layout", () => {
    useSettingsStore.getState().set("height", 300);
    expect(useSettingsStore.getState().height).toBe(300);
    expect(useSettingsStore.getState().liteHeight).toBe(250);
  });

  it("redirects the write to the lite variant under the Lite layout", () => {
    useSettingsStore.setState({ layoutType: "lite" });
    useSettingsStore.getState().set("height", 120);
    expect(useSettingsStore.getState().liteHeight).toBe(120);
    expect(useSettingsStore.getState().height).toBe(250);
  });

  it("keeps shared settings on one key regardless of layout type", () => {
    useSettingsStore.setState({ layoutType: "lite" });
    useSettingsStore.getState().set("highlightKeysEnabled", false);
    expect(useSettingsStore.getState().highlightKeysEnabled).toBe(false);
  });
});

describe("useSettingsStore.resetLayoutDisplay", () => {
  it("resets only the active layout type's display settings", () => {
    useSettingsStore.setState({
      layoutType: "lite",
      height: 400,
      opacity: 0.3,
      liteHeight: 400,
      liteOpacity: 0.3,
    });

    useSettingsStore.getState().resetLayoutDisplay();

    expect(useSettingsStore.getState().liteHeight).toBe(250);
    expect(useSettingsStore.getState().liteOpacity).toBe(1);
    // The 3D values are left alone.
    expect(useSettingsStore.getState().height).toBe(400);
    expect(useSettingsStore.getState().opacity).toBe(0.3);
  });
});
