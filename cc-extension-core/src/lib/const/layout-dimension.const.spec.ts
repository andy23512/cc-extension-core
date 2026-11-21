import { describe, expect, it } from "vitest";
import { CELL_SIZE, GAP, GRID_COLUMNS, THUMB_ROTATION_ANGLE, VIEW_BOX_WIDTH } from "./layout-dimension.const.js";

describe("layout dimensions", () => {
  it("pins the grid the 3D layout is drawn on", () => {
    expect(CELL_SIZE).toBe(350);
    expect(GAP).toBe(35);
    expect(GRID_COLUMNS).toBe(10);
    expect(THUMB_ROTATION_ANGLE).toBe(10);
  });

  it("is ten cells and nine gaps wide", () => {
    expect(VIEW_BOX_WIDTH).toBe(10 * 350 + 9 * 35);
    expect(VIEW_BOX_WIDTH).toBe(3815);
  });
});
