import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HighlightKeyCombination, KeyLabel, KeyLabelType, Layer, POSITION_CODE_LAYOUT } from "tangent-cc-lib";
import { generateCCLiteKeyboard } from "../util/lite.util.js";
import CCLiteLayoutComponent from "./cclite-layout.component.js";
import CCLiteLayoutKeyComponent from "./cclite-layout-key.component.js";
import KeyLabelComponent from "./key-label.component.js";
import LayoutComponent from "./layout.component.js";
import LogoComponent from "./logo.component.js";
import SwitchComponent from "./switch.component.js";
import SwitchSectorComponent from "./switch-sector.component.js";

afterEach(cleanup);

/** A key label for tests. `over` is loose on purpose: tests build icon, logo and action-code labels from one base. */
const label = (over: Record<string, unknown> = {}): KeyLabel =>
  ({
    type: KeyLabelType.String,
    c: "a",
    title: "Character: a",
    layer: Layer.Primary,
    shiftKey: false,
    altGraphKey: false,
    ...over,
  }) as KeyLabel;

const highlight = (over: Partial<HighlightKeyCombination> = {}): HighlightKeyCombination => ({
  characterKeyPositionCode: 1,
  layer: Layer.Primary,
  shiftKey: false,
  altGraphKey: false,
  positionCodes: [1],
  score: 0,
  ...over,
});

const inSvg = (ui: React.ReactNode) => render(<svg>{ui}</svg>);
const texts = (c: HTMLElement) => [...c.querySelectorAll("text")];
const num = (s: string | null | undefined) => Number(s);

