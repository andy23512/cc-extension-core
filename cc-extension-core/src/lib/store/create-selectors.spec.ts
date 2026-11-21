import { act, renderHook } from "@testing-library/react";
import { create } from "zustand";
import { describe, expect, it } from "vitest";
import { createSelectors } from "./create-selectors.js";

interface State {
  count: number;
  label: string;
  inc: () => void;
}

const makeStore = () =>
  createSelectors(
    create<State>((set) => ({
      count: 0,
      label: "a",
      inc: () => set((s) => ({ count: s.count + 1 })),
    })),
  );

describe("createSelectors", () => {
  it("gives the store one hook per state key, functions included", () => {
    const store = makeStore();
    expect(Object.keys(store.use).sort()).toEqual(["count", "inc", "label"]);
    Object.values(store.use).forEach((hook) => expect(typeof hook).toBe("function"));
  });

  it("returns the same store, still usable the ordinary way", () => {
    const base = create<State>(() => ({ count: 1, label: "x", inc: () => undefined }));
    const wrapped = createSelectors(base);
    expect(wrapped).toBe(base);
    expect(wrapped.getState().count).toBe(1);
  });

  it("each hook returns its own piece of state", () => {
    const store = makeStore();
    const { result } = renderHook(() => ({
      count: store.use.count(),
      label: store.use.label(),
      inc: store.use.inc(),
    }));
    expect(result.current.count).toBe(0);
    expect(result.current.label).toBe("a");
    expect(result.current.inc).toBe(store.getState().inc);
  });

  it("re-renders when that piece changes", () => {
    const store = makeStore();
    const { result } = renderHook(() => store.use.count());
    act(() => store.getState().inc());
    expect(result.current).toBe(1);
    act(() => store.setState({ count: 5 }));
    expect(result.current).toBe(5);
  });

  it("does not re-render for a change to a different key", () => {
    const store = makeStore();
    let renders = 0;
    renderHook(() => {
      renders++;
      return store.use.count();
    });
    const before = renders;
    act(() => store.setState({ label: "b" }));
    expect(renders).toBe(before);
  });

  it("only knows the keys the state had when it was wrapped", () => {
    const store = createSelectors(create<{ a: number }>(() => ({ a: 1 })));
    store.setState({ b: 2 } as never);
    expect((store.use as Record<string, unknown>).b).toBeUndefined();
  });
});
