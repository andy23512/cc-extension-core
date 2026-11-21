import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SiteConfig } from "../model/site-config.model.js";

vi.mock("webextension-polyfill", () => ({
  default: {
    storage: {
      local: { get: vi.fn(async (d: unknown) => d), set: vi.fn(async () => undefined), remove: vi.fn(async () => undefined) },
      onChanged: { addListener: vi.fn(), removeListener: vi.fn() },
    },
  },
}));

const download = vi.hoisted(() => vi.fn());
vi.mock("tangent-cc-lib", async (importOriginal) => ({
  ...(await importOriginal<typeof import("tangent-cc-lib")>()),
  downloadDeviceLayout: download,
}));

const { useSettingsStore } = await import("../store/settings-store.js");
const { default: OptionsComponent, OptionsComponent: Named } = await import("./options.component.js");
const { PRESET_DEVICE_LAYOUTS } = await import("../data/device-layouts.js");

const config: SiteConfig = { id: "keybr", siteName: "Keybr", readNextText: () => null };
const state = () => useSettingsStore.getState();
const custom = (id: string) => ({ id, name: id, layout: [[]] }) as never;

const DEFAULTS = {
  layoutType: "3d" as "3d" | "lite",
  layout: "cc1",
  liteLayout: "cclite",
  customDeviceLayouts: [] as never[],
  liteCustomDeviceLayouts: [] as never[],
  showThumb3Switch: true,
  highlightKeysEnabled: true,
  selectedKeyboardLayoutId: "us",
};

