import { DeviceLayout } from "tangent-cc-lib";
import { describe, expect, it } from "vitest";
import {
  LITE_PRESET_DEVICE_LAYOUTS,
  PRESET_DEVICE_LAYOUTS,
} from "../data/device-layouts.js";
import {
  findDeviceLayoutForExport,
  parseDeviceLayoutFromBackup,
  upsertDeviceLayout,
} from "./device-layout-import.util.js";

// The layout payload is an opaque grid to this code; a marker string is enough
// to assert the right entry was picked.
const layout = (marker: string) => marker as unknown as DeviceLayout["layout"];

function historyBackup(
  entries: { type: string; device: string; layout: unknown }[],
) {
  return { history: [entries] };
}

describe("parseDeviceLayoutFromBackup", () => {
  it("returns null for empty data", () => {
    expect(parseDeviceLayoutFromBackup(null, "f.json", false)).toBeNull();
    expect(parseDeviceLayoutFromBackup(undefined, "f.json", false)).toBeNull();
  });

  it("reads a directly-exported layout object", () => {
    const result = parseDeviceLayoutFromBackup(
      { layout: layout("direct") },
      "my-export.json",
      false,
    );
    expect(result).toEqual({
      id: "my-export.json",
      name: "my-export.json",
      layout: "direct",
    });
  });

  it("names the imported layout after the file", () => {
    const result = parseDeviceLayoutFromBackup(
      { layout: layout("x") },
      "backup-2026.json",
      false,
    );
    expect(result?.id).toBe("backup-2026.json");
    expect(result?.name).toBe("backup-2026.json");
  });

  describe("history backup", () => {
    const backup = historyBackup([
      { type: "chords", device: "ONE", layout: layout("wrong-type") },
      { type: "layout", device: "LITE", layout: layout("lite-layout") },
      { type: "layout", device: "TWO", layout: layout("3d-layout") },
    ]);

    it("picks a 3D-device layout under the 3D layout type", () => {
      const result = parseDeviceLayoutFromBackup(backup, "f.json", false);
      expect(result?.layout).toBe("3d-layout");
    });

    it("picks the Lite layout under the Lite layout type", () => {
      const result = parseDeviceLayoutFromBackup(backup, "f.json", true);
      expect(result?.layout).toBe("lite-layout");
    });

    it("ignores entries whose type is not 'layout'", () => {
      const onlyChords = historyBackup([
        { type: "chords", device: "ONE", layout: layout("nope") },
      ]);
      expect(parseDeviceLayoutFromBackup(onlyChords, "f.json", false)).toBeNull();
    });

    it("returns null when no entry matches the layout type's devices", () => {
      const liteOnly = historyBackup([
        { type: "layout", device: "LITE", layout: layout("lite") },
      ]);
      // Looking for a 3D device, backup only has Lite.
      expect(parseDeviceLayoutFromBackup(liteOnly, "f.json", false)).toBeNull();
    });

    it("accepts ONE, TWO and M4G as 3D devices", () => {
      for (const device of ["ONE", "TWO", "M4G"]) {
        const b = historyBackup([
          { type: "layout", device, layout: layout(device) },
        ]);
        expect(parseDeviceLayoutFromBackup(b, "f.json", false)?.layout).toBe(
          device,
        );
      }
    });
  });
});

describe("upsertDeviceLayout", () => {
  const existing: DeviceLayout[] = [
    { id: "a.json", name: "a.json", layout: layout("a") },
    { id: "b.json", name: "b.json", layout: layout("b") },
  ];

  it("appends a layout with a new id", () => {
    const added = { id: "c.json", name: "c.json", layout: layout("c") };
    const result = upsertDeviceLayout(existing, added);
    expect(result).toHaveLength(3);
    expect(result[2]).toBe(added);
  });

  it("replaces a layout with an existing id in place", () => {
    const replacement = { id: "a.json", name: "a.json", layout: layout("a2") };
    const result = upsertDeviceLayout(existing, replacement);
    expect(result).toHaveLength(2);
    expect(result[0]).toBe(replacement);
    expect(result[1]).toBe(existing[1]);
  });

  it("does not mutate the input array", () => {
    const before = [...existing];
    upsertDeviceLayout(existing, {
      id: "a.json",
      name: "a.json",
      layout: layout("a2"),
    });
    expect(existing).toEqual(before);
  });
});

describe("findDeviceLayoutForExport", () => {
  const custom: DeviceLayout[] = [
    { id: "mine.json", name: "mine.json", layout: layout("mine") },
  ];

  it("finds a 3D preset by id", () => {
    const preset = PRESET_DEVICE_LAYOUTS[0];
    expect(findDeviceLayoutForExport(preset.id, custom, false)).toBe(preset);
  });

  it("finds a Lite preset under the Lite layout type", () => {
    const preset = LITE_PRESET_DEVICE_LAYOUTS[0];
    expect(findDeviceLayoutForExport(preset.id, custom, true)).toBe(preset);
  });

  it("finds an imported custom layout by id", () => {
    expect(findDeviceLayoutForExport("mine.json", custom, false)).toBe(
      custom[0],
    );
  });

  it("does not find a 3D preset while in the Lite layout type", () => {
    const threeDPreset = PRESET_DEVICE_LAYOUTS[0];
    expect(
      findDeviceLayoutForExport(threeDPreset.id, custom, true),
    ).toBeUndefined();
  });

  it("returns undefined for an unknown id", () => {
    expect(findDeviceLayoutForExport("nope", custom, false)).toBeUndefined();
  });
});
