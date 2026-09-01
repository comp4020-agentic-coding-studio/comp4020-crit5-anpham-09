# Stack Tower Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a wordless browser game — a block sweeps above a tower, tap to drop it, each block trims to its overlap with the one below — deployed to GitHub Pages by the 13:30 cutoff.

**Architecture:** All game logic is pure functions in `src/lib/rules.ts` operating on normalised field units (0–100), advanced by a `requestAnimationFrame` loop. A thin `render.ts` syncs DOM to state, taking its root as an argument. The page is a single Astro page whose inline script is only an adapter: loop, listeners, no logic.

**Tech Stack:** Astro 7, TypeScript, Vitest, JSDOM, stylelint, oxlint. Node 24 / pnpm 11.9.0 via mise.

## Global Constraints

Every task's requirements implicitly include this section.

- **Run everything through mise:** `mise exec -- pnpm …`. Node 24, pnpm 11.9.0.
- **Deploy base is `/comp4020-crit5-anpham-09`.** Internal hrefs go through `route()`; asset paths through `asset()` — both from `src/lib/url.ts`.
- **Behaviour lives in `src/lib/`, markup lives in the page.** Any function touching the DOM takes its root as an argument rather than reaching for `document`.
- **Colour only ever comes from a custom property.** No literal hex in a rule body.
- **No web font.** No external font request.
- **No `100vh`.** Use `dvh` with a fallback, or avoid viewport-height layout.
- **Interactive targets at least 44×44px** (WCAG 2.5.5).
- **Class names are plain kebab-case.**
- **Never write `*/` inside a CSS comment** — it closes the comment early and lightningcss reports an error pointing nowhere near it.
- **`astro check`, not `tsc`** — this is what `pnpm typecheck` runs.
- **Styles scoped inside `.astro` files are not linted.** Shared styles go in `src/styles/global.css` so stylelint reads them.
- **Never use `is:inline` on the game script** — it ships untouched, with no TypeScript and no typechecking.
- **Every transition and animation needs a `prefers-reduced-motion` escape.** The slider sweep and block fall are essential and rAF-driven, so the blanket CSS reset does not touch them. Decoration (camera easing, landing bounce, score pop, miss tumble) must be CSS so the reset catches it.
- **No instructions anywhere** — no how-to-play text, modal, or page. Naming the game is permitted.
- **Commit the updated `pnpm-lock.yaml`**: CI installs with `--frozen-lockfile`.
- **Before pushing, run `mise exec -- pnpm check`.**
- **Before trusting a new test, break the thing it covers and confirm it goes red.**

## File structure

| File | Responsibility |
|---|---|
| `src/lib/rules.ts` | *Create.* The whole game as pure functions. No DOM, no timers, no RNG. |
| `src/lib/rules.test.ts` | *Create.* Unit tests for the arithmetic. |
| `src/lib/storage.ts` | *Create.* Best-score read/write against an injected `Storage`. |
| `src/lib/storage.test.ts` | *Create.* Round-trip, throwing store, garbage value. |
| `src/lib/render.ts` | *Create.* DOM sync. Takes root as an argument. |
| `src/lib/render.test.ts` | *Create.* Structure assertions against a JSDOM root. |
| `src/styles/global.css` | *Create.* Tokens, layout, reduced-motion reset. |
| `src/pages/index.astro` | *Create.* Markup + rAF loop + listeners. |
| `spec/crit-5.test.ts` | *Modify.* Replace the `it.todo` with the spec's named rule test. |
| `PROCESS.md` | *Modify.* Remove the TEMPLATE comment, write the overview. |
| `reflections/crit-5.md` | *Create.* The week's reflection. |

---

### Task 1: The rules module and the spec's rule test

The spec's headline requirement — *one rule of the game has a focused automated test* — is satisfied by the end of this task, before anything visual exists.

**Files:**
- Create: `src/lib/rules.ts`
- Create: `src/lib/rules.test.ts`
- Modify: `spec/crit-5.test.ts` (replace the `it.todo` block at the end)