describe("KeyLabelComponent", () => {
  const draw = (labels: KeyLabel[], hl: HighlightKeyCombination | null, fontSize = 10) =>
    inSvg(<KeyLabelComponent x={5} y={6} fontSize={fontSize} labels={labels} highlightKeyCombination={hl} />).container;

  it("draws one centred text per label at the given point", () => {
    const c = draw([label({ c: "a" }), label({ c: "b", layer: Layer.Secondary })], null);
    const t = texts(c);
    expect(t.map((x) => x.textContent)).toEqual(["a", "b"]);
    t.forEach((x) => {
      expect(x.getAttribute("x")).toBe("5");
      expect(x.getAttribute("y")).toBe("6");
      expect(x.getAttribute("text-anchor")).toBe("middle");
      expect(x.getAttribute("dominant-baseline")).toBe("central");
    });
  });

  it("draws nothing when there are no labels, or the labels are missing", () => {
    expect(texts(draw([], null))).toHaveLength(0);
    expect(texts(draw(undefined as never, null))).toHaveLength(0);
  });

  describe("font size by label kind", () => {
    const sizeOf = (l: KeyLabel) => texts(draw([l], null, 100))[0].style.fontSize;
    it("shrinks longer strings: 1 char full, 2 chars 80%, 3 or more 60%", () => {
      expect(sizeOf(label({ c: "a" }))).toBe("100px");
      expect(sizeOf(label({ c: "ab" }))).toBe("80px");
      expect(sizeOf(label({ c: "abc" }))).toBe("60px");
      expect(sizeOf(label({ c: "abcdef" }))).toBe("60px");
    });
    it("uses 60% for action codes and 80% for icons and logos", () => {
      expect(sizeOf(label({ type: KeyLabelType.ActionCode, c: "x" }))).toBe("60px");
      expect(sizeOf(label({ type: KeyLabelType.Icon, c: "shift" }))).toBe("80px");
      expect(sizeOf(label({ type: KeyLabelType.Logo, c: "logo" }))).toBe("80px");
    });
    it("scales with the font size it was given", () => {
      expect(texts(draw([label({ c: "ab" })], null, 8))[0].style.fontSize).toBe("6.4px");
    });
    it("refuses a label kind it does not know", () => {
      // React reports the error to the console and jsdom to the window; both are expected here.
      const err = vi.spyOn(console, "error").mockImplementation(() => undefined);
      const quiet = (event: ErrorEvent) => event.preventDefault();
      window.addEventListener("error", quiet);
      expect(() => draw([label({ type: "mystery" as never })], null)).toThrow("Unhandled key label type case: mystery");
      window.removeEventListener("error", quiet);
      err.mockRestore();
    });
  });

  it("uses the icon font for icon labels only", () => {
    const t = texts(draw([label({ type: KeyLabelType.Icon, c: "shift" }), label({ c: "a" }), label({ type: KeyLabelType.Logo, c: "L" })], null));
    expect(t.map((x) => x.classList.contains("material-icons"))).toEqual([true, false, false]);
    t.forEach((x) => expect(x.classList.contains("fill-(--cc-symbol-color)")).toBe(true));
  });

  describe("which labels are visible", () => {
    const opacities = (labels: KeyLabel[], hl: HighlightKeyCombination | null) =>
      texts(draw(labels, hl)).map((x) => x.getAttribute("opacity"));

    it("hides everything while nothing is highlighted", () => {
      expect(opacities([label(), label({ layer: null })], null)).toEqual(["0", "0"]);
    });
    it("shows a label whose layer, shift and AltGr all match the highlight", () => {
      expect(opacities([label()], highlight())).toEqual(["1"]);
    });
    it("hides a label that differs in layer, shift or AltGr", () => {
      const hl = highlight();
      expect(opacities([label({ layer: Layer.Secondary })], hl)).toEqual(["0"]);
      expect(opacities([label({ shiftKey: true })], hl)).toEqual(["0"]);
      expect(opacities([label({ altGraphKey: true })], hl)).toEqual(["0"]);
    });
    it("always shows a label with no layer (a modifier or layer-shift key), even without a layer match", () => {
      expect(opacities([label({ layer: null, shiftKey: null, altGraphKey: null })], highlight({ layer: Layer.Tertiary, shiftKey: true }))).toEqual(["1"]);
    });
    it("shows a label on the same layer that has no shift or AltGr requirement", () => {
      const generic = label({ shiftKey: null, altGraphKey: null });
      expect(opacities([generic], highlight({ shiftKey: true, altGraphKey: true }))).toEqual(["1"]);
      expect(opacities([generic], highlight({ layer: Layer.Secondary }))).toEqual(["0"]);
    });
    it("needs both shift and AltGr unset to count as generic (one set is not enough)", () => {
      expect(opacities([label({ shiftKey: null, altGraphKey: false })], highlight({ shiftKey: true }))).toEqual(["0"]);
      expect(opacities([label({ shiftKey: false, altGraphKey: null })], highlight({ altGraphKey: true }))).toEqual(["0"]);
    });
    it("picks out the matching one among several on the same key", () => {
      const labels = [label({ c: "a" }), label({ c: "A", shiftKey: true }), label({ c: "1", layer: Layer.Secondary })];
      expect(opacities(labels, highlight({ shiftKey: true }))).toEqual(["0", "1", "0"]);
    });
  });
});

