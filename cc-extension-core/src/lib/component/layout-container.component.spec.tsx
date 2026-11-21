import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("webextension-polyfill", () => ({
  default: {
    storage: {
      local: { get: vi.fn(async (d: unknown) => d), set: vi.fn(async () => undefined), remove: vi.fn(async () => undefined) },
      onChanged: { addListener: vi.fn(), removeListener: vi.fn() },
    },
  },
}));

const { useSettingsStore } = await import("../store/settings-store.js");
const { default: LayoutContainerComponent } = await import("./layout-container.component.js");

const POINTER = ".fill-\\(--cc-pointer-color\\)";

function show(nextText: string | null, highlightOpacity = 0.5) {
  const { container } = render(<LayoutContainerComponent nextText={nextText} highlightOpacity={highlightOpacity} />);
  const labels = [...container.querySelectorAll("text")];
  return {
    container,
    labels,
    texts: labels.map((t) => t.textContent),
    /** how many pointer shapes are lit, i.e. how many keys to press */
    lit: (opacity = highlightOpacity) =>
      [...container.querySelectorAll(POINTER)].filter((e) => e.getAttribute("opacity") === String(opacity)).length,
  };
}

beforeEach(() => {
  useSettingsStore.setState({
    layoutType: "3d",
    layout: "cc1",
    liteLayout: "cclite",
    customDeviceLayouts: [],
    liteCustomDeviceLayouts: [],
    selectedKeyboardLayoutId: "us",
    showThumb3Switch: true,
    highlightKeysEnabled: true,
  });
});

afterEach(cleanup);

describe("LayoutContainerComponent: which drawing", () => {
  it("draws the 3D layout inside the themed frame", () => {
    const { container } = show(null);
    expect(container.querySelector("svg.layout")).not.toBeNull();
    expect(container.querySelector("svg.cclite-layout")).toBeNull();
    const frame = container.firstElementChild!;
    expect(frame.className).toContain("bg-(--cc-frame-color)");
    expect(frame.className).toContain("rounded-lg");
    expect(frame.className).toContain("h-full");
  });

  it("draws the Lite keyboard instead when the layout type is lite", () => {
    useSettingsStore.setState({ layoutType: "lite" });
    const { container } = show(null);
    expect(container.querySelector("svg.cclite-layout")).not.toBeNull();
    expect(container.querySelector("svg.layout")).toBeNull();
  });

  it("shows or hides the third thumb switch with the setting (3D only)", () => {
    expect(show(null).container.querySelectorAll("circle")).toHaveLength(18);
    cleanup();
    useSettingsStore.setState({ showThumb3Switch: false });
    expect(show(null).container.querySelectorAll("circle")).toHaveLength(16);
  });

  it("uses the Lite settings (its own layout id) under the Lite layout type", () => {
    useSettingsStore.setState({ layoutType: "lite", layout: "no-such", liteLayout: "cclite" });
    expect(() => show("a")).not.toThrow();
  });
});

describe("LayoutContainerComponent: key labels", () => {
  it("labels the 3D device from the chosen keyboard layout, whatever text comes next", () => {
    const a = show(null).texts;
    cleanup();
    const b = show("zzz").texts;
    expect(b).toEqual(a);
    expect(a.length).toBe(172);
    expect(a).toEqual(expect.arrayContaining(["a", "A", "q", "Q", "1", "!", ";", ":"]));
  });

  it("draws Space as the space_bar icon, in the icon font", () => {
    const { labels } = show(null);
    const space = labels.filter((t) => t.textContent === "space_bar");
    expect(space.length).toBeGreaterThan(0);
    space.forEach((t) => expect(t.classList.contains("material-icons")).toBe(true));
    expect(labels.some((t) => t.textContent === " ")).toBe(false);
  });

  it("adds the Shift and layer-shift keys the characters need, as icons", () => {
    const { texts, labels } = show(null);
    for (const icon of ["shift", "counter_2", "counter_3"]) {
      expect(texts).toContain(icon);
      labels.filter((t) => t.textContent === icon).forEach((t) => expect(t.classList.contains("material-icons")).toBe(true));
    }
  });

  it("leaves out the layers and the AltGr key the keyboard layout does not use", () => {
    const { texts } = show(null);
    expect(texts).not.toContain("counter_4");
    expect(texts).not.toContain("ALT(GR)");
  });

  it("adds the AltGr key for a keyboard layout that has AltGr characters (German)", () => {
    useSettingsStore.setState({ selectedKeyboardLayoutId: "german" });
    const { texts } = show(null);
    expect(texts).toContain("ALT(GR)");
    expect(texts).toContain("€");
    expect(texts).toContain("ß");
  });

  it("changes the labels with the keyboard layout", () => {
    const us = show(null).texts;
    cleanup();
    useSettingsStore.setState({ selectedKeyboardLayoutId: "german" });
    const de = show(null).texts;
    expect(de).not.toEqual(us);
    expect(us).not.toContain("ß");
    expect(de).toContain("ß");
  });

  it("labels the Lite keyboard too, with the same characters", () => {
    useSettingsStore.setState({ layoutType: "lite" });
    const { texts } = show(null);
    expect(texts).toEqual(expect.arrayContaining(["a", "A", "q", "Q", "space_bar", "shift"]));
  });

  it("keeps working when the saved keyboard or device layout no longer exists", () => {
    useSettingsStore.setState({ selectedKeyboardLayoutId: "no-such-layout" });
    expect(() => show("a")).not.toThrow();
    cleanup();
    useSettingsStore.setState({ selectedKeyboardLayoutId: "us", layout: "no-such-device-layout" });
    expect(() => show("a")).not.toThrow();
  });
});