**Interfaces:**
- Consumes: nothing.
- Produces: `FIELD`, `BASE_WIDTH`, `BASE_X`, `SNAP`, `BASE_SPEED`, `SPEED_RAMP`, `MAX_SPEED`, `MAX_DT` (all `number`); types `Block = { x: number; width: number }`, `Slider = Block & { dir: 1 | -1 }`, `Status = "playing" | "over"`, `State = { stack: Block[]; slider: Slider; status: Status; score: number }`; functions `overlap(a: Block, b: Block): Block`, `speedFor(score: number): number`, `spawn(score: number, width: number): Slider`, `createGame(): State`, `drop(state: State): State`. `tick` arrives in Task 2.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/rules.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `mise exec -- pnpm exec vitest run src/lib/rules.test.ts`
Expected: FAIL — cannot resolve `./rules`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/rules.ts`:

```ts
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `mise exec -- pnpm exec vitest run src/lib/rules.test.ts`
Expected: PASS — 11 tests.

- [ ] **Step 5: Replace the `it.todo` in the spec file**

In `spec/crit-5.test.ts`, delete the entire trailing comment block and `describe("C5: one rule under test", …)`, and replace it with:

```ts
// ── The rule test ────────────────────────────────────────────────────────────
//
// The spec requires one rule of the game under a focused automated test. This
// is that test. The rule is the one the whole game turns on: a block that
// misses ends the run.
describe("C5: one rule under test", () => {
  it("a block with zero overlap ends the game", () => {
    const state = createGame();

    // A full miss is only geometrically possible once a block is narrow enough
    // to sit clear of the one beneath it: with equal widths, the slider can be
    // at most (FIELD - width) / 2 from centre, so a miss needs width below a
    // third of the field. The opening block is deliberately wider than that —
    // the first few drops cannot be lost, which is what lets a stranger learn
    // the game safely. So advance the tower to a narrow block first.
    const top = { x: 60, width: 20 };
    const narrowed = {
      ...state,
      stack: [...state.stack, top],
      slider: { x: 0, width: 20, dir: 1 as const },
      score: 1,
    };

    expect(overlap(narrowed.slider, top).width).toBe(0);

    const after = drop(narrowed);

    expect(after.status).toBe("over");
    // "Ends the game" is only half the claim: a version that sets `over` and
    // still pushed the block would pass a one-assertion test while being wrong.
    expect(after.stack).toHaveLength(narrowed.stack.length);
  });
});
```

Add to the imports at the top of `spec/crit-5.test.ts`:

```ts
import { createGame, drop, overlap } from "../src/lib/rules";
```

A static import is safe now that `src/lib/rules.ts` exists. It would not have been before: a static import of an unwritten module is a `ts(2307)` that stops typecheck, and with it the build, the lint and every other test.

- [ ] **Step 6: Confirm the rule test goes red when the rule breaks**

Temporarily change `if (landed.width <= 0)` to `if (landed.width < 0)` in `src/lib/rules.ts`.

Run: `mise exec -- pnpm exec vitest run spec/crit-5.test.ts`
Expected: FAIL on "a block with zero overlap ends the game".

Revert the change and re-run. Expected: PASS. A test that has never failed hasn't told you anything yet.

- [ ] **Step 7: Commit**

```bash
git add src/lib/rules.ts src/lib/rules.test.ts spec/crit-5.test.ts
git commit -m "feat: the rules of Stack Tower, and the spec's rule under test

Geometry in normalised field units so the mechanic is pure arithmetic and both
marking viewports are the same game. A missed block ends the run and never
joins the tower — asserted on both halves of that claim."
```

---

### Task 2: The slider sweep, the speed ramp, and the dt clamp

**Files:**
- Modify: `src/lib/rules.ts` (append `tick`)
- Modify: `src/lib/rules.test.ts` (append two `describe` blocks)

**Interfaces:**
- Consumes: `State`, `Slider`, `FIELD`, `MAX_DT`, `MAX_SPEED`, `speedFor` from Task 1.
- Produces: `tick(state: State, dtMs: number): State`.

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/rules.test.ts`:

```ts
describe("speedFor", () => {
  it("rises with the score", () => {
    expect(speedFor(5)).toBeGreaterThan(speedFor(0));
  });

  it("holds at the cap", () => {
    expect(speedFor(10_000)).toBe(MAX_SPEED);
  });
});

