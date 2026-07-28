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
});
