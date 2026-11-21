import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useNextText } from "./use-next-text.js";

// React state updates from a fired timer must be flushed inside act().
function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

describe("useNextText", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("reads the text immediately on mount", () => {
    const readNextText = vi.fn(() => "abc");
    const { result } = renderHook(() => useNextText(readNextText));
    expect(readNextText).toHaveBeenCalledTimes(1);
    expect(result.current).toBe("abc");
  });

  it("re-reads on each poll interval and returns the latest value", () => {
    const readNextText = vi
      .fn()
      .mockReturnValueOnce("a")
      .mockReturnValueOnce("ab")
      .mockReturnValue("abc");
    const { result } = renderHook(() => useNextText(readNextText));

    expect(result.current).toBe("a");
    advance(100);
    expect(result.current).toBe("ab");
    advance(100);
    expect(result.current).toBe("abc");
    expect(readNextText).toHaveBeenCalledTimes(3);
  });

  it("surfaces null when there is no typing test on screen", () => {
    const { result } = renderHook(() => useNextText(() => null));
    expect(result.current).toBeNull();
  });

  it("stops polling after unmount", () => {
    const readNextText = vi.fn(() => "x");
    const { unmount } = renderHook(() => useNextText(readNextText));
    expect(readNextText).toHaveBeenCalledTimes(1);

    unmount();
    advance(1000);
    // No further reads once the interval is cleared.
    expect(readNextText).toHaveBeenCalledTimes(1);
  });

  it("reads again every 100 ms, and not before", () => {
    const readNextText = vi.fn(() => "x");
    renderHook(() => useNextText(readNextText));
    advance(99);
    expect(readNextText).toHaveBeenCalledTimes(1);
    advance(1);
    expect(readNextText).toHaveBeenCalledTimes(2);
    advance(300);
    expect(readNextText).toHaveBeenCalledTimes(5);
  });

  it("does not render again while the text stays the same", () => {
    let renders = 0;
    renderHook(() => {
      renders += 1;
      return useNextText(() => "same");
    });
    const after = renders;
    advance(1000);
    expect(renders).toBe(after);
  });

  it("leaves no timer behind after unmount", () => {
    const { unmount } = renderHook(() => useNextText(() => "x"));
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("switches to a new reader and stops using the old one", () => {
    const a = vi.fn(() => "from a");
    const b = vi.fn(() => "from b");
    const { result, rerender } = renderHook(({ read }) => useNextText(read), {
      initialProps: { read: a },
    });
    expect(result.current).toBe("from a");
    rerender({ read: b });
    expect(result.current).toBe("from b");
    const aCalls = a.mock.calls.length;
    advance(300);
    expect(a).toHaveBeenCalledTimes(aCalls);
    expect(vi.getTimerCount()).toBe(1);
  });

  it("keeps one timer when re-rendered with the same reader", () => {
    const read = () => "x";
    const { rerender } = renderHook(() => useNextText(read));
    rerender();
    rerender();
    expect(vi.getTimerCount()).toBe(1);
  });
});