describe("tick", () => {
  it("sweeps the slider along its direction", () => {
    const state = createGame();
    const next = tick(state, 100);

    expect(next.slider.x).toBeGreaterThan(state.slider.x);
  });

  it("keeps the slider inside the field", () => {
    let state = createGame();
    for (let i = 0; i < 500; i++) {
      state = tick(state, MAX_DT);
      expect(state.slider.x).toBeGreaterThanOrEqual(0);
      expect(state.slider.x + state.slider.width).toBeLessThanOrEqual(FIELD + 1e-9);
    }
  });

  it("reverses at an edge", () => {
    let state = createGame();
    while (state.slider.dir === 1) state = tick(state, MAX_DT);
    expect(state.slider.dir).toBe(-1);
  });

  // A backgrounded tab hands back a multi-second delta. Without the clamp the
  // slider teleports across the field and the player loses a move they never made.
  it("clamps a huge delta to the same result as MAX_DT", () => {
    const state = createGame();
    expect(tick(state, 5000)).toEqual(tick(state, MAX_DT));
  });

  it("ignores time once the game is over", () => {
    const over = { ...createGame(), status: "over" as const };
    expect(tick(over, 16)).toBe(over);
  });
});
```

Extend the import at the top of `src/lib/rules.test.ts` to:

```ts
import {
  BASE_WIDTH,
  FIELD,
  MAX_DT,
  MAX_SPEED,
  SNAP,
  createGame,
  drop,
  overlap,
  spawn,
  speedFor,
  tick,
} from "./rules";
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `mise exec -- pnpm exec vitest run src/lib/rules.test.ts`
Expected: FAIL — `tick` and `speedFor` are not exported yet (`speedFor` exists; `tick` does not).

- [ ] **Step 3: Write the implementation**

Append to `src/lib/rules.ts`:

```ts
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

  // Reflect off both walls. A loop rather than a branch: at a narrow width the
  // span can be smaller than a single frame's travel.
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `mise exec -- pnpm exec vitest run src/lib/rules.test.ts`
Expected: PASS — 17 tests.

- [ ] **Step 5: Confirm the clamp test goes red without the clamp**

Temporarily change `const dt = Math.min(dtMs, MAX_DT);` to `const dt = dtMs;`.

Run: `mise exec -- pnpm exec vitest run src/lib/rules.test.ts`
Expected: FAIL on "clamps a huge delta to the same result as MAX_DT".

Revert and re-run. Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/rules.ts src/lib/rules.test.ts
git commit -m "feat: slider sweep, speed ramp and the dt clamp

The clamp is a fairness rule, not a performance one: a backgrounded tab returns
a multi-second delta and an unclamped sweep hands the player a loss they never
made."
```

---

### Task 3: Best-score storage

**Files:**
- Create: `src/lib/storage.ts`
- Create: `src/lib/storage.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `type Storageish = Pick<Storage, "getItem" | "setItem">`, `readBest(store: Storageish | null): number | null`, `writeBest(store: Storageish | null, score: number): void`.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/storage.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `mise exec -- pnpm exec vitest run src/lib/storage.test.ts`
Expected: FAIL — cannot resolve `./storage`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/storage.ts`:

```ts
/**
 * The best score, kept across runs.
 *
 * The store is a parameter rather than a reach for `localStorage`, so tests
 * hand it a fake and never touch the real one. Every access is wrapped:
 * Safari in private browsing throws on the property itself, and a disabled
 * store throws on write. Losing the best score is acceptable in either case;
 * taking the game down with it is not.
 */

const KEY = "stack-tower:best";

export type Storageish = Pick<Storage, "getItem" | "setItem">;

export function readBest(store: Storageish | null): number | null {
  if (!store) return null;

  try {
    const raw = store.getItem(KEY);
    if (raw === null) return null;

    const value = Number(raw);
    return Number.isInteger(value) && value >= 0 ? value : null;
  } catch {
    return null;
  }
}

export function writeBest(store: Storageish | null, score: number): void {
  if (!store) return;

  try {
    store.setItem(KEY, String(score));
  } catch {
    return;
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `mise exec -- pnpm exec vitest run src/lib/storage.test.ts`
Expected: PASS — 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/storage.ts src/lib/storage.test.ts
git commit -m "feat: best score across runs

The store is injected so tests never touch the real one, and every access is
wrapped — Safari private browsing throws on the property itself."
```

---

### Task 4: The page and its styles

Produces a static, correct page: invariants green, no game yet. The tower shows its base block and the slider sits where `createGame()` puts it, both rendered from hardcoded markup that Task 5 will take over.

**Files:**
- Create: `src/styles/global.css`
- Create: `src/pages/index.astro`
- Modify: `public/card.png` is already present — leave it.

