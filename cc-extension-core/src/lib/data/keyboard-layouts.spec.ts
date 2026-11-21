import { describe, expect, it } from "vitest";
import { KEYBOARD_LAYOUTS } from "./keyboard-layouts.js";

describe("KEYBOARD_LAYOUTS", () => {
  it("has a long list with a unique id for each (a layout is chosen by id)", () => {
    expect(KEYBOARD_LAYOUTS.length).toBeGreaterThan(100);
    const ids = KEYBOARD_LAYOUTS.map((k) => k.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every layout an id, a name and a layout table", () => {
    for (const k of KEYBOARD_LAYOUTS) {
      expect(k.id, "id").toBeTruthy();
      expect(k.name, `name of ${k.id}`).toBeTruthy();
      expect(k.layout, `layout of ${k.id}`).toBeTruthy();
    }
  });

  it("contains the US layout the options page and the container fall back to", () => {
    const us = KEYBOARD_LAYOUTS.find((k) => k.id === "us");
    expect(us?.name).toBe("US");
  });

  it("puts the kbdlayout.info layouts first, then the xkeyboard ones", () => {
    expect(KEYBOARD_LAYOUTS[0].id).toBe("adlam");
    expect(KEYBOARD_LAYOUTS.at(-1)?.id).toBe("fr-bre@xkeyboard");
    const firstXkb = KEYBOARD_LAYOUTS.findIndex((k) => k.id.endsWith("@xkeyboard"));
    expect(firstXkb).toBeGreaterThan(0);
    KEYBOARD_LAYOUTS.slice(firstXkb).forEach((k) => expect(k.id.endsWith("@xkeyboard")).toBe(true));
    KEYBOARD_LAYOUTS.slice(0, firstXkb).forEach((k) => expect(k.id.endsWith("@xkeyboard")).toBe(false));
  });

  it("describes each layout with the position codes the overlay looks up (Digit1, KeyQ)", () => {
    const us = KEYBOARD_LAYOUTS.find((k) => k.id === "us")!;
    const table = us.layout as Record<string, { unmodified: { value: string }; withShift: { value: string } }>;
    expect(table.KeyQ.unmodified.value).toBe("q");
    expect(table.KeyQ.withShift.value).toBe("Q");
    expect(table.Digit1.withShift.value).toBe("!");
  });
});