describe("CCLiteLayoutKeyComponent", () => {
  const draw = (over: Partial<React.ComponentProps<typeof CCLiteLayoutKeyComponent>> = {}) =>
    inSvg(
      <CCLiteLayoutKeyComponent
        x={10}
        y={20}
        width={30}
        height={40}
        positionCode={7}
        keyLabel={[label()]}
        highlightKeyCombination={null}
        highlightOpacity={0.5}
        {...over}
      />,
    ).container;
  const rects = (c: HTMLElement) => [...c.querySelectorAll("rect")];

  it("draws the key body, its highlight and the home-row bump, at the key's place and size", () => {
    const [body, hi, bump] = rects(draw());
    for (const r of [body, hi]) {
      expect([r.getAttribute("x"), r.getAttribute("y"), r.getAttribute("width"), r.getAttribute("height"), r.getAttribute("rx")]).toEqual(["10", "20", "30", "40", "1"]);
    }
    expect(num(bump.getAttribute("x"))).toBeCloseTo(10 + 30 * 0.365);
    expect(num(bump.getAttribute("y"))).toBeCloseTo(20 + 40 * 0.8);
    expect(num(bump.getAttribute("width"))).toBeCloseTo(30 * 0.27);
    expect(num(bump.getAttribute("height"))).toBeCloseTo(40 * 0.055);
    expect(num(bump.getAttribute("rx"))).toBeCloseTo(40 * 0.028);
  });

  it("lights the highlight only when this key is in the highlighted combination", () => {
    const op = (hl: HighlightKeyCombination | null) => rects(draw({ highlightKeyCombination: hl }))[1].getAttribute("opacity");
    expect(op(null)).toBe("0");
    expect(op(highlight({ positionCodes: [3, 7] }))).toBe("0.5");
    expect(op(highlight({ positionCodes: [3, 8] }))).toBe("0");
    expect(op(highlight({ positionCodes: [] }))).toBe("0");
  });

  it("follows the opacity it is given", () => {
    const hl = highlight({ positionCodes: [7] });
    expect(rects(draw({ highlightKeyCombination: hl, highlightOpacity: 0.9 }))[1].getAttribute("opacity")).toBe("0.9");
    expect(rects(draw({ highlightKeyCombination: hl, highlightOpacity: 0 }))[1].getAttribute("opacity")).toBe("0");
  });

  it("shows the home-row bump only on position codes 30 and 33", () => {
    const bump = (code: number) => rects(draw({ positionCode: code }))[2].getAttribute("opacity");
    expect(bump(30)).toBe("0.45");
    expect(bump(33)).toBe("0.45");
    for (const code of [0, 7, 29, 31, 32, 34, 66]) expect(bump(code)).toBe("0");
  });

  it("puts the label in the middle of the key at font size 8", () => {
    const t = texts(draw({ keyLabel: [label({ c: "q" })] }))[0];
    expect([t.getAttribute("x"), t.getAttribute("y"), t.style.fontSize, t.textContent]).toEqual(["25", "40", "8px", "q"]);
  });
});

describe("CCLiteLayoutComponent", () => {
  const keyboard = generateCCLiteKeyboard();
  const draw = (hl: HighlightKeyCombination | null = null, map: Record<number, KeyLabel[]> = {}, opacity = 1) =>
    render(<CCLiteLayoutComponent keyLabelMap={map} highlightKeyCombination={hl} highlightOpacity={opacity} />).container;

  it("sizes the drawing to the keyboard", () => {
    const svg = draw().querySelector("svg")!;
    expect(svg.getAttribute("viewBox")).toBe(`0 0 ${keyboard.width} ${keyboard.height}`);
    expect(svg.style.aspectRatio).toBe(`${keyboard.width} / ${keyboard.height}`);
    expect(svg.getAttribute("shape-rendering")).toBe("crispEdges");
  });

  it("draws every key of the Lite keyboard, three rectangles each", () => {
    expect(keyboard.keys.length).toBeGreaterThan(60);
    expect(draw().querySelectorAll("rect")).toHaveLength(keyboard.keys.length * 3);
  });

  it("puts each label on the key with that position code", () => {
    const code = keyboard.keys[5].positionCode;
    const c = draw(null, { [code]: [label({ c: "Z" })] });
    const t = texts(c);
    expect(t).toHaveLength(1);
    expect(num(t[0].getAttribute("x"))).toBeCloseTo(keyboard.keys[5].x + keyboard.keys[5].width / 2);
    expect(num(t[0].getAttribute("y"))).toBeCloseTo(keyboard.keys[5].y + keyboard.keys[5].height / 2);
  });

  it("lights exactly the highlighted keys", () => {
    const [a, b] = [keyboard.keys[3].positionCode, keyboard.keys[9].positionCode];
    const c = draw(highlight({ positionCodes: [a, b] }), {}, 0.7);
    const lit = [...c.querySelectorAll("rect.fill-\\(--cc-pointer-color\\)")].filter((r) => r.getAttribute("opacity") === "0.7");
    expect(lit).toHaveLength(2);
    expect(lit.map((r) => num(r.getAttribute("x"))).sort()).toEqual([keyboard.keys[3].x, keyboard.keys[9].x].sort());
  });
});

