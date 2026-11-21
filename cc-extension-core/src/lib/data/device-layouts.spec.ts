import { describe, expect, it } from "vitest";
import {
  CC1_DEFAULT_DEVICE_LAYOUT,
  CC1_LEFT_HAND_ONLY_DEVICE_LAYOUT,
  CC1_RIGHT_HAND_ONLY_DEVICE_LAYOUT,
  CCLITE_DEFAULT_DEVICE_LAYOUT,
  LITE_PRESET_DEVICE_LAYOUTS,
  M4G_DEFAULT_DEVICE_LAYOUT,
  PRESET_DEVICE_LAYOUTS,
} from "./device-layouts.js";

describe("preset device layouts", () => {
  it("lists the 3D presets in the order the options page shows them", () => {
    expect(PRESET_DEVICE_LAYOUTS.map((l) => [l.id, l.name])).toEqual([
      ["cc1", "CC1/CC2/CCU Default"],
      ["m4g", "M4G Default"],
      ["cc1-left-hand-only", "CC1/CC2/CCU Left Hand Only"],
      ["cc1-right-hand-only", "CC1/CC2/CCU Right Hand Only"],
    ]);
    expect(PRESET_DEVICE_LAYOUTS).toEqual([
      CC1_DEFAULT_DEVICE_LAYOUT,
      M4G_DEFAULT_DEVICE_LAYOUT,
      CC1_LEFT_HAND_ONLY_DEVICE_LAYOUT,
      CC1_RIGHT_HAND_ONLY_DEVICE_LAYOUT,
    ]);
  });

  it("lists the Lite preset on its own", () => {
    expect(LITE_PRESET_DEVICE_LAYOUTS).toEqual([CCLITE_DEFAULT_DEVICE_LAYOUT]);
    expect(CCLITE_DEFAULT_DEVICE_LAYOUT.id).toBe("cclite");
    expect(CCLITE_DEFAULT_DEVICE_LAYOUT.name).toBe("CCLite Default");
  });

  it("has unique ids across both lists (settings store a layout by id)", () => {
    const ids = [...PRESET_DEVICE_LAYOUTS, ...LITE_PRESET_DEVICE_LAYOUTS].map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("carries an actual layout in each preset, and the presets differ from each other", () => {
    const layouts = [...PRESET_DEVICE_LAYOUTS, ...LITE_PRESET_DEVICE_LAYOUTS].map((l) => {
      expect(l.layout).toBeTruthy();
      expect(Object.keys(l).sort()).toEqual(["id", "layout", "name"]);
      return JSON.stringify(l.layout);
    });
    expect(new Set(layouts).size).toBe(layouts.length);
  });

  it("uses the ids the options page offers in its layout menus", () => {
    expect(PRESET_DEVICE_LAYOUTS.map((l) => l.id)).toEqual(["cc1", "m4g", "cc1-left-hand-only", "cc1-right-hand-only"]);
    expect(LITE_PRESET_DEVICE_LAYOUTS.map((l) => l.id)).toEqual(["cclite"]);
  });
});
