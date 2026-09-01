import { describe, expect, it } from "vitest";

import { type Storageish, readBest, writeBest } from "./storage";

function fakeStore(initial: Record<string, string> = {}): Storageish {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
  };
}

describe("best score storage", () => {
  it("round-trips a score", () => {
    const store = fakeStore();
    writeBest(store, 12);
    expect(readBest(store)).toBe(12);
  });

  it("reports no best when nothing is stored", () => {
    expect(readBest(fakeStore())).toBeNull();
  });

  // Safari in private browsing throws outright on access. Losing the best score
  // is acceptable; taking the game down with it is not.
  it("survives a storage that throws on read", () => {
    const store: Storageish = {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => undefined,
    };
    expect(() => readBest(store)).not.toThrow();
    expect(readBest(store)).toBeNull();
  });

  it("survives a storage that throws on write", () => {
    const store: Storageish = {
      getItem: () => null,
      setItem: () => {
        throw new Error("quota");
      },
    };
    expect(() => writeBest(store, 3)).not.toThrow();
  });

  it("discards a stored value that is not a whole score", () => {
    expect(readBest(fakeStore({ "stack-tower:best": "banana" }))).toBeNull();
    expect(readBest(fakeStore({ "stack-tower:best": "-2" }))).toBeNull();
    expect(readBest(fakeStore({ "stack-tower:best": "3.5" }))).toBeNull();
  });

  it("does nothing at all without a store", () => {
    expect(readBest(null)).toBeNull();
    expect(() => writeBest(null, 5)).not.toThrow();
  });
});