describe("SwitchSectorComponent", () => {
  const R1 = 65;
  const R2 = 175;
  const center = { x: 500, y: 400 };
  const draw = (over: Partial<React.ComponentProps<typeof SwitchSectorComponent>> = {}) =>
    inSvg(
      <SwitchSectorComponent
        center={center}
        degree={0}
        direction="cw"
        positionCode={4}
        keyLabel={[label()]}
        highlightKeyCombination={null}
        strokeWidth={1}
        highlightOpacity={0.6}
        fontSize={90}
        {...over}
      />,
    ).container;
  const pathOf = (c: HTMLElement) => c.querySelectorAll("path")[0].getAttribute("d")!;
  const numbers = (d: string) => d.match(/-?\d+(\.\d+)?(e-?\d+)?/g)!.map(Number);
  const dist = (x: number, y: number) => Math.hypot(x - center.x, y - center.y);
  const angle = (x: number, y: number) => (Math.atan2(y - center.y, x - center.x) * 180) / Math.PI;

  it("draws a ring segment: four path commands, M then A then L then A", () => {
    for (const direction of ["cw", "ccw"] as const) {
      const d = pathOf(draw({ direction })).replace(/\s+/g, " ").trim();
      expect(d.match(/[MALZ]/g)!.join("")).toBe("MALA");
    }
  });

  it("keeps the inner edge on radius 65 and the outer edge on radius 175 minus the stroke", () => {
    for (const strokeWidth of [1, 4]) {
      const n = numbers(pathOf(draw({ strokeWidth })));
      // M x y, A r r 0 0 f x y, L x y, A r r 0 0 f x y
      const [mx, my, r1, , , , , ax, ay, lx, ly, r2, , , , , ex, ey] = n;
      expect(dist(mx, my)).toBeCloseTo(R1, 6);
      expect(r1).toBe(R1);
      expect(dist(ax, ay)).toBeCloseTo(R1, 6);
      expect(dist(lx, ly)).toBeCloseTo(R2 - strokeWidth, 6);
      expect(r2).toBe(R2 - strokeWidth);
      expect(dist(ex, ey)).toBeCloseTo(R2 - strokeWidth, 6);
    }
  });

  it("centres the segment on the given direction, 90 degrees wide minus a small gap", () => {
    for (const degree of [0, 90, 180, 270, 37]) {
      const [mx, my, , , , , , ax, ay] = numbers(pathOf(draw({ degree, direction: "cw" })));
      const a1 = angle(mx, my);
      const a2 = angle(ax, ay);
      const norm = (x: number) => ((x % 360) + 540) % 360 - 180;
      expect(norm((a1 + norm(a2 - a1) / 2) - degree)).toBeCloseTo(0, 6);
      const span = Math.abs(norm(a2 - a1));
      expect(span).toBeLessThan(90);
      expect(span).toBeGreaterThan(70);
    }
  });

  it("goes clockwise for cw and counter-clockwise for ccw (the arc sweep flags)", () => {
    const cw = pathOf(draw({ direction: "cw" })).replace(/\s+/g, " ");
    const ccw = pathOf(draw({ direction: "ccw" })).replace(/\s+/g, " ");
    expect(cw).toMatch(/A 65 65 0 0 1 .* A 174 174 0 0 0 /);
    expect(ccw).toMatch(/A 65 65 0 0 0 .* A 174 174 0 0 1 /);
  });

  it("draws the same shape both ways, only traced from the other end", () => {
    const cw = numbers(pathOf(draw({ direction: "cw" })));
    const ccw = numbers(pathOf(draw({ direction: "ccw" })));
    // cw starts at the inner start point and ends at the outer start point; ccw the reverse of that
    expect(ccw[0]).toBeCloseTo(cw[7], 6);
    expect(ccw[1]).toBeCloseTo(cw[8], 6);
    expect(ccw[7]).toBeCloseTo(cw[0], 6);
    expect(ccw[8]).toBeCloseTo(cw[1], 6);
  });

  it("moves with the centre", () => {
    const a = numbers(pathOf(draw()));
    const b = numbers(pathOf(draw({ center: { x: center.x + 10, y: center.y - 20 } })));
    expect(b[0] - a[0]).toBeCloseTo(10, 6);
    expect(b[1] - a[1]).toBeCloseTo(-20, 6);
  });

  it("puts the label halfway along the segment, in the segment's direction", () => {
    for (const degree of [0, 90, 180, 270]) {
      const t = texts(draw({ degree, strokeWidth: 1 }))[0];
      const x = num(t.getAttribute("x"));
      const y = num(t.getAttribute("y"));
      expect(dist(x, y)).toBeCloseTo((R1 + (R2 - 1)) / 2, 6);
      expect(angle(x, y)).toBeCloseTo(degree > 180 ? degree - 360 : degree, 6);
    }
  });

  it("passes the font size on to the label", () => {
    expect(texts(draw({ fontSize: 50 }))[0].style.fontSize).toBe("50px");
  });

  it("draws the highlight copy closed (Z) with the key's opacity, only for a highlighted position", () => {
    const hlPath = (hl: HighlightKeyCombination | null) => draw({ highlightKeyCombination: hl }).querySelectorAll("path")[1];
    expect(hlPath(null).getAttribute("opacity")).toBe("0");
    expect(hlPath(highlight({ positionCodes: [4] })).getAttribute("opacity")).toBe("0.6");
    expect(hlPath(highlight({ positionCodes: [5] })).getAttribute("opacity")).toBe("0");
    expect(hlPath(null).getAttribute("d")!.trim().endsWith("Z")).toBe(true);
    expect(hlPath(null).getAttribute("d")!.replace(/\s+Z$/, "").trim()).toBe(pathOf(draw()).trim());
  });
});