describe("LayoutContainerComponent: highlighting the next key", () => {
  it("lights nothing when there is no text, or the text is empty", () => {
    expect(show(null).lit()).toBe(0);
    cleanup();
    expect(show("").lit()).toBe(0);
  });

  it("lights one key for a plain letter, and two for a capital (Shift plus the letter)", () => {
    expect(show("a").lit()).toBe(1);
    cleanup();
    expect(show("A").lit()).toBe(2);
  });

  it("lights a key for Space", () => {
    expect(show(" ").lit()).toBe(1);
  });

  it("lights only for the first character that can be typed (the text is read from the front)", () => {
    expect(show("ab").lit()).toBe(1);
  });

  it("lights nothing for a character the device cannot type", () => {
    expect(show("☃").lit()).toBe(0);
  });

  // The whole keyboard shows the characters of the layer and Shift state being typed.
  const visibleLabels = (text: string) =>
    show(text).labels.filter((t) => t.getAttribute("opacity") === "1").map((t) => t.textContent);

  it("shows every lower-case character while a lower-case letter is next, and hides the capitals", () => {
    const visible = visibleLabels("a");
    expect(visible).toEqual(expect.arrayContaining(["a", "q", "e", "z"]));
    expect(visible).not.toContain("A");
    expect(visible).not.toContain("Q");
  });

  it("switches to the capitals while a capital is next, and hides the lower-case ones", () => {
    const visible = visibleLabels("A");
    expect(visible).toEqual(expect.arrayContaining(["A", "Q", "E", "Z"]));
    expect(visible).not.toContain("a");
    expect(visible).not.toContain("q");
  });

  it("shows the symbols that need Shift only while Shift is part of the next key", () => {
    expect(visibleLabels("!")).toContain("!");
    expect(visibleLabels("!")).not.toContain("1");
  });

  it("shows nothing at all while there is no text to type", () => {
    const { labels } = show(null);
    expect(labels.every((t) => t.getAttribute("opacity") === "0")).toBe(true);
  });

  it("keeps the Shift key's label visible while typing lower-case on the base layer", () => {
    expect(visibleLabels("a")).toContain("shift");
  });

  it("shows the Shift key's label when typing a capital as well", () => {
    expect(visibleLabels("A")).toContain("shift");
  });

  it("lights the key with the opacity it is given", () => {
    expect(show("a", 0.8).lit(0.8)).toBe(1);
    cleanup();
    expect(show("a", 0.3).lit(0.3)).toBe(1);
  });

  it("lights nothing when highlighting is turned off, but still draws the labels", () => {
    useSettingsStore.setState({ highlightKeysEnabled: false });
    const { lit, texts } = show("a");
    expect(lit()).toBe(0);
    expect(texts).toContain("a");
  });

  it("highlights on the Lite keyboard as well", () => {
    useSettingsStore.setState({ layoutType: "lite" });
    expect(show("a").lit()).toBe(1);
    cleanup();
    expect(show("☃").lit()).toBe(0);
  });

  it("lights nothing on the Lite keyboard when highlighting is turned off", () => {
    useSettingsStore.setState({ layoutType: "lite", highlightKeysEnabled: false });
    expect(show("a").lit()).toBe(0);
  });

  it("moves the highlight when the next text changes", () => {
    const { container, rerender } = (() => {
      const r = render(<LayoutContainerComponent nextText="a" highlightOpacity={0.5} />);
      return { container: r.container, rerender: r.rerender };
    })();
    const litKeys = () =>
      [...container.querySelectorAll(POINTER)]
        .map((e, i) => [i, e.getAttribute("opacity")] as const)
        .filter(([, o]) => o === "0.5")
        .map(([i]) => i);
    const first = litKeys();
    rerender(<LayoutContainerComponent nextText="e" highlightOpacity={0.5} />);
    const second = litKeys();
    expect(first).toHaveLength(1);
    expect(second).toHaveLength(1);
    expect(second).not.toEqual(first);
  });
});
