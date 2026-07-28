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

const mockedBrowser = vi.mocked(
  (await import("webextension-polyfill")).default,
);
const {
  browserLocalSettingsStorage,
  selectLayoutDependentSetting,
  useSettingsStore,
} = await import("./settings-store.js");

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
  it("resets only the Lite display settings under the Lite layout type", () => {
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

  it("resets only the 3D display settings under the 3D layout type", () => {
    useSettingsStore.setState({
      layoutType: "3d",
      height: 400,
      opacity: 0.3,
      liteHeight: 400,
      liteOpacity: 0.3,
    });

    useSettingsStore.getState().resetLayoutDisplay();

    expect(useSettingsStore.getState().height).toBe(250);
    expect(useSettingsStore.getState().opacity).toBe(1);
    // The Lite values are left alone.
    expect(useSettingsStore.getState().liteHeight).toBe(400);
    expect(useSettingsStore.getState().liteOpacity).toBe(0.3);
  });
});

describe("browserLocalSettingsStorage", () => {
  const browser = mockedBrowser;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reads settings back merged over the defaults", async () => {
    const result = await browserLocalSettingsStorage.getItem("settings");
    // getItem asks storage.local.get with the full defaults as the shape, so
    // every setting is present even on a fresh install.
    expect(browser.storage.local.get).toHaveBeenCalledWith(
      expect.objectContaining({ layoutType: "3d", layout: "cc1" }),
    );
    expect(result?.state).toMatchObject({ layoutType: "3d", layout: "cc1" });
  });

  it("writes settings as flat top-level keys", async () => {
    await browserLocalSettingsStorage.setItem("settings", {
      version: 0,
      state: { layout: "m4g", showThumb3Switch: false },
    } as never);
    const written = vi.mocked(browser.storage.local.set).mock.calls[0][0];
    // Not nested under a "settings" key — each setting is its own key.
    expect(written).toMatchObject({ layout: "m4g", showThumb3Switch: false });
    expect(written).not.toHaveProperty("settings");
  });

  it("removes the stored settings by name", async () => {
    await browserLocalSettingsStorage.removeItem("settings");
    expect(browser.storage.local.remove).toHaveBeenCalledWith("settings");
  });
});