describe("SwitchComponent", () => {
  const map = { c: 10, n: 11, e: 12, s: 13, w: 14 };
  const draw = (over: Partial<React.ComponentProps<typeof SwitchComponent>> = {}) =>
    inSvg(
      <SwitchComponent
        center={{ x: 100, y: 200 }}
        rotationDirection="cw"
        rotation={0}
        keyLabelMap={{}}
        positionCodeMap={map}
        highlightKeyCombination={null}
        highlightOpacity={0.8}
        {...over}
      />,
    ).container;

  it("draws four sectors and a centre circle", () => {
    const c = draw();
    expect(c.querySelectorAll("path")).toHaveLength(8);
    const circle = c.querySelector("circle")!;
    expect([circle.getAttribute("cx"), circle.getAttribute("cy"), circle.getAttribute("r")]).toEqual(["100", "200", "53.68"]);
  });

  it("lights only the sectors and the centre whose position codes are highlighted", () => {
    const lit = (codes: number[]) => {
      const c = draw({ highlightKeyCombination: highlight({ positionCodes: codes }) });
      const paths = [...c.querySelectorAll("path.fill-\\(--cc-pointer-color\\)")];
      return {
        sectors: paths.map((p) => p.getAttribute("opacity")),
        centre: c.querySelector("circle")!.getAttribute("opacity"),
      };
    };
    // sector order is n, e, s, w
    expect(lit([])).toEqual({ sectors: ["0", "0", "0", "0"], centre: "0" });
    expect(lit([11])).toEqual({ sectors: ["0.8", "0", "0", "0"], centre: "0" });
    expect(lit([12, 14])).toEqual({ sectors: ["0", "0.8", "0", "0.8"], centre: "0" });
    expect(lit([10])).toEqual({ sectors: ["0", "0", "0", "0"], centre: "0.8" });
    expect(lit([10, 11, 12, 13, 14])).toEqual({ sectors: ["0.8", "0.8", "0.8", "0.8"], centre: "0.8" });
  });

  it("writes each key's label on its own sector and the centre's label in the middle", () => {
    const c = draw({
      keyLabelMap: { 10: [label({ c: "C" })], 11: [label({ c: "N" })], 12: [label({ c: "E" })], 13: [label({ c: "S" })], 14: [label({ c: "W" })] },
    });
    // sector labels come first (n, e, s, w), then the centre
    expect(texts(c).map((t) => t.textContent)).toEqual(["N", "E", "S", "W", "C"]);
    const centre = texts(c)[4];
    expect([centre.getAttribute("x"), centre.getAttribute("y"), centre.style.fontSize]).toEqual(["100", "200", "90px"]);
  });

  it("lays the sectors out north, east, south, west", () => {
    const c = draw({ keyLabelMap: { 11: [label({ c: "N" })], 12: [label({ c: "E" })], 13: [label({ c: "S" })], 14: [label({ c: "W" })] } });
    const at = Object.fromEntries(texts(c).slice(0, 4).map((t) => [t.textContent, [num(t.getAttribute("x")) - 100, num(t.getAttribute("y")) - 200]]));
    expect(at.N[0]).toBeCloseTo(0, 6);
    expect(at.N[1]).toBeLessThan(0);
    expect(at.E[0]).toBeGreaterThan(0);
    expect(at.E[1]).toBeCloseTo(0, 6);
    expect(at.S[0]).toBeCloseTo(0, 6);
    expect(at.S[1]).toBeGreaterThan(0);
    expect(at.W[0]).toBeLessThan(0);
    expect(at.W[1]).toBeCloseTo(0, 6);
  });

  it("turns the sectors by the rotation: clockwise for cw, the other way for ccw, none for 0", () => {
    const north = (over: Partial<React.ComponentProps<typeof SwitchComponent>>) => {
      const t = texts(draw({ keyLabelMap: { 11: [label({ c: "N" })] }, ...over })).find((x) => x.textContent === "N")!;
      return (Math.atan2(num(t.getAttribute("y")) - 200, num(t.getAttribute("x")) - 100) * 180) / Math.PI;
    };
    expect(north({ rotation: 0 })).toBeCloseTo(-90, 6);
    expect(north({ rotation: 10, rotationDirection: "cw" })).toBeCloseTo(-80, 6);
    expect(north({ rotation: 10, rotationDirection: "ccw" })).toBeCloseTo(-100, 6);
  });

  it("gives the sectors the same direction as the switch", () => {
    const cw = draw({ rotationDirection: "cw" }).querySelector("path")!.getAttribute("d")!;
    const ccw = draw({ rotationDirection: "ccw" }).querySelector("path")!.getAttribute("d")!;
    expect(cw).not.toBe(ccw);
  });
});