beforeEach(async () => {
  await useSettingsStore.persist.rehydrate();
  useSettingsStore.setState(DEFAULTS);
  download.mockClear();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const open = () => render(<OptionsComponent config={config} />);
const setStore = (patch: Partial<typeof DEFAULTS>) =>
  act(() => {
    useSettingsStore.setState(patch);
  });

/** Choose a file the way the browser would: FileReader reads it, then onload runs. */
async function chooseFile(content: string, name = "backup.json") {
  const input = document.querySelector("input[type=file]") as HTMLInputElement;
  const file = new File([content], name, { type: "application/json" });
  await act(async () => {
    fireEvent.change(input, { target: { files: [file] } });
    await new Promise((r) => setTimeout(r, 30));
  });
}

describe("OptionsComponent: page", () => {
  it("is the default export as well as the named one", () => {
    expect(OptionsComponent).toBe(Named);
  });

  it("titles the page with the site's name", () => {
    open();
    expect(screen.getByText("Keybr CC Extension - Options")).toBeTruthy();
  });

  it("lists every setting once", () => {
    open();
    for (const text of [
      "Select a layout type.",
      "Select a loaded device layout.",
      "Show Thumb 3 Switch",
      "Highlight Keys",
      "Select an OS keyboard layout.",
      "Choose File",
      "Export",
    ]) {
      expect(screen.getAllByText(text, { exact: false }), text).toHaveLength(1);
    }
  });

  it("starts with no status message", () => {
    open();
    expect(screen.queryByText("Setting saved.")).toBeNull();
  });
});

describe("OptionsComponent: layout type", () => {
  it("shows the current type pressed", () => {
    open();
    expect(screen.getByText("3D input device").getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText("Lite").getAttribute("aria-pressed")).toBe("false");
    cleanup();
    setStore({ layoutType: "lite" });
    open();
    expect(screen.getByText("Lite").getAttribute("aria-pressed")).toBe("true");
  });

  it("switches to Lite and says it saved", () => {
    open();
    fireEvent.click(screen.getByText("Lite"));
    expect(state().layoutType).toBe("lite");
    expect(screen.getByText("Setting saved.")).toBeTruthy();
    expect(screen.getByText("Lite").getAttribute("aria-pressed")).toBe("true");
  });

  it("switches back to 3D", () => {
    setStore({ layoutType: "lite" });
    open();
    fireEvent.click(screen.getByText("3D input device"));
    expect(state().layoutType).toBe("3d");
  });

  // KNOWN BUG: the toggle group is `exclusive`, so clicking the pressed button calls onChange with
  // `null`, and handleLayoutTypeChange stores it (and says "Setting saved."). The page still draws as
  // 3D, but `null` is persisted. `it.fails` passes while this is broken and turns red once it is
  // fixed, as a reminder to drop `.fails`.
  it.fails("keeps the layout type when the pressed button is clicked again", () => {
    open();
    fireEvent.click(screen.getByText("3D input device"));
    expect(state().layoutType).toBe("3d");
  });

  it("offers the Lite default layout under Lite, and the 3D presets under 3D", async () => {
    open();
    fireEvent.mouseDown(screen.getAllByRole("combobox")[0]);
    const three = within(await screen.findByRole("listbox")).getAllByRole("option").map((o) => o.textContent);
    expect(three).toEqual([
      "CharaChorder One / CharaChorder Two / CCU - Default",
      "Master Forge - Default",
      "CharaChorder One / CharaChorder Two / CCU - Left Hand Only",
      "CharaChorder One / CharaChorder Two / CCU - Right Hand Only",
    ]);
    cleanup();
    setStore({ layoutType: "lite", layout: "cclite" });
    open();
    fireEvent.mouseDown(screen.getAllByRole("combobox")[0]);
    const lite = within(await screen.findByRole("listbox")).getAllByRole("option").map((o) => o.textContent);
    expect(lite).toEqual(["CharaChorder Lite - Default"]);
  });
});

describe("OptionsComponent: device layout choice", () => {
  const pick = async (label: string) => {
    fireEvent.mouseDown(screen.getAllByRole("combobox")[0]);
    fireEvent.click(await screen.findByRole("option", { name: label }));
  };

  it("lists imported layouts after the presets", async () => {
    setStore({ customDeviceLayouts: [custom("mine.json"), custom("other.json")] });
    open();
    fireEvent.mouseDown(screen.getAllByRole("combobox")[0]);
    const options = within(await screen.findByRole("listbox")).getAllByRole("option").map((o) => o.textContent);
    expect(options.slice(-2)).toEqual(["mine.json", "other.json"]);
    expect(options).toHaveLength(6);
  });

  it("picking Master Forge selects it, hides Thumb 3 and says it saved", async () => {
    open();
    await pick("Master Forge - Default");
    expect(state().layout).toBe("m4g");
    expect(state().showThumb3Switch).toBe(false);
    expect(await screen.findByText("Setting saved.")).toBeTruthy();
  });

  it("picking the default CharaChorder One layout selects it and shows Thumb 3", async () => {
    setStore({ layout: "m4g", showThumb3Switch: false });
    open();
    await pick("CharaChorder One / CharaChorder Two / CCU - Default");
    expect(state().layout).toBe("cc1");
    expect(state().showThumb3Switch).toBe(true);
  });

  it("keeps the Thumb 3 choice for the other layouts", async () => {
    setStore({ showThumb3Switch: false });
    open();
    await pick("CharaChorder One / CharaChorder Two / CCU - Left Hand Only");
    expect(state().layout).toBe("cc1-left-hand-only");
    expect(state().showThumb3Switch).toBe(false);
    cleanup();
    setStore({ showThumb3Switch: true });
    open();
    await pick("CharaChorder One / CharaChorder Two / CCU - Right Hand Only");
    expect(state().layout).toBe("cc1-right-hand-only");
    expect(state().showThumb3Switch).toBe(true);
  });

  it("keeps the Thumb 3 choice when an imported layout is picked", async () => {
    setStore({ customDeviceLayouts: [custom("mine.json")], showThumb3Switch: false });
    open();
    await pick("mine.json");
    expect(state().layout).toBe("mine.json");
    expect(state().showThumb3Switch).toBe(false);
  });

  it("under Lite, saves the Lite layout and leaves the 3D one alone", async () => {
    setStore({ layoutType: "lite", layout: "keep-me" });
    open();
    await pick("CharaChorder Lite - Default");
    expect(state().liteLayout).toBe("cclite");
    expect(state().layout).toBe("keep-me");
  });
});

describe("OptionsComponent: checkboxes", () => {
  const box = (label: string) => screen.getByLabelText(label) as HTMLInputElement;

  it("shows the saved values", () => {
    setStore({ showThumb3Switch: false, highlightKeysEnabled: true });
    open();
    expect(box("Show Thumb 3 Switch").checked).toBe(false);
    expect(box("Highlight Keys").checked).toBe(true);
  });

  it("toggles Thumb 3 and says it saved", () => {
    open();
    fireEvent.click(box("Show Thumb 3 Switch"));
    expect(state().showThumb3Switch).toBe(false);
    expect(screen.getByText("Setting saved.")).toBeTruthy();
    fireEvent.click(box("Show Thumb 3 Switch"));
    expect(state().showThumb3Switch).toBe(true);
  });

  it("toggles Highlight Keys and says it saved", () => {
    open();
    fireEvent.click(box("Highlight Keys"));
    expect(state().highlightKeysEnabled).toBe(false);
    expect(screen.getByText("Setting saved.")).toBeTruthy();
    fireEvent.click(box("Highlight Keys"));
    expect(state().highlightKeysEnabled).toBe(true);
  });

  it("greys out Thumb 3 under Lite (the Lite keyboard has none), but not Highlight Keys", () => {
    setStore({ layoutType: "lite" });
    open();
    expect(box("Show Thumb 3 Switch").disabled).toBe(true);
    expect(box("Highlight Keys").disabled).toBe(false);
  });

  it("leaves Thumb 3 enabled under 3D", () => {
    open();
    expect(box("Show Thumb 3 Switch").disabled).toBe(false);
  });
});

describe("OptionsComponent: OS keyboard layout", () => {
  const input = () => document.querySelector(".MuiAutocomplete-root input") as HTMLInputElement;

  it("shows the chosen keyboard layout's name", () => {
    open();
    expect(input().value).toBe("US");
  });

  it("falls back to US when the saved id no longer exists", () => {
    setStore({ selectedKeyboardLayoutId: "no-such-layout" });
    open();
    expect(input().value).toBe("US");
  });

  it("shows another layout when it is saved", () => {
    setStore({ selectedKeyboardLayoutId: "german" });
    open();
    expect(input().value).toBe("German");
  });

  it("saves the layout picked from the list", async () => {
    open();
    act(() => {
      input().focus();
    });
    fireEvent.keyDown(input(), { key: "ArrowDown" });
    fireEvent.change(input(), { target: { value: "German" } });
    const option = await screen.findByRole("option", { name: "German" });
    fireEvent.click(option);
    expect(state().selectedKeyboardLayoutId).toBe("german");
    expect(screen.getByText("Setting saved.")).toBeTruthy();
  });

  it("goes back to US when the field is cleared", async () => {
    setStore({ selectedKeyboardLayoutId: "german" });
    open();
    act(() => {
      input().focus();
    });
    const clear = document.querySelector(".MuiAutocomplete-clearIndicator") as HTMLElement;
    fireEvent.click(clear);
    expect(state().selectedKeyboardLayoutId).toBe("us");
  });
});

describe("OptionsComponent: the saved message", () => {
  it("disappears after one second", () => {
    vi.useFakeTimers();
    open();
    fireEvent.click(screen.getByText("Lite"));
    expect(screen.getByText("Setting saved.")).toBeTruthy();
    act(() => {
      vi.advanceTimersByTime(999);
    });
    expect(screen.queryByText("Setting saved.")).not.toBeNull();
    act(() => {
      vi.advanceTimersByTime(2);
    });
    expect(screen.queryByText("Setting saved.")).toBeNull();
  });
});

describe("OptionsComponent: importing a layout file", () => {
  const history = (device: string, layout: unknown) => JSON.stringify({ history: [[{ type: "layout", device, layout }]] });

  it("accepts only .json files", () => {
    open();
    expect((document.querySelector("input[type=file]") as HTMLInputElement).accept).toBe(".json");
  });

  it("adds a layout from a device backup, selects it and says it saved", async () => {
    open();
    await chooseFile(history("ONE", [[1]]), "mine.json");
    expect(state().customDeviceLayouts).toEqual([{ id: "mine.json", name: "mine.json", layout: [[1]] }]);
    expect(state().layout).toBe("mine.json");
    expect(screen.getByText("Setting saved.")).toBeTruthy();
  });

  it("adds a single exported layout file the same way", async () => {
    open();
    await chooseFile(JSON.stringify({ layout: [[2]] }), "single.json");
    expect(state().customDeviceLayouts).toEqual([{ id: "single.json", name: "single.json", layout: [[2]] }]);
    expect(state().layout).toBe("single.json");
  });

  it("replaces an earlier import of the same file instead of listing it twice", async () => {
    setStore({ customDeviceLayouts: [custom("a.json"), { id: "mine.json", name: "mine.json", layout: [["old"]] } as never] });
    open();
    await chooseFile(history("TWO", [["new"]]), "mine.json");
    expect(state().customDeviceLayouts.map((l) => l.id)).toEqual(["a.json", "mine.json"]);
    expect((state().customDeviceLayouts[1] as { layout: unknown }).layout).toEqual([["new"]]);
  });

  it("takes only a Lite layout under Lite, and a 3D device layout under 3D", async () => {
    open();
    await chooseFile(history("LITE", [[1]]), "lite.json");
    expect(state().customDeviceLayouts).toEqual([]);
    expect(state().layout).toBe("cc1");
    expect(screen.queryByText("Setting saved.")).toBeNull();
    cleanup();
    setStore({ layoutType: "lite" });
    open();
    await chooseFile(history("ONE", [[1]]), "one.json");
    expect(state().liteCustomDeviceLayouts).toEqual([]);
  });

  it("stores a Lite import in the Lite list", async () => {
    setStore({ layoutType: "lite" });
    open();
    await chooseFile(history("LITE", [[9]]), "lite.json");
    expect(state().liteCustomDeviceLayouts).toEqual([{ id: "lite.json", name: "lite.json", layout: [[9]] }]);
    expect(state().liteLayout).toBe("lite.json");
    expect(state().customDeviceLayouts).toEqual([]);
  });

  it("ignores an empty file and does nothing when no file is chosen", async () => {
    open();
    await chooseFile("", "empty.json");
    expect(state().customDeviceLayouts).toEqual([]);
    const input = document.querySelector("input[type=file]") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [] } });
    expect(state().customDeviceLayouts).toEqual([]);
    expect(screen.queryByText("Setting saved.")).toBeNull();
  });

  it("ignores a backup with no layout for the device", async () => {
    open();
    await chooseFile(JSON.stringify({ history: [[{ type: "chords", device: "ONE" }]] }), "x.json");
    expect(state().customDeviceLayouts).toEqual([]);
    expect(screen.queryByText("Setting saved.")).toBeNull();
  });

  it("ignores a literal null", async () => {
    open();
    await chooseFile("null", "null.json");
    expect(state().customDeviceLayouts).toEqual([]);
  });

  it("lists the imported layout in the dropdown straight away", async () => {
    open();
    await chooseFile(history("ONE", [[1]]), "fresh.json");
    fireEvent.mouseDown(screen.getAllByRole("combobox")[0]);
    const options = within(await screen.findByRole("listbox")).getAllByRole("option").map((o) => o.textContent);
    expect(options).toContain("fresh.json");
  });
});

describe("OptionsComponent: exporting", () => {
  it("downloads the preset that is selected", () => {
    open();
    fireEvent.click(screen.getByText("Export"));
    expect(download).toHaveBeenCalledTimes(1);
    expect(download).toHaveBeenCalledWith(PRESET_DEVICE_LAYOUTS.find((l) => l.id === "cc1"));
  });

  it("downloads an imported layout when that is selected", () => {
    const mine = custom("mine.json");
    setStore({ customDeviceLayouts: [mine], layout: "mine.json" });
    open();
    fireEvent.click(screen.getByText("Export"));
    expect(download).toHaveBeenCalledWith(mine);
  });

  it("downloads the Lite layout under Lite", () => {
    setStore({ layoutType: "lite", liteLayout: "cclite" });
    open();
    fireEvent.click(screen.getByText("Export"));
    expect(download).toHaveBeenCalledTimes(1);
    expect((download.mock.calls[0][0] as { id: string }).id).toBe("cclite");
  });

  it("does nothing when the selected layout is no longer there", () => {
    setStore({ layout: "gone.json" });
    open();
    fireEvent.click(screen.getByText("Export"));
    expect(download).not.toHaveBeenCalled();
  });
});
