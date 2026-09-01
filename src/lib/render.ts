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
