# Stack Tower — design

**Deliverable:** COMP4020 C5 "A game" · cutoff Wed 2 Sep 2026, 13:30 ·
`comp4020-crit5-anpham-09` · reflection `reflections/crit-5.md`

## The game

A block sweeps left and right above a tower. Tap to drop it. The block trims to
its overlap with the block below, so every imperfect drop makes the next one
narrower. Miss entirely and the run is over. Score is height.

Two mechanics interact: **width decays** with each imperfect drop, and **speed
rises** with each successful one. They compound, which is where the difficulty
comes from.

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Recovery | Near-perfect drops snap flush; width is never regained | Precision is rewarded by losing nothing. Width is monotonically non-increasing, which is what makes difficulty compound. |
| Score persistence | Best score in `localStorage` | Gives a target across runs, which is what sustains five minutes. Survives reload. |
| Reduced motion | Decoration stripped, slide kept | The sweep is the mechanic; WCAG exempts essential motion. Camera easing, landing bounce, score pop and the miss tumble all go. |
| Rendering | DOM blocks, rAF-driven state | Keeps the mechanic as pure arithmetic so it can be tested. Canvas would put the visible output beyond every sensor in the roster. |
| Coordinates | Normalised field units, rendered as percentages | No viewport arithmetic; 1920×1080 and 390×844 are the same game. |

### Rejected

- **Canvas rendering.** Smoother for a tall tower, but JSDOM ships no 2D context,
  so the draw layer would need the `canvas` package in CI, and canvas is opaque
  to screen readers. A build that passes the whole roster while shipping
  something nobody can see is the failure mode `CLAUDE.md` was written against.
- **CSS-animated slider.** The tap would have to read position from layout;
  JSDOM reports every rect as zero, so the game's central rule would be
  untestable or would pass for the wrong reason.
- **Perfect-drop regrowth.** Would add a counter-force to the decay, but breaks
  the monotonic-width invariant for a depth the snap tolerance already supplies.

## Architecture

Four units, each testable in isolation.

### `src/lib/rules.ts` — pure

No DOM, no timers, no randomness.

```ts
export const FIELD = 100;
type Block = { x: number; width: number };        // x = left edge, field units
type State = { stack: Block[]; slider: Block & { dir: 1 | -1 };
               status: "playing" | "over"; score: number };

createGame(): State
tick(state: State, dtMs: number): State
drop(state: State): State
overlap(a: Block, b: Block): Block
speedFor(score: number): number
```

Constants: base block 40 units wide at `x = 30` (centred); `SNAP = 1.5` units;
`BASE_SPEED = 35` units/sec rising 6% per block, capped at `MAX_SPEED = 120`;
`MAX_DT = 50`.

`score` is `stack.length - 1` — the base block is not a point.

**`tick`** returns state unchanged unless `playing`. Clamps `dt` to `MAX_DT`
first — a backgrounded tab otherwise returns a multi-second delta and the
slider teleports, handing the player a loss they never made. Then advances by
`speed × dt`, reflecting at either edge.

**`drop`**:

1. If `|slider.x − top.x| ≤ SNAP` — flush. `x` snaps to `top.x`, **width carries
   over unchanged**.
2. Otherwise the block becomes `overlap(slider, top)`.
3. If that width is `≤ 0` — status `over`, and **the block is not pushed**.
4. Otherwise push, increment score, spawn a new slider at the surviving width.

Spawn side alternates on score parity: even spawns at `x = 0` moving right, odd
spawns at `x = FIELD - width` moving left.
Variety without an RNG, so every run is reproducible and every test is
deterministic.

Snap tolerance is **relative** (1.5 field units ≈ 6px at 390px, ≈ 29px at
1920px). As a fraction of the block being aimed at it is identical, which is the
only reading that makes the two marking viewports the same game.

### `src/lib/render.ts` — DOM sync

Takes its root as an argument. Idempotent: given root and state, make the DOM
match. Reads numbers off state; never computes geometry.

### `src/lib/storage.ts` — best score

Takes a `Storage`-like object as a parameter rather than reaching for
`localStorage`, so tests hand it a fake.

