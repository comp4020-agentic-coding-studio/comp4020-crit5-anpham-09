/**
 * Stack Tower, as arithmetic.
 *
 * Every measurement is in normalised field units on a 0–100 scale, never
 * pixels: the page renders `x` and `width` as percentages, so the game is
 * identical at 1920×1080 and 390×844 without a line of viewport maths. It also
 * means the whole mechanic can be tested as plain numbers, which is the only
 * honest option — JSDOM has no layout engine and reports every rect as zero.
 *
 * Nothing in here touches the DOM, a timer, or a random number generator. Runs
 * are reproducible from their inputs, so every test is deterministic.
 */

export const FIELD = 100;
export const BASE_WIDTH = 40;
export const BASE_X = 30;

/** Drops landing within this many units of flush snap to it and keep their width. */
export const SNAP = 1.5;

export const BASE_SPEED = 35;
export const SPEED_RAMP = 0.06;
export const MAX_SPEED = 120;

/** A backgrounded tab returns a multi-second delta; clamp it or the slider teleports. */
export const MAX_DT = 50;

export type Block = { x: number; width: number };
export type Slider = Block & { dir: 1 | -1 };
export type Status = "playing" | "over";

export type State = {
  stack: Block[];
  slider: Slider;
  status: Status;
  score: number;
};

export function overlap(a: Block, b: Block): Block {
  const left = Math.max(a.x, b.x);
  const right = Math.min(a.x + a.width, b.x + b.width);
  return { x: left, width: Math.max(0, right - left) };
}

export function speedFor(score: number): number {
  return Math.min(MAX_SPEED, BASE_SPEED * (1 + score * SPEED_RAMP));
}

/** Alternating entry side is variety without an RNG, so runs stay reproducible. */
export function spawn(score: number, width: number): Slider {
  return score % 2 === 0
    ? { x: 0, width, dir: 1 }
    : { x: FIELD - width, width, dir: -1 };
}

export function createGame(): State {
  return {
    stack: [{ x: BASE_X, width: BASE_WIDTH }],
    slider: spawn(0, BASE_WIDTH),
    status: "playing",
    score: 0,
  };
}

export function drop(state: State): State {
  if (state.status !== "playing") return state;

  const top = state.stack[state.stack.length - 1];
  const flush = Math.abs(state.slider.x - top.x) <= SNAP;
  const landed = flush
    ? { x: top.x, width: state.slider.width }
    : overlap(state.slider, top);

  // A missed block never joins the tower.
  if (landed.width <= 0) return { ...state, status: "over" };

  const score = state.score + 1;
  return {
    stack: [...state.stack, landed],
    slider: spawn(score, landed.width),
    status: "playing",
    score,
  };
}

/**
 * Advance the slider by `dtMs` of game time.
 *
 * The delta is clamped first. A tab that has been in the background returns a
 * multi-second delta on its first frame back, and an unclamped sweep would put
 * the slider somewhere the player never saw — a loss they did not make. The
 * clamp is a fairness rule, which is why it has a test.
 */
export function tick(state: State, dtMs: number): State {
  if (state.status !== "playing") return state;

  const span = FIELD - state.slider.width;
  if (span <= 0) return state;

  const dt = Math.min(dtMs, MAX_DT);
  let x = state.slider.x + state.slider.dir * speedFor(state.score) * (dt / 1000);
  let dir = state.slider.dir;

  // Reflect off the walls. A loop rather than a branch is defensive only: width
  // never exceeds BASE_WIDTH, so span never drops below FIELD - BASE_WIDTH = 60,
  // while a clamped frame travels at most MAX_SPEED * MAX_DT / 1000 = 6. One
  // bounce per tick is the most this can currently do; the test below pins the
  // margin so raising a constant cannot quietly break the assumption.
  while (x < 0 || x > span) {
    if (x < 0) {
      x = -x;
      dir = 1;
    }
    if (x > span) {
      x = 2 * span - x;
      dir = -1;
    }
  }

  return { ...state, slider: { ...state.slider, x, dir } };
}
