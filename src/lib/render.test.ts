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

  // The record is drawn as a datum line ruled at the height to beat, so the
  // number has to reach the stylesheet as a number, not only as text.
  it("publishes the record height for the datum line", () => {
    const el = root();

    render(el, createGame(), null);
    expect((el as HTMLElement).style.getPropertyValue("--best")).toBe("0");

    render(el, createGame(), 9);
    expect((el as HTMLElement).style.getPropertyValue("--best")).toBe("9");
  });

  it("marks the root when the game is over", () => {
    const el = root();
    render(el, { ...createGame(), status: "over" }, null);
    expect(el.getAttribute("data-status")).toBe("over");
  });

  it("drops stale blocks when the game restarts", () => {
    const el = root();

    let state = drop({ ...createGame(), slider: { x: 35, width: 40, dir: 1 } });
    state = drop(state);
    render(el, state, null);
    expect(el.querySelectorAll("[data-tower] .block")).toHaveLength(3);

    // A restart is a shrinking state: one block, and nothing left of the old run.
    render(el, createGame(), null);
    expect(el.querySelectorAll("[data-tower] .block")).toHaveLength(1);
  });
});
