import { describe, expect, it } from "vitest";
import {
  CELL_SIZE,
  GAP,
  VIEW_BOX_WIDTH,
} from "../const/layout-dimension.const.js";
import {
  getViewBoxAspectRatio,
  getViewBoxHeight,
} from "./layout-dimension.util.js";

describe("getViewBoxHeight", () => {
  it("spans 4 rows with 3 gaps when the thumb-3 switch is hidden", () => {
    expect(getViewBoxHeight(false)).toBe(CELL_SIZE * 4 + GAP * 3);
  });

  it("adds a fifth row (and its gap) when the thumb-3 switch is shown", () => {
    expect(getViewBoxHeight(true)).toBe(CELL_SIZE * 5 + GAP * 4);
  });

  it("grows by exactly one cell plus one gap for the extra row", () => {
    expect(getViewBoxHeight(true) - getViewBoxHeight(false)).toBe(
      CELL_SIZE + GAP,
    );
  });
});

describe("getViewBoxAspectRatio", () => {
  it("is the fixed width over the height for each thumb-3 state", () => {
    expect(getViewBoxAspectRatio(false)).toBe(
      VIEW_BOX_WIDTH / getViewBoxHeight(false),
    );
    expect(getViewBoxAspectRatio(true)).toBe(
      VIEW_BOX_WIDTH / getViewBoxHeight(true),
    );
  });

  it("is wider (larger ratio) when the shorter 4-row layout is shown", () => {
    expect(getViewBoxAspectRatio(false)).toBeGreaterThan(
      getViewBoxAspectRatio(true),
    );
  });
});