**Interfaces:**
- Consumes: `asset` from `src/lib/url.ts`.
- Produces: DOM contract for Task 5 — `[data-game]` (render root), `[data-tower]`, `[data-slider]`, `[data-score]`, `[data-best]`, `[data-field]`. CSS custom property `--i` positions a block by index; `--lift` scrolls the tower.

- [ ] **Step 1: Write the stylesheet**

Create `src/styles/global.css`:

```css
/*
 * Stack Tower.
 *
 * Colour comes only from tokens, so dark mode is one block redefining them
 * rather than fifty overrides. Geometry is in percentages of the field, which
 * is what makes 1920x1080 and 390x844 the same game.
 */

:root {
  --sky: oklch(96% 0.02 250);
  --sky-deep: oklch(91% 0.03 250);
  --ink: oklch(25% 0.03 250);
  --ink-soft: oklch(52% 0.02 250);
  --block: oklch(72% 0.15 250);
  --block-alt: oklch(76% 0.14 190);
  --block-edge: oklch(45% 0.12 250);
  --base: oklch(40% 0.04 250);
  --shadow: oklch(25% 0.03 250 / 18%);

  --block-h: 1.75rem;
  --lift: 0;
  --gutter: 1rem;
}

@media (prefers-color-scheme: dark) {
  :root {
    --sky: oklch(22% 0.02 250);
    --sky-deep: oklch(16% 0.02 250);
    --ink: oklch(93% 0.02 250);
    --ink-soft: oklch(70% 0.02 250);
    --block: oklch(62% 0.15 250);
    --block-alt: oklch(66% 0.14 190);
    --block-edge: oklch(80% 0.10 250);
    --base: oklch(72% 0.04 250);
    --shadow: oklch(0% 0 0 / 35%);
  }
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  padding: 0;
  background: linear-gradient(var(--sky), var(--sky-deep));
  color: var(--ink);
  font-family: system-ui, sans-serif;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.skip-link {
  position: absolute;
  left: -100vw;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  background: var(--sky);
  color: var(--ink);
}

.skip-link:focus {
  position: static;
}

h1 {
  margin: var(--gutter) 0 0;
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-soft);
}

main {
  position: relative;
  width: min(38rem, 100%);
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.field {
  position: relative;
  width: 100%;
  flex: 1;
  min-height: 20rem;
  overflow: hidden;
  cursor: pointer;
  touch-action: manipulation;
}

.field:focus-visible {
  outline: 3px solid var(--block-edge);
  outline-offset: -3px;
}

.tower {
  position: absolute;
  inset: 0;
  transform: translateY(calc(var(--lift) * var(--block-h)));
  transition: transform 120ms ease-out;
}

.block,
.slider {
  position: absolute;
  height: var(--block-h);
  bottom: calc(var(--i, 0) * var(--block-h));
  border: 1px solid var(--block-edge);
  border-radius: 3px;
  background: var(--block);
  box-shadow: 0 1px 3px var(--shadow);
}

.block:nth-child(odd) {
  background: var(--block-alt);
}

.block:first-child {
  background: var(--base);
}

.slider {
  /* Same direction as the tower: both are lifted by the camera, not against it. */
  transform: translateY(calc(var(--lift) * var(--block-h)));
  transition: transform 120ms ease-out;
}

.score {
  margin: 0 0 var(--gutter);
  font-size: 3rem;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.best {
  position: absolute;
  top: var(--gutter);
  right: var(--gutter);
  margin: 0;
  font-size: 1rem;
  font-variant-numeric: tabular-nums;
  color: var(--ink-soft);
}

[data-status="over"] .slider {
  opacity: 0.25;
}

/*
 * The sweep and the fall are the game, and they are driven by
 * requestAnimationFrame rather than CSS — so this blanket reset strips the
 * decoration around them without stopping play. Motion that cannot be turned
 * off is an accessibility defect; motion that IS the mechanic is exempt.
 */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }
}
```

- [ ] **Step 2: Write the page**

Create `src/pages/index.astro`:

```astro
---
import { asset } from "../lib/url";
import "../styles/global.css";

const title = "Stack Tower";
const description =
  "Drop the sliding block onto the tower. Every miss makes the next one narrower.";
---

<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title}</title>
    <meta name="description" content={description} />
    <meta property="og:title" content={title} />
    <meta property="og:description" content={description} />
    <meta property="og:image" content={asset("card.png")} />
  </head>
  <body>
    <nav aria-label="Skip links">
      <a class="skip-link" href="#play">Skip to the game</a>
    </nav>

    <h1>{title}</h1>

    <main data-game>
      <p class="best" data-best hidden></p>

      <div
        id="play"
        class="field"
        data-field
        tabindex="0"
        role="application"
        aria-label={title}
      >
        <div class="tower" data-tower></div>
        <div class="slider" data-slider></div>
      </div>

      <p class="score" aria-live="polite" data-score>0</p>
    </main>
  </body>
</html>
```

The `description` meta is not an instruction on the page — it is the link-preview text, which the invariants require and which never renders in the game.

- [ ] **Step 3: Run the checks**

Run: `mise exec -- pnpm check`
Expected: PASS. The invariants now find a page with a `lang`, a title, a description, an og:image, a viewport, a `nav`, exactly one `h1`, and no images needing alt text. `spec/crit-5.test.ts` finds no instructional heading and a field with `tabindex`.

- [ ] **Step 4: Look at it**

Run: `mise exec -- pnpm dev` and open the page at both 1920×1080 and 390×844.
Expected: an empty field with a base block and slider absent (nothing renders them yet), a `0`, and the title. Confirm no horizontal scrollbar at 390px.

- [ ] **Step 5: Commit**

```bash
git add src/styles/global.css src/pages/index.astro
git commit -m "feat: the page, its tokens and its motion policy

Colour only from tokens so dark mode is one block. The blanket reduced-motion
reset is safe because the sweep is rAF-driven, not a CSS animation — it strips
decoration without stopping play."
```

---

### Task 5: Render and wire the game

**Files:**
- Create: `src/lib/render.ts`
- Create: `src/lib/render.test.ts`
- Modify: `src/pages/index.astro` (add the script)

**Interfaces:**
- Consumes: `State` from Task 1; the DOM contract from Task 4.
- Produces: `render(root: Element, state: State, best: number | null): void`.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/render.test.ts`:

```ts
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";

import { render } from "./render";
import { createGame, drop } from "./rules";

// JSDOM has no layout engine: every rect it reports is zero. So these assert
// the values render *wrote*, never geometry it would have to measure back.
function root(): Element {
  const { window } = new JSDOM(`
    <main data-game>
      <p data-best hidden></p>
      <div data-field><div data-tower></div><div data-slider></div></div>
      <p data-score>0</p>
    </main>
  `);
  return window.document.querySelector("[data-game]")!;
}

