import { describe, expect, it } from "vitest";
import { HIGHLIGHT_SETTING } from "./highlight-setting.const.js";

describe("HIGHLIGHT_SETTING", () => {
  it("pins which hand the overlay prefers for each layer shift (a change moves every highlight)", () => {
    expect(HIGHLIGHT_SETTING).toEqual({
      shiftLayer: { preferSides: "both", preferShiftSide: "left" },
      numShiftLayer: { preferSides: "both", preferNumShiftSide: "left" },
      shiftAndNumShiftLayer: { preferShiftSide: "right", preferCharacterKeySide: "right" },
      fnShiftLayer: { preferSides: "both", preferFnShiftSide: "left" },
      shiftAndFnShiftLayer: { preferShiftSide: "right", preferCharacterKeySide: "right" },
      flagShiftLayer: { preferSides: "both", preferFlagShiftSide: "left" },
      shiftAndFlagShiftLayer: { preferShiftSide: "right", preferCharacterKeySide: "right" },
    });
  });
});
