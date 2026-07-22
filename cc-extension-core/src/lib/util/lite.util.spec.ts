import { describe, expect, it } from "vitest";
import { generateCCLiteKeyboard, LITE_ASPECT_RATIO } from "./lite.util.js";

const KEYBOARD_WIDTH = 163;
const GAP = 1;

describe("generateCCLiteKeyboard", () => {
  const keyboard = generateCCLiteKeyboard();

  it("reports the dimensions the aspect ratio is derived from", () => {
    expect(keyboard.width).toBe(KEYBOARD_WIDTH);
    expect(LITE_ASPECT_RATIO).toBeCloseTo(keyboard.width / keyboard.height, 10);
  });

  it("covers every switch on the device exactly once", () => {
    const positionCodes = keyboard.keys.map((key) => key.positionCode);
    expect(new Set(positionCodes).size).toBe(positionCodes.length);
    expect([...positionCodes].sort((a, b) => a - b)).toEqual(
      Array.from({ length: 67 }, (_, index) => index),
    );
  });

  it("gives every row the same total width", () => {
    const rows = new Map<number, { x: number; width: number }[]>();
    for (const key of keyboard.keys) {
      const row = rows.get(key.y) ?? [];
      row.push({ x: key.x, width: key.width });
      rows.set(key.y, row);
    }

    expect(rows.size).toBe(5);
    for (const [y, row] of rows) {
      const last = row.reduce((a, b) => (a.x > b.x ? a : b));
      expect(
        last.x + last.width,
        `row at y=${y} should span the full keyboard width`,
      ).toBeCloseTo(KEYBOARD_WIDTH, 10);
    }
  });

  it("lays keys out left to right without overlapping", () => {
    const rows = new Map<number, { x: number; width: number }[]>();
    for (const key of keyboard.keys) {
      const row = rows.get(key.y) ?? [];
      row.push({ x: key.x, width: key.width });
      rows.set(key.y, row);
    }

    for (const row of rows.values()) {
      const sorted = [...row].sort((a, b) => a.x - b.x);
      for (let i = 1; i < sorted.length; i++) {
        const previous = sorted[i - 1];
        expect(sorted[i].x).toBeCloseTo(previous.x + previous.width + GAP, 10);
      }
    }
  });

  it("gives every key a positive size", () => {
    for (const key of keyboard.keys) {
      expect(key.width).toBeGreaterThan(0);
      expect(key.height).toBeGreaterThan(0);
    }
  });
});
