import { HighlightKeyCombination } from "tangent-cc-lib";
import { describe, expect, it } from "vitest";
import { getHighlightKeyCombinationFromText, normalizeText } from "./layout.util.js";

function combination(positionCode: number): HighlightKeyCombination {
  return {
    characterKeyPositionCode: positionCode,
    layer: 0,
    shiftKey: false,
    altGraphKey: false,
    positionCodes: [positionCode],
    score: 0,
  } as unknown as HighlightKeyCombination;
}

describe("normalizeText", () => {
  it("folds curly quotes onto their ASCII equivalents", () => {
    expect(normalizeText("‘a’")).toBe("'a'");
    expect(normalizeText("“b”")).toBe('"b"');
  });

  it("leaves other text untouched", () => {
    expect(normalizeText("the quick brown fox")).toBe("the quick brown fox");
  });
});

describe("getHighlightKeyCombinationFromText", () => {
  const map = {
    t: combination(1),
    th: combination(2),
    the: combination(3),
    "'": combination(4),
  };

  it("returns null when there is no text", () => {
    expect(getHighlightKeyCombinationFromText(null, map)).toBeNull();
  });

  it("returns null when nothing in the map matches", () => {
    expect(getHighlightKeyCombinationFromText("zzz", map)).toBeNull();
  });

  it("prefers the longest matching chord", () => {
    expect(getHighlightKeyCombinationFromText("theme", map)).toBe(map.the);
    expect(getHighlightKeyCombinationFromText("that", map)).toBe(map.th);
    expect(getHighlightKeyCombinationFromText("top", map)).toBe(map.t);
  });

  it("matches through curly quotes on either side", () => {
    expect(getHighlightKeyCombinationFromText("’", map)).toBe(map["'"]);
  });

  it("only matches at the start of the text", () => {
    expect(getHighlightKeyCombinationFromText("athe", map)).toBeNull();
  });
});