### `src/pages/index.astro` — markup + thin adapter

An rAF loop calling `tick` then `render`, and `pointerdown` / Space / Enter
listeners calling `drop`. No logic of its own. Head inline; a layout would be
ceremony for a single page.

## The page

```html
<nav aria-label="Skip links"><a class="skip-link" href="#play">Skip to the game</a></nav>
<header><h1>Stack Tower</h1></header>
<main>
  <div id="play" class="field" tabindex="0" role="application" aria-label="Stack Tower">
    <div class="tower" data-tower></div>
    <div class="slider" data-slider></div>
  </div>
  <p class="score" aria-live="polite" data-score>0</p>
  <p class="best" data-best hidden></p>
</main>
```

Satisfies `nav`, exactly one `h1`, and a real title, while naming the game —
which the brief permits. No invite text, no hint, nothing reading as a how-to.

**Affordance:** a sweeping block, a base block directly beneath it, and a `0`.
Motion draws the eye, vertical alignment implies the target, `cursor: pointer`
confirms it. After a loss the tower stays and the score freezes; the reflex is
to tap, and tapping restarts.

**Open risk:** current score and best score, unlabelled, could read
ambiguously. Separated by hierarchy — current large and centred, best small and
dim in a corner, appearing only after a run ends. The pod playing cold settles
this in ten seconds; it is a thing to discover at the crit, not to guess now.

**Styles:** shared rules in a real `src/styles/global.css` so stylelint sees
them. Colour only from custom properties. No web font. No `100vh`.

## Testing

The spec's named rule test goes in `spec/crit-5.test.ts`, replacing the
`it.todo` — that file is the marker's view of the answer to the spec:

```ts
it("a block with zero overlap ends the game", () => {
  const missed = drop(stateWithSliderClearOf(top));
  expect(missed.status).toBe("over");
  expect(missed.stack).toHaveLength(before.stack.length);
});
```

Two assertions, because "ends the game" is only half the claim: a version that
sets `over` *and* pushes the block would pass a one-line test while being wrong.

Colocated unit tests carry the rest:

- **`src/lib/rules.test.ts`** — `overlap` across partial / total / none /
  touching edges; width never increases over a run; snap preserves width exactly
  and one unit outside tolerance trims; `speedFor` rises then holds at the cap; a
  5000ms `dt` moves the slider no further than 50ms would; the slider never
  leaves `[0, FIELD − width]`; spawn side alternates on parity.
- **`src/lib/storage.test.ts`** — round-trips a best through a fake `Storage`; a
  throwing `Storage` does not propagate; a garbage value yields no best rather
  than `NaN`.
- **`src/lib/render.test.ts`** — the tower gains an element per landed block and
  the score text tracks state. Asserts the inline values written, not layout:
  JSDOM's rects are zero and a geometry assertion would pass for the wrong
  reason.

Already passing in `spec/crit-5.test.ts`: no how-to-play heading or element on
any page, home page offers something to act on, base path matches the repo.

### Failure handling

- `localStorage` throws outright in Safari private browsing and when storage is
  disabled. Both read and write are wrapped, so a hostile environment costs the
  best score and nothing else.
- A stored value that is not a finite non-negative integer is discarded rather
  than rendered as `NaN`.
- The `dt` clamp covers the backgrounded tab.

### While building

- `rules.ts` does not exist yet, so `spec/crit-5.test.ts` must reach it through a
  guarded `await import()`. A static import of an unwritten module is a
  `ts(2307)` that blacks out typecheck, lint and every other test at once.
- Before trusting a new test, break the thing it covers and confirm it goes red.

## Not covered by any test

- A stranger reaches an ending inside five minutes — the pod plays it cold and
  you stay quiet.
- **One change made from playing the finished game rather than reading its
  code** — requires real play at both viewports near the end, and a citation in
  `PROCESS.md`. The line most easily lost to a deadline; protect time for it.
- Accounting for how the work was directed, grounded and corrected.

## Outstanding repo work

- `PROCESS.md` still carries its `TEMPLATE` comment.
- `reflections/crit-5.md` does not exist.
- Both fail `pnpm check:evidence`.
