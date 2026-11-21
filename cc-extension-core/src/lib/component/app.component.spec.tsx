import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("webextension-polyfill", () => ({
  default: {
    storage: {
      local: { get: vi.fn(async (d: unknown) => d), set: vi.fn(async () => undefined), remove: vi.fn(async () => undefined) },
      onChanged: { addListener: vi.fn(), removeListener: vi.fn() },
    },
  },
}));

// The text the overlay reads is whatever the site reader returns right now.
vi.mock("../hook/use-next-text.js", () => ({ useNextText: (read: () => string | null) => read() }));

const container = vi.hoisted(() => ({ props: [] as Record<string, unknown>[] }));
vi.mock("./layout-container.component.js", () => ({
  default: (props: Record<string, unknown>) => {
    container.props.push(props);
    return <div data-testid="layout" />;
  },
}));

type MoveableProps = Record<string, any>;
const moveable = vi.hoisted(() => ({ props: [] as MoveableProps[] }));
vi.mock("react-moveable", () => ({
  default: (props: MoveableProps) => {
    moveable.props.push(props);
    return <div data-testid="moveable" />;
  },
}));

// jsdom has no ResizeObserver.
const observers: FakeResizeObserver[] = [];
class FakeResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  constructor(public callback: (entries: { contentRect: { width: number; height: number } }[]) => void) {
    observers.push(this);
  }
  fire(width: number, height: number) {
    act(() => this.callback([{ contentRect: { width, height } }]));
  }
}

const { useSettingsStore } = await import("../store/settings-store.js");
const { default: AppComponent } = await import("./app.component.js");
const { getViewBoxAspectRatio } = await import("../util/layout-dimension.util.js");
const { LITE_ASPECT_RATIO } = await import("../util/lite.util.js");

const DEFAULTS = {
  layoutType: "3d" as const,
  height: 250,
  xPosition: 0.5,
  yPosition: 1,
  opacity: 1,
  liteHeight: 250,
  liteXPosition: 0.5,
  liteYPosition: 1,
  liteOpacity: 1,
  showThumb3Switch: true,
};
const state = () => useSettingsStore.getState();

function hostElement(width = 1000, height = 800) {
  const el = document.createElement("div");
  Object.defineProperty(el, "clientWidth", { value: width });
  Object.defineProperty(el, "clientHeight", { value: height });
  return el;
}

function setup(over: { text?: string | null; opacity?: number; host?: HTMLDivElement } = {}) {
  const host = over.host ?? hostElement();
  const readNextText = vi.fn(() => ("text" in over ? over.text! : "abc"));
  const utils = render(<AppComponent containerElement={host} readNextText={readNextText} highlightOpacity={over.opacity ?? 0.5} />);
  const main = utils.container.firstElementChild as HTMLElement;
  return { ...utils, host, main, readNextText };
}

const lastMoveable = () => moveable.props.at(-1)!;
const clickButton = (name: string) => fireEvent.click(screen.getByText(name));
const enterEditMode = () => clickButton("settings");