describe("LayoutComponent", () => {
  const draw = (showThumb3Switch: boolean, hl: HighlightKeyCombination | null = null, map: Record<number, KeyLabel[]> = {}) =>
    render(<LayoutComponent keyLabelMap={map} highlightKeyCombination={hl} showThumb3Switch={showThumb3Switch} highlightOpacity={1} />).container;
  const centres = (c: HTMLElement) => [...c.querySelectorAll("circle")].map((x) => [num(x.getAttribute("cx")), num(x.getAttribute("cy"))]);

  it("draws 8 switches a side without Thumb 3 and 9 with it", () => {
    expect(draw(false).querySelectorAll("circle")).toHaveLength(16);
    expect(draw(true).querySelectorAll("circle")).toHaveLength(18);
  });

  it("is taller with the third thumb switch, and as wide either way", () => {
    const a = draw(false).querySelector("svg")!;
    const b = draw(true).querySelector("svg")!;
    const [, , wa, ha] = a.getAttribute("viewBox")!.split(" ").map(Number);
    const [, , wb, hb] = b.getAttribute("viewBox")!.split(" ").map(Number);
    expect(wa).toBe(3815);
    expect(wb).toBe(3815);
    expect(hb).toBeGreaterThan(ha);
    expect(a.style.aspectRatio).toBe(`${wa} / ${ha}`);
    expect(b.style.aspectRatio).toBe(`${wb} / ${hb}`);
  });

  it("mirrors the right hand around the middle of the drawing", () => {
    const c = centres(draw(true));
    const perSide = c.length / 2;
    const left = c.slice(0, perSide);
    const right = c.slice(perSide);
    left.forEach(([x, y], i) => {
      expect(right[i][0]).toBeCloseTo(3815 - x, 6);
      expect(right[i][1]).toBeCloseTo(y, 6);
    });
  });

  it("places the little finger switch at the far left, half a row down", () => {
    const [x, y] = centres(draw(false))[7]; // order: thumbMid, thumbTip, index, middle, middleMid, ring, ringMid, little
    expect(x).toBeCloseTo(175, 6);
    expect(y).toBeCloseTo(0.5 * 385 + 175, 6);
  });

  it("puts the thumbs below the fingers and the extra thumb switch lowest", () => {
    const withThumb3 = centres(draw(true));
    const [thumbEnd, thumbMid, thumbTip] = withThumb3;
    expect(thumbTip[1]).toBeLessThan(thumbMid[1]);
    expect(thumbMid[1]).toBeLessThan(thumbEnd[1]);
    expect(thumbEnd[1]).toBeCloseTo(4 * 385 + 175, 6);
  });

  it("uses each position code from the library's layout (left hand first)", () => {
    const code = POSITION_CODE_LAYOUT.left.index.n;
    const c = draw(false, null, { [code]: [label({ c: "L" })] });
    expect(texts(c).map((t) => t.textContent)).toEqual(["L"]);
    const rightCode = POSITION_CODE_LAYOUT.right.index.n;
    const d = draw(false, null, { [rightCode]: [label({ c: "R" })] });
    const t = texts(d)[0];
    expect(num(t.getAttribute("x"))).toBeGreaterThan(3815 / 2);
  });

  it("lights the sectors for a highlighted combination", () => {
    const code = POSITION_CODE_LAYOUT.left.index.n;
    const c = draw(false, highlight({ positionCodes: [code] }));
    const lit = [...c.querySelectorAll("path.fill-\\(--cc-pointer-color\\)")].filter((p) => p.getAttribute("opacity") === "1");
    expect(lit).toHaveLength(1);
  });
});

