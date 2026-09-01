import { describe, expect, it } from "vitest";

import { BASE_WIDTH, FIELD, SNAP, createGame, drop, overlap, spawn } from "./rules";

// The geometry is the game. It is pure arithmetic on normalised field units so
// it can be asserted without a DOM — JSDOM reports every rect as zero, so any
// test that measured real layout would pass for the wrong reason.
describe("overlap", () => {
  it("returns the shared span of two partly aligned blocks", () => {
    expect(overlap({ x: 10, width: 40 }, { x: 30, width: 40 })).toEqual({
      x: 30,
      width: 20,
    });
  });

  it("returns the whole block when perfectly aligned", () => {
    expect(overlap({ x: 30, width: 40 }, { x: 30, width: 40 })).toEqual({
      x: 30,
      width: 40,
    });
  });

  it("returns zero width when the blocks only touch at an edge", () => {
    expect(overlap({ x: 0, width: 30 }, { x: 30, width: 40 }).width).toBe(0);
  });

  it("returns zero width when the blocks are clear of each other", () => {
    expect(overlap({ x: 0, width: 10 }, { x: 60, width: 40 }).width).toBe(0);
  });
});

describe("spawn", () => {
  it("enters from the left on an even score", () => {
    expect(spawn(0, 40)).toEqual({ x: 0, width: 40, dir: 1 });
  });

  it("enters from the right on an odd score", () => {
    expect(spawn(1, 40)).toEqual({ x: FIELD - 40, width: 40, dir: -1 });
  });
});

describe("drop", () => {
  it("trims the block to its overlap and keeps playing", () => {
    const state = createGame();
    const next = drop({ ...state, slider: { x: 40, width: 40, dir: 1 } });

    expect(next.status).toBe("playing");
    expect(next.stack).toHaveLength(2);
    expect(next.stack[1]).toEqual({ x: 40, width: 30 });
    expect(next.score).toBe(1);
  });

  it("snaps flush and keeps the full width inside the tolerance", () => {
    const state = createGame();
    const next = drop({
      ...state,
      slider: { x: state.stack[0].x + SNAP, width: BASE_WIDTH, dir: 1 },
    });

    expect(next.stack[1]).toEqual({ x: state.stack[0].x, width: BASE_WIDTH });
  });

  it("trims rather than snapping just outside the tolerance", () => {
    const state = createGame();
    const next = drop({
      ...state,
      slider: { x: state.stack[0].x + SNAP + 0.5, width: BASE_WIDTH, dir: 1 },
    });

    expect(next.stack[1].width).toBeLessThan(BASE_WIDTH);
  });

  it("never lets a block grow wider than the one beneath it", () => {
    let state = createGame();
    const widths = [state.stack[0].width];

    for (const x of [35, 31, 44, 46, 50]) {
      state = drop({ ...state, slider: { ...state.slider, x } });
      if (state.status === "over") break;
      widths.push(state.stack[state.stack.length - 1].width);
    }

    for (let i = 1; i < widths.length; i++) {
      expect(widths[i]).toBeLessThanOrEqual(widths[i - 1]);
    }
  });

  it("ignores a drop once the game is over", () => {
    const over = { ...createGame(), status: "over" as const };
    expect(drop(over)).toBe(over);
  });
});
