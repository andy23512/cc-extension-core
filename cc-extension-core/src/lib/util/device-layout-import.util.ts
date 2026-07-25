import { DeviceLayout } from "tangent-cc-lib";
import {
  LITE_PRESET_DEVICE_LAYOUTS,
  PRESET_DEVICE_LAYOUTS,
} from "../data/device-layouts.js";

/**
 * The device-manager backup file comes in two shapes: a full backup with a
 * `history` array of entries, or a single exported layout object. In the
 * history form, each entry is tagged with a `type` and the `device` it came
 * from, and only a layout for a device compatible with the current layout type
 * is of interest (Lite vs the 3D input devices).
 */
const LITE_DEVICES = ["LITE"];
const THREE_D_DEVICES = ["ONE", "TWO", "M4G"];

/**
 * Extracts a device layout from a parsed device-manager backup file.
 *
 * `fileName` becomes both the id and display name of the imported layout, so
 * re-importing the same file replaces the previous import rather than piling
 * up duplicates (see {@link upsertDeviceLayout}).
 *
 * Returns null when the data is empty or holds no layout for a device matching
 * the current layout type — the same cases the options page silently ignores.
 */
export function parseDeviceLayoutFromBackup(
  data: unknown,
  fileName: string,
  isLiteLayoutType: boolean,
): DeviceLayout | null {
  if (!data) {
    return null;
  }

  const record = data as {
    history?: { type: string; device: string; layout: unknown }[][];
    layout?: unknown;
  };

  let layoutItem: { layout: unknown } | null | undefined;
  if (record.history) {
    const compatibleDevices = isLiteLayoutType ? LITE_DEVICES : THREE_D_DEVICES;
    layoutItem = record.history[0].find(
      (item) =>
        item.type === "layout" && compatibleDevices.includes(item.device),
    );
  } else {
    layoutItem = record as { layout: unknown };
  }

  if (!layoutItem) {
    return null;
  }

  return {
    id: fileName,
    name: fileName,
    layout: layoutItem.layout,
  } as DeviceLayout;
}

/**
 * Returns a new list with `deviceLayout` added, replacing any existing entry
 * with the same id in place. Never mutates the input.
 */
export function upsertDeviceLayout(
  customDeviceLayouts: DeviceLayout[],
  deviceLayout: DeviceLayout,
): DeviceLayout[] {
  const next = [...customDeviceLayouts];
  const index = next.findIndex(({ id }) => id === deviceLayout.id);
  if (index >= 0) {
    next[index] = deviceLayout;
  } else {
    next.push(deviceLayout);
  }
  return next;
}

/**
 * Finds the currently selected layout among the presets for the active layout
 * type and the user's imported layouts, for exporting. Returns undefined when
 * the id matches nothing.
 */
export function findDeviceLayoutForExport(
  layoutId: string,
  customDeviceLayouts: DeviceLayout[],
  isLiteLayoutType: boolean,
): DeviceLayout | undefined {
  const presets = isLiteLayoutType
    ? LITE_PRESET_DEVICE_LAYOUTS
    : PRESET_DEVICE_LAYOUTS;
  return [...presets, ...customDeviceLayouts].find(
    (deviceLayout) => deviceLayout.id === layoutId,
  );
}
