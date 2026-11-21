import { beforeEach, describe, expect, it, vi } from "vitest";

const addListener = vi.fn();
const openOptionsPage = vi.fn();
vi.mock("webextension-polyfill", () => ({
  default: { action: { onClicked: { addListener } }, runtime: { openOptionsPage } },
}));

const { registerBackground } = await import("./register-background.js");

beforeEach(() => vi.clearAllMocks());

describe("registerBackground", () => {
  it("listens for clicks on the toolbar button, once", () => {
    registerBackground();
    expect(addListener).toHaveBeenCalledTimes(1);
    expect(typeof addListener.mock.calls[0][0]).toBe("function");
  });

  it("does nothing until the button is clicked", () => {
    registerBackground();
    expect(openOptionsPage).not.toHaveBeenCalled();
  });

  it("opens the options page on each click", () => {
    registerBackground();
    const onClick = addListener.mock.calls[0][0] as () => void;
    onClick();
    onClick();
    expect(openOptionsPage).toHaveBeenCalledTimes(2);
  });
});
