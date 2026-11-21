import { describe, expect, it } from "vitest";
import { cos, sin } from "./math.util.js";

describe("sin / cos in degrees", () => {
  it.each([
    [0, 0, 1],
    [90, 1, 0],
    [180, 0, -1],
    [270, -1, 0],
    [360, 0, 1],
    [30, 0.5, Math.sqrt(3) / 2],
    [45, Math.SQRT1_2, Math.SQRT1_2],
    [60, Math.sqrt(3) / 2, 0.5],
    [-90, -1, 0],
    [-30, -0.5, Math.sqrt(3) / 2],
    [720 + 90, 1, 0],
  ])("%i degrees: sin %d, cos %d", (deg, s, c) => {
    expect(sin(deg)).toBeCloseTo(s, 12);
    expect(cos(deg)).toBeCloseTo(c, 12);
  });

  it("matches the radian functions", () => {
    for (let deg = -400; deg <= 400; deg += 7) {
      expect(sin(deg)).toBeCloseTo(Math.sin((deg * Math.PI) / 180), 12);
      expect(cos(deg)).toBeCloseTo(Math.cos((deg * Math.PI) / 180), 12);
    }
  });

  it("keeps sin² + cos² = 1 and a quarter turn apart", () => {
    for (let deg = 0; deg < 360; deg += 13) {
      expect(sin(deg) ** 2 + cos(deg) ** 2).toBeCloseTo(1, 12);
      expect(cos(deg)).toBeCloseTo(sin(deg + 90), 12);
    }
  });
});