describe("render", () => {
  it("gives the tower one element per landed block", () => {
    const el = root();
    render(el, createGame(), null);
    expect(el.querySelectorAll("[data-tower] .block")).toHaveLength(1);

    let state = drop({ ...createGame(), slider: { x: 35, width: 40, dir: 1 } });
    state = drop(state);
    render(el, state, null);
    expect(el.querySelectorAll("[data-tower] .block")).toHaveLength(3);
  });

  it("writes the score", () => {
    const el = root();
    const state = drop({ ...createGame(), slider: { x: 35, width: 40, dir: 1 } });
    render(el, state, null);
    expect(el.querySelector("[data-score]")!.textContent).toBe("1");
  });

  it("positions the slider from state, as percentages", () => {
    const el = root();
    const state = { ...createGame(), slider: { x: 12.5, width: 40, dir: 1 as const } };
    render(el, state, null);

    const slider = el.querySelector<HTMLElement>("[data-slider]")!;
    expect(slider.style.left).toBe("12.5%");
    expect(slider.style.width).toBe("40%");
  });

  it("hides the best until there is one", () => {
    const el = root();
    render(el, createGame(), null);
    expect(el.querySelector<HTMLElement>("[data-best]")!.hidden).toBe(true);

    render(el, createGame(), 9);
    const best = el.querySelector<HTMLElement>("[data-best]")!;
    expect(best.hidden).toBe(false);
    expect(best.textContent).toBe("9");
  });

  it("marks the root when the game is over", () => {
    const el = root();
    render(el, { ...createGame(), status: "over" }, null);
    expect(el.getAttribute("data-status")).toBe("over");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `mise exec -- pnpm exec vitest run src/lib/render.test.ts`
Expected: FAIL — cannot resolve `./render`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/render.ts`:

```ts
import type { State } from "./rules";

/**
 * Sync the DOM to a state. Idempotent: call it as often as you like.
 *
 * `root` is a parameter rather than a reach for `document`, so a test can hand
 * it a JSDOM and assert on what a visitor would see. Elements are created from
 * `root.ownerDocument` for the same reason — there is no global `document` in
 * the test environment.
 *
 * Nothing here computes geometry. Every number comes off state and goes out as
 * a percentage of the field.
 */

/** How many blocks stay visible before the camera starts following the tower up. */
const VISIBLE = 10;

export function render(root: Element, state: State, best: number | null): void {
  const doc = root.ownerDocument;
  const tower = root.querySelector("[data-tower]");
  const slider = root.querySelector<HTMLElement>("[data-slider]");
  const score = root.querySelector("[data-score]");
  const bestEl = root.querySelector<HTMLElement>("[data-best]");
  if (!tower || !slider || !score || !bestEl) return;

  // The stack shrinks on restart, and an append-only renderer would leave the
  // dead run's blocks standing above the new base. Drop the surplus first.
  while (tower.children.length > state.stack.length) {
    tower.lastElementChild?.remove();
  }

  // Append only what is missing. Queried from `tower`, not from `root`: a
  // repaint query is scoped to what it repaints.
  for (let i = tower.children.length; i < state.stack.length; i++) {
    const el = doc.createElement("div");
    el.className = "block";
    tower.append(el);
  }

  state.stack.forEach((block, i) => {
    const el = tower.children[i] as HTMLElement;
    el.style.setProperty("--i", String(i));
    el.style.left = `${block.x}%`;
    el.style.width = `${block.width}%`;
  });

  slider.style.setProperty("--i", String(state.stack.length));
  slider.style.left = `${state.slider.x}%`;
  slider.style.width = `${state.slider.width}%`;
  
  const lift = Math.max(0, state.stack.length - VISIBLE);
  (tower as HTMLElement).style.setProperty("--lift", String(lift));
  slider.style.setProperty("--lift", String(lift));

  score.textContent = String(state.score);

  bestEl.hidden = best === null;
  bestEl.textContent = best === null ? "" : String(best);

  root.setAttribute("data-status", state.status);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `mise exec -- pnpm exec vitest run src/lib/render.test.ts`
Expected: PASS — 5 tests.

- [ ] **Step 5: Wire the page**

Append this `<script>` to `src/pages/index.astro`, immediately before `</body>`. Do **not** add `is:inline` — that would ship the block untouched, with no TypeScript and no typechecking.

```astro
    <script>
      import { render } from "../lib/render";
      import { createGame, drop, tick } from "../lib/rules";
      import { readBest, writeBest } from "../lib/storage";

      const root = document.querySelector("[data-game]");
      const field = document.querySelector("[data-field]");

      if (root && field) {
        // Safari in private browsing throws on the property itself, not on use.
        const store = (() => {
          try {
            return window.localStorage;
          } catch {
            return null;
          }
        })();

        let best = readBest(store);
        let state = createGame();
        let last = performance.now();

        const paint = () => render(root, state, best);

        const act = () => {
          if (state.status === "over") {
            state = createGame();
          } else {
            state = drop(state);
            if (state.status === "over" && (best === null || state.score > best)) {
              best = state.score;
              writeBest(store, best);
            }
          }
          paint();
        };

        field.addEventListener("pointerdown", (event) => {
          event.preventDefault();
          act();
        });

        field.addEventListener("keydown", (event) => {
          if (event.key !== " " && event.key !== "Enter") return;
          event.preventDefault();
          act();
        });

        const frame = (now: number) => {
          state = tick(state, now - last);
          last = now;
          paint();
          requestAnimationFrame(frame);
        };

        paint();
        requestAnimationFrame(frame);
      }
    </script>
```

- [ ] **Step 6: Run the full checks**

Run: `mise exec -- pnpm check`
Expected: PASS — typecheck, build, lint, and all tests.

- [ ] **Step 7: Play it**

Run: `mise exec -- pnpm dev`. Confirm the block sweeps, a tap drops it, the block trims, a miss ends the run, the next tap restarts, and the best appears after the first loss.

- [ ] **Step 8: Commit**

```bash
git add src/lib/render.ts src/lib/render.test.ts src/pages/index.astro
git commit -m "feat: render the tower and wire the loop

render takes its root as an argument and creates elements from
root.ownerDocument, so a JSDOM can be handed to it. It asserts what it wrote,
never geometry — JSDOM's rects are all zero."
```

---

### Task 6: Play it, and change something because of it

The spec requires *one change you made came from playing the finished game rather than reading its code*. No test can reach this. It is the line most easily lost to a deadline, so it gets its own task.

**Files:**
- Modify: whichever file the play session indicts — most likely `src/lib/rules.ts` (tuning constants) or `src/styles/global.css`.

**Interfaces:**
- Consumes: the finished game from Task 5.
- Produces: one committed change whose message says play caused it.

- [ ] **Step 1: Play at 1920×1080**

Run `mise exec -- pnpm dev`. Play at least five full runs at desktop size. Write down anything that feels wrong — the opening speed, how fast the ramp bites, whether `SNAP` is too forgiving or too mean, whether `VISIBLE = 10` scrolls too early, whether the block height reads.

- [ ] **Step 2: Play at 390×844**

Resize to 390×844 and play five more runs. The field is narrower, so the same speed in field units crosses the screen in the same time but covers fewer pixels — check whether that changes how hard it feels. Confirm the tap target and that nothing overflows horizontally.

- [ ] **Step 3: Make the change**

Change the one thing that bothered you most. Keep it small and specific — a constant, a duration, a colour.

- [ ] **Step 4: Re-run the checks**

Run: `mise exec -- pnpm check`
Expected: PASS. If a tuning change broke a test, decide which is wrong — the test may be encoding an assumption play has just disproved.

- [ ] **Step 5: Commit, naming play as the cause**

```bash
git add -A
git commit -m "tune: <what changed> after playing

Playing five runs at 390x844 showed <what you observed>. Reading the code would
not have surfaced it."
```

This commit message is the citation `PROCESS.md` will point at in Task 7. Make it specific.

---

### Task 7: Process evidence

`pnpm check:evidence` currently fails on both files.

**Files:**
- Modify: `PROCESS.md`
- Create: `reflections/crit-5.md`

**Interfaces:**
- Consumes: the commit history from Tasks 1–6.
- Produces: nothing code depends on.

- [ ] **Step 1: Read what each file asks for**

Run: `cat PROCESS.md; cat reflections/README.md`

- [ ] **Step 2: Write `PROCESS.md`**

Delete the `TEMPLATE` comment block entirely — `check:evidence` fails while it is present. Write a reading-guide, not an essay: what the work was, and citations by commit hash to the moments worth reading. Cite at least the harness carry-forward, the rule test going red then green, and the play-driven change from Task 6.

- [ ] **Step 3: Write `reflections/crit-5.md`**

The filename is fixed — `check:evidence` verifies the exact current name against the course API, so `crit-5.md` and nothing else.

- [ ] **Step 4: Run the evidence check**

Run: `mise exec -- pnpm check:evidence`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add PROCESS.md reflections/crit-5.md
git commit -m "docs: process overview and week 5 reflection"
```

---

### Task 8: Land the in-progress Astro switch and push

The working tree still carries the half-finished stack switch from before this plan: deleted Vite files, the new configs, and `package.json`.

**Files:**
- Modify: nothing new. This commits what is already on disk.

- [ ] **Step 1: Review what is uncommitted**

Run: `git status --short && git diff --stat`

- [ ] **Step 2: Run the full checks one more time**

Run: `mise exec -- pnpm check && mise exec -- pnpm check:evidence`
Expected: both PASS.

- [ ] **Step 3: Commit the stack switch**

```bash
git add -A
git commit -m "build: finish the Astro switch

package.json still ran Vite while astro.config.mjs and the links sensor assumed
Astro, so pnpm check could not run at all. Adds astro, oxlint and stylelint,
switches the scripts, and carries .gitignore's .astro/ entry forward."
```

- [ ] **Step 4: Push**

```bash
git push -u origin main
```

- [ ] **Step 5: Confirm CI is green**

Run: `gh run watch`
Expected: all checks pass.

---

## Not covered by this plan

- **Making the repo public and deploying.** That is the course plugin's **ship** skill, run about two hours before the crit. Do not flip the repo public earlier.
- **Checking submission readiness.** That is **preflight**.
- Whether a stranger reaches an ending inside five minutes, and whether the two unlabelled numbers read — the pod settles both at the crit.
- **Accounting for how you directed, grounded and corrected the work.** This is the crit conversation, not a file. Tasks 1 and 2 each end by breaking the thing a test covers and watching it go red — that is the correcting, and it is worth being able to describe.
