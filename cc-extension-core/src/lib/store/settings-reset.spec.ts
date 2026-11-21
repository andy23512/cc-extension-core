import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("webextension-polyfill", () => ({
  default: {
    storage: {
      local: { get: vi.fn(async (d: unknown) => d), set: vi.fn(async () => undefined), remove: vi.fn(async () => undefined) },
      onChanged: { addListener: vi.fn(), removeListener: vi.fn() },
    },
  },
}));

const { useSettingsStore } = await import("./settings-store.js");
const state = () => useSettingsStore.getState();

beforeEach(async () => {
  await useSettingsStore.persist.rehydrate();
});

describe("resetLayoutDisplay", () => {
  it("restores the 3D values under 3D and leaves the Lite ones", () => {
    useSettingsStore.setState({ layoutType: "3d", height: 400, liteHeight: 400 });
    state().resetLayoutDisplay();
    expect(state().height).toBe(250);
    expect(state().liteHeight).toBe(400);
  });

  it("restores the Lite values under Lite and leaves the 3D ones", () => {
    useSettingsStore.setState({ layoutType: "lite", height: 400, liteHeight: 400 });
    state().resetLayoutDisplay();
    expect(state().liteHeight).toBe(250);
    expect(state().height).toBe(400);
  });

  // KNOWN BUG, same root cause as the options page test: once `layoutType` has become null (the
  // exclusive toggle stores null on a second click), the reset takes the Lite branch and the 3D
  // values the page is drawing stay as they were. `it.fails` turns red once this is fixed.
  it.fails("still resets the 3D values when the layout type has been stored as null", () => {
    useSettingsStore.setState({ layoutType: null as never, height: 400, liteHeight: 400 });
    state().resetLayoutDisplay();
    expect(state().height).toBe(250);
  });
});
