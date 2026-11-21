import { describe, expect, it } from "vitest";
import {
  ALT_GRAPH_KEY_LABEL,
  KeyLabelType,
  FLAG_SHIFT_KEY_LABEL,
  FN_SHIFT_KEY_LABEL,
  NUM_SHIFT_KEY_LABEL,
  SHIFT_KEY_LABEL,
} from "tangent-cc-lib";
import { ICONS } from "./icon.model.js";

describe("ICONS", () => {
  it("has no duplicates (the font is subset from this list)", () => {
    expect(new Set(ICONS).size).toBe(ICONS.length);
  });

  it("is written as Material Symbols names: lower-case words and digits joined by underscores", () => {
    ICONS.forEach((name) => expect(name).toMatch(/^[a-z][a-z0-9]*(_[a-z0-9]+)*$/));
  });

  it("is kept in alphabetical order, so a missing icon is easy to spot in review", () => {
    expect([...ICONS]).toEqual([...ICONS].sort());
  });

  it("includes the icons the overlay's own buttons use", () => {
    for (const name of ["info", "replay", "settings"] as const) expect(ICONS).toContain(name);
  });

  it("includes the icon of every layer and modifier label the container draws as an icon", () => {
    for (const label of [SHIFT_KEY_LABEL, NUM_SHIFT_KEY_LABEL, FN_SHIFT_KEY_LABEL, FLAG_SHIFT_KEY_LABEL]) {
      expect(label.type).toBe(KeyLabelType.Icon);
      expect(ICONS as readonly string[], label.title).toContain(label.c);
    }
    // and the Space label the container builds itself
    expect(ICONS).toContain("space_bar");
  });

  it("does not need an icon for Alt Graph, which is drawn as text", () => {
    expect(ALT_GRAPH_KEY_LABEL.type).toBe(KeyLabelType.String);
    expect(ALT_GRAPH_KEY_LABEL.c).toBe("ALT(GR)");
  });
});