describe("LogoComponent", () => {
  const draw = (showText: boolean, siteLabel = "Keybr", className?: string) =>
    render(<LogoComponent showText={showText} siteLabel={siteLabel} className={className} />).container;

  it("draws one switch in a 350 by 350 box, with the class it was given", () => {
    const c = draw(false, "Keybr", "logo-class");
    const svg = c.querySelector("svg")!;
    expect(svg.getAttribute("viewBox")).toBe("0 0 350 350");
    expect(svg.getAttribute("class")).toBe("logo-class");
    expect(c.querySelectorAll("circle")).toHaveLength(1);
    expect(c.querySelectorAll("path")).toHaveLength(8);
  });

  it("writes CC, the site name and ext. when text is on, and nothing when it is off", () => {
    // sector labels first (north = site name, south = "ext."), then the centre ("CC")
    expect(texts(draw(true, "Keybr")).map((t) => t.textContent)).toEqual(["Keybr", "ext.", "CC"]);
    expect(texts(draw(false))).toHaveLength(0);
  });

  it("uses the site label it is given", () => {
    expect(texts(draw(true, "Monkeytype")).map((t) => t.textContent)).toContain("Monkeytype");
  });

  it("lights the north, west and south sectors but not east or the centre", () => {
    const c = draw(false);
    const ops = [...c.querySelectorAll("path.fill-\\(--cc-pointer-color\\)")].map((p) => p.getAttribute("opacity"));
    // sector order n, e, s, w; highlighted codes are 2 (n), 3 (w), 4 (s)
    expect(ops).toEqual(["1", "0", "1", "1"]);
    expect(c.querySelector("circle")!.getAttribute("opacity")).toBe("0");
  });

  it("shows its labels (they have no layer, so always visible)", () => {
    texts(draw(true)).forEach((t) => expect(t.getAttribute("opacity")).toBe("1"));
  });
});
