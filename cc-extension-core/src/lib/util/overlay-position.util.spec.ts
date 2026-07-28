import { describe, expect, it } from "vitest";
import {
  nextOpacityForWheel,
  normalizedAxisPosition,
  OVERLAY_MARGIN,
  pixelAxisPosition,
} from "./overlay-position.util.js";

describe("nextOpacityForWheel", () => {
  it("brightens by a step when scrolling up (negative delta)", () => {
    expect(nextOpacityForWheel(0.5, -1)).toBeCloseTo(0.6, 10);
  });

  it("dims by a step when scrolling down (positive delta)", () => {
    expect(nextOpacityForWheel(0.5, 1)).toBeCloseTo(0.4, 10);
  });

  it("leaves opacity unchanged for a zero delta", () => {
    expect(nextOpacityForWheel(0.5, 0)).toBe(0.5);
  });

  it("clamps at fully opaque", () => {
    expect(nextOpacityForWheel(1, -1)).toBe(1);
  });

  it("clamps at the minimum visible opacity", () => {
    expect(nextOpacityForWheel(0.2, 1)).toBe(0.2);
  });
});

describe("normalizedAxisPosition", () => {
  // Container 1000, overlay 200 wide, margin 8: usable pixel range is
  // [8, 1000 - 8 - 200] = [8, 792].
  const containerSize = 1000;
  const size = 200;

  it("maps the left/top margin to 0", () => {
    expect(normalizedAxisPosition(OVERLAY_MARGIN, size, containerSize)).toBe(0);
  });

  it("maps the far edge to 1", () => {
    expect(normalizedAxisPosition(792, size, containerSize)).toBe(1);
  });

  it("maps the midpoint to 0.5", () => {
    expect(normalizedAxisPosition(400, size, containerSize)).toBeCloseTo(0.5, 10);
  });

  it("clamps a position dragged past either margin into 0–1", () => {
    expect(normalizedAxisPosition(-50, size, containerSize)).toBe(0);
    expect(normalizedAxisPosition(5000, size, containerSize)).toBe(1);
  });
});

describe("pixelAxisPosition", () => {
  const containerSize = 1000;
  const size = 200;

  it("maps 0 to the margin and 1 to the far edge", () => {
    expect(pixelAxisPosition(0, size, containerSize)).toBe(OVERLAY_MARGIN);
    expect(pixelAxisPosition(1, size, containerSize)).toBe(792);
  });

  it("is the inverse of normalizedAxisPosition", () => {
    for (const start of [8, 200, 400, 600, 792]) {
      const normalized = normalizedAxisPosition(start, size, containerSize);
      expect(pixelAxisPosition(normalized, size, containerSize)).toBeCloseTo(
        start,
        10,
      );
    }
  });
});