beforeEach(async () => {
  vi.stubGlobal("ResizeObserver", FakeResizeObserver);
  observers.length = 0;
  container.props.length = 0;
  moveable.props.length = 0;
  // Let the store's async persistence hydration finish first, so it cannot land after a test's own updates.
  await useSettingsStore.persist.rehydrate();
  useSettingsStore.setState(DEFAULTS);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("AppComponent: showing and hiding", () => {
  it("shows the layout while the site has text to type", () => {
    const { main } = setup({ text: "abc" });
    expect(main.classList.contains("invisible")).toBe(false);
    expect(lastMoveable().className).not.toContain("!invisible");
  });

  it.each([null, ""])("hides the overlay (and its drag frame) when the text is %j", (text) => {
    const { main } = setup({ text });
    expect(main.classList.contains("invisible")).toBe(true);
    expect(lastMoveable().className).toContain("!invisible");
  });

  it("hands the text and the highlight opacity to the layout", () => {
    setup({ text: "hello", opacity: 0.7 });
    expect(container.props.at(-1)).toEqual({ nextText: "hello", highlightOpacity: 0.7 });
  });

  it("asks the site for text through the hook", () => {
    const { readNextText } = setup();
    expect(readNextText).toHaveBeenCalled();
  });

  it("lets clicks through to the page until edit mode is on", () => {
    const { main } = setup();
    expect(main.classList.contains("pointer-events-none")).toBe(true);
    expect(main.classList.contains("pointer-events-auto")).toBe(false);
    enterEditMode();
    expect(main.classList.contains("pointer-events-auto")).toBe(true);
    expect(main.classList.contains("pointer-events-none")).toBe(false);
  });
});

describe("AppComponent: size and position", () => {
  it("is 250 high and as wide as the 3D layout's aspect ratio, in the lower middle of the container", () => {
    const { main } = setup();
    const width = 250 * getViewBoxAspectRatio(true);
    expect(main.style.height).toBe("250px");
    expect(parseFloat(main.style.width)).toBeCloseTo(width, 6);
    // 8 px margin, centred: 8 + ((1000 - 8 - width) - 8) * 0.5; bottom: 8 + ((800 - 8 - 250) - 8) * 1
    expect(parseFloat(main.style.left)).toBeCloseTo(8 + (1000 - 8 - width - 8) * 0.5, 6);
    expect(main.style.top).toBe("542px");
    expect(main.style.opacity).toBe("1");
  });

  it("is narrower without the third thumb switch's extra row being needed: width follows the aspect ratio", () => {
    useSettingsStore.setState({ showThumb3Switch: false });
    const { main } = setup();
    expect(parseFloat(main.style.width)).toBeCloseTo(250 * getViewBoxAspectRatio(false), 6);
    expect(parseFloat(main.style.width)).toBeGreaterThan(250 * getViewBoxAspectRatio(true));
  });

  it("follows the saved position, size and opacity", () => {
    useSettingsStore.setState({ height: 100, xPosition: 0, yPosition: 0, opacity: 0.4 });
    const { main } = setup();
    expect(main.style.height).toBe("100px");
    expect(main.style.left).toBe("8px");
    expect(main.style.top).toBe("8px");
    expect(main.style.opacity).toBe("0.4");
  });

  it("uses the Lite settings and the Lite aspect ratio under the Lite layout", () => {
    useSettingsStore.setState({ layoutType: "lite", liteHeight: 120, liteXPosition: 0, liteYPosition: 1, liteOpacity: 0.6, height: 999, opacity: 0.1 });
    const { main } = setup();
    expect(main.style.height).toBe("120px");
    expect(parseFloat(main.style.width)).toBeCloseTo(120 * LITE_ASPECT_RATIO, 6);
    expect(main.style.opacity).toBe("0.6");
    expect(main.style.left).toBe("8px");
    expect(parseFloat(main.style.top)).toBeCloseTo(8 + (800 - 8 - 120 - 8), 6);
  });

  it("has a minimum height class so a tiny setting cannot make it vanish", () => {
    expect(setup().main.className).toContain("min-h-32");
  });

  it("moves when the container is resized, and leaves edit mode", () => {
    const { main } = setup();
    enterEditMode();
    expect(main.classList.contains("pointer-events-auto")).toBe(true);
    const before = main.style.top;
    observers[0].fire(600, 500);
    expect(main.style.top).toBe(`${8 + (500 - 8 - 250 - 8)}px`);
    expect(main.style.top).not.toBe(before);
    expect(main.classList.contains("pointer-events-auto")).toBe(false);
  });

  it("watches its container, and stops when it goes away", () => {
    const { host, unmount } = setup();
    expect(observers).toHaveLength(1);
    expect(observers[0].observe).toHaveBeenCalledWith(host);
    unmount();
    expect(observers[0].unobserve).toHaveBeenCalledWith(host);
    expect(observers[0].disconnect).toHaveBeenCalled();
  });

  it("starts from the container's current size", () => {
    const { main } = setup({ host: hostElement(2000, 1000) });
    expect(main.style.top).toBe(`${8 + (1000 - 8 - 250 - 8)}px`);
  });
});

describe("AppComponent: edit mode", () => {
  it("starts with only the settings button, dimmed", () => {
    setup();
    expect(screen.getByText("settings").className).toContain("opacity-50");
    expect(screen.queryByText("replay")).toBeNull();
    expect(screen.queryByText("info")).toBeNull();
  });

  it("turns on and off with the settings button, which lights up while on", () => {
    setup();
    const button = screen.getByText("settings");
    enterEditMode();
    expect(button.className).toContain("bg-(--cc-pointer-color)");
    expect(button.className).toContain("opacity-100");
    expect(button.className).not.toContain("opacity-50");
    expect(screen.getByText("replay")).toBeTruthy();
    expect(screen.getByText("info")).toBeTruthy();
    clickButton("settings");
    expect(button.className).toContain("opacity-50");
    expect(screen.queryByText("replay")).toBeNull();
    expect(screen.queryByText("info")).toBeNull();
  });

  it("lets the drag frame attach to the overlay only in edit mode", () => {
    const { main } = setup();
    expect(lastMoveable().target).toBeNull();
    enterEditMode();
    expect(lastMoveable().target.current).toBe(main);
    clickButton("settings");
    expect(lastMoveable().target).toBeNull();
  });

  it("the reset button restores the default size, position and opacity and leaves edit mode", () => {
    useSettingsStore.setState({ height: 400, xPosition: 0.1, yPosition: 0.2, opacity: 0.3 });
    const { main } = setup();
    enterEditMode();
    clickButton("replay");
    expect(state()).toMatchObject({ height: 250, xPosition: 0.5, yPosition: 1, opacity: 1 });
    expect(main.classList.contains("pointer-events-auto")).toBe(false);
    expect(screen.queryByText("replay")).toBeNull();
  });

  it("reset under the Lite layout restores only the Lite values", () => {
    useSettingsStore.setState({ layoutType: "lite", height: 400, liteHeight: 400, liteOpacity: 0.3 });
    setup();
    enterEditMode();
    clickButton("replay");
    expect(state()).toMatchObject({ liteHeight: 250, liteOpacity: 1, height: 400 });
  });

  describe("info popover", () => {
    it("explains the controls when the info button is pressed", async () => {
      setup();
      enterEditMode();
      expect(screen.queryByText(/Drag to move/)).toBeNull();
      clickButton("info");
      expect(await screen.findByText(/Drag to move/)).toBeTruthy();
      expect(screen.getByText(/Scroll up or down to adjust the transparency/)).toBeTruthy();
      expect(screen.getByText(/Click the reset button on the left/)).toBeTruthy();
    });

    it("closes with Escape", async () => {
      setup();
      enterEditMode();
      clickButton("info");
      await screen.findByText(/Drag to move/);
      fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
      await waitFor(() => expect(screen.queryByText(/Drag to move/)).toBeNull());
    });
  });
});

describe("AppComponent: mouse wheel", () => {
  const wheel = (el: HTMLElement, deltaY: number) => fireEvent.wheel(el, { deltaY });

  it("does nothing outside edit mode", () => {
    const { main } = setup();
    wheel(main, -100);
    wheel(main, 100);
    expect(state().opacity).toBe(1);
  });

  it("scrolling down dims by 0.1 a notch and scrolling up brightens", () => {
    const { main } = setup();
    enterEditMode();
    wheel(main, 100);
    expect(state().opacity).toBeCloseTo(0.9, 10);
    wheel(main, 100);
    expect(state().opacity).toBeCloseTo(0.8, 10);
    wheel(main, -100);
    expect(state().opacity).toBeCloseTo(0.9, 10);
  });

  it("stops at 0.2 and at 1", () => {
    useSettingsStore.setState({ opacity: 0.25 });
    const { main } = setup();
    enterEditMode();
    wheel(main, 100);
    wheel(main, 100);
    expect(state().opacity).toBeCloseTo(0.2, 10);
    act(() => {
      useSettingsStore.setState({ opacity: 0.95 });
    });
    wheel(main, -100);
    wheel(main, -100);
    expect(state().opacity).toBe(1);
  });

  it("ignores a wheel event with no vertical movement", () => {
    const { main } = setup();
    enterEditMode();
    act(() => {
      useSettingsStore.setState({ opacity: 0.5 });
    });
    wheel(main, 0);
    expect(state().opacity).toBe(0.5);
  });

  it("changes the Lite opacity under the Lite layout", () => {
    useSettingsStore.setState({ layoutType: "lite", liteOpacity: 1, opacity: 1 });
    const { main } = setup();
    enterEditMode();
    wheel(main, 100);
    expect(state().liteOpacity).toBeCloseTo(0.9, 10);
    expect(state().opacity).toBe(1);
  });

  it("keeps the page from scrolling under the cursor while editing, and not otherwise", () => {
    setup();
    const scroll = (target: EventTarget) => {
      const event = new WheelEvent("wheel", { deltaY: 100, cancelable: true, bubbles: true });
      target.dispatchEvent(event);
      return event.defaultPrevented;
    };
    expect(scroll(document.body)).toBe(false);
    expect(scroll(window)).toBe(false);
    enterEditMode();
    expect(scroll(document.body)).toBe(true);
    expect(scroll(window)).toBe(true);
    clickButton("settings");
    expect(scroll(document.body)).toBe(false);
    expect(scroll(window)).toBe(false);
  });

  it("gives the page its scrolling back when the overlay is removed", () => {
    const { unmount } = setup();
    enterEditMode();
    unmount();
    const event = new WheelEvent("wheel", { deltaY: 100, cancelable: true, bubbles: true });
    document.body.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });
});

describe("AppComponent: dragging and resizing", () => {
  const box = (left: number, top: number, width: number, height: number) =>
    ({ target: { getBoundingClientRect: () => ({ left, top, width, height }) } }) as never;

  it("turns on dragging, resizing with a fixed ratio, snapping to the middle, and an 8 px margin", () => {
    setup();
    const p = lastMoveable();
    expect(p.draggable).toBe(true);
    expect(p.resizable).toBe(true);
    expect(p.keepRatio).toBe(true);
    expect(p.snappable).toBe(true);
    expect(p.useResizeObserver).toBe(true);
    expect(p.padding).toEqual({ left: 8, right: 8, top: 8, bottom: 8 });
    expect(p.bounds).toEqual({ left: 8, top: 8, right: 8, bottom: 8, position: "css" });
    expect(p.snapDirections).toEqual({ center: true, middle: true });
    expect(p.className).toContain("pointer-events-auto");
  });

  it("moves the element while dragging", () => {
    setup();
    const target = document.createElement("div");
    lastMoveable().onDrag({ target, left: 120, top: 80 });
    expect(target.style.left).toBe("120px");
    expect(target.style.top).toBe("80px");
  });

  it("sizes and places the element while resizing", () => {
    setup();
    const target = document.createElement("div");
    lastMoveable().onResize({ target, width: 300, height: 150, drag: { left: 40, top: 60 } });
    expect([target.style.width, target.style.height, target.style.left, target.style.top]).toEqual(["300px", "150px", "40px", "60px"]);
  });

  it.each(["onDragEnd", "onResizeEnd"])("%s saves the new position (as 0–1) and height", (handler) => {
    setup();
    // container 1000 x 800: x from 8 to 1000-8-200, y from 8 to 800-8-100
    act(() => {
      lastMoveable()[handler](box(8, 8, 200, 100));
    });
    expect(state().xPosition).toBe(0);
    expect(state().yPosition).toBe(0);
    expect(state().height).toBe(100);
    act(() => {
      lastMoveable()[handler](box(1000 - 8 - 200, 800 - 8 - 100, 200, 100));
    });
    expect(state().xPosition).toBe(1);
    expect(state().yPosition).toBe(1);
    act(() => {
      lastMoveable()[handler](box(8 + (1000 - 16 - 200 - 8) / 2 + 4, 8, 200, 100));
    });
    expect(state().xPosition).toBeCloseTo(0.5, 6);
  });

  it("clamps a drag that ends outside the container into 0–1", () => {
    setup();
    act(() => {
      lastMoveable().onDragEnd(box(-500, -500, 200, 100));
    });
    expect([state().xPosition, state().yPosition]).toEqual([0, 0]);
    act(() => {
      lastMoveable().onDragEnd(box(5000, 5000, 200, 100));
    });
    expect([state().xPosition, state().yPosition]).toEqual([1, 1]);
  });

  it("saves into the Lite settings under the Lite layout", () => {
    useSettingsStore.setState({ layoutType: "lite" });
    setup();
    act(() => {
      lastMoveable().onDragEnd(box(8, 8, 200, 90));
    });
    expect(state()).toMatchObject({ liteXPosition: 0, liteYPosition: 0, liteHeight: 90, height: 250, xPosition: 0.5 });
  });

  it("measures against the container's current size after it was resized", () => {
    setup();
    observers[0].fire(600, 500);
    act(() => {
      lastMoveable().onDragEnd(box(600 - 8 - 200, 500 - 8 - 100, 200, 100));
    });
    expect([state().xPosition, state().yPosition]).toEqual([1, 1]);
  });
});
