import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";

import config from "../astro.config.mjs";
import { createGame, drop, overlap } from "../src/lib/rules";

// This week's contract, from the published spec for C5 "A game":
//
//   - it teaches itself: no instructions anywhere, on screen or off — the
//     opening screen invites the first move, and play teaches whatever comes
//     next
//   - it can be lost: a wrong move is possible, and play ends somewhere
//   - one rule of the game has a focused automated test
//
// These assert the *contract*, not the implementation: they read the built
// site, so they survive a change of approach or of stack. The rule test lives
// beside them once the mechanic exists — see the bottom of this file.

const DIST = resolve("dist");

function builtPages(): { name: string; doc: Document }[] {
  const out: { name: string; doc: Document }[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".html")) {
        const { window } = new JSDOM(readFileSync(full, "utf8"));
        out.push({ name: relative(DIST, full), doc: window.document });
      }
    }
  };
  walk(DIST);
  return out;
}

const pages = builtPages();

describe("C5: the game teaches itself", () => {
  it("built at least one page", () => {
    expect(pages.length).toBeGreaterThan(0);
  });

  // The no-tutorial rule is the one thing the brief says you can't fake. A
  // person settles whether the opening screen actually affords the first move;
  // what a test can do is catch the reflex of explaining it in words.
  const BANNED = /how\s*to\s*play|instructions|tutorial|^\s*controls\s*:?\s*$|walkthrough/i;

  for (const { name, doc } of pages) {
    describe(name, () => {
      it("has no how-to-play heading or section", () => {
        const headings = [...doc.querySelectorAll("h1,h2,h3,h4,h5,h6")].map(
          (h) => h.textContent?.trim() ?? "",
        );
        const offenders = headings.filter((h) => BANNED.test(h));
        expect(offenders, `instructional heading(s): ${offenders.join(", ")}`).toEqual([]);
      });

      it("has no element named for instructions", () => {
        const hooks = [...doc.querySelectorAll("[id],[class]")]
          .map((el) => `${el.id} ${el.className}`)
          .filter((s) => BANNED.test(s));
        expect(hooks, `instructional id/class: ${hooks.join(" | ")}`).toEqual([]);
      });
    });
  }
});

describe("C5: the opening screen invites the first move", () => {
  const home = pages.find((p) => p.name === "index.html");

  it("exists", () => {
    expect(home).toBeTruthy();
  });

  // Affordance can't be asserted, but its absence can: a screen with nothing
  // to press, click, focus or aim at cannot invite anything.
  it("offers something to act on", () => {
    const controls = home!.doc.querySelectorAll(
      "button, a[href], input, select, canvas, [tabindex], [role='button'], svg",
    );
    expect(controls.length).toBeGreaterThan(0);
  });
});

describe("C5: deployed where the spec says", () => {
  it("base path matches this repo", () => {
    expect(config.base).toBe("/comp4020-crit5-anpham-09");
  });
});

// ── The rule test ────────────────────────────────────────────────────────────
//
// The spec requires one rule of the game under a focused automated test. This
// is that test. The rule is the one the whole game turns on: a block that
// misses ends the run.
describe("C5: one rule under test", () => {
  it("a block with zero overlap ends the game", () => {
    const state = createGame();

    // A block can only miss entirely once it is narrow enough to sit clear of
    // the one beneath it, so this starts from a narrow tower rather than the
    // opening block. The state is constructed rather than played into: what is
    // under test is the rule, not the route to it.
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
