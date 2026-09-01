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

  // render runs every frame, and [data-score] is an aria-live region: writing
  // unconditionally would hand a screen reader ~60 announcements a second for a
  // number that changes once per drop.
  const nextScore = String(state.score);
  if (score.textContent !== nextScore) score.textContent = nextScore;

  const nextBest = best === null ? "" : String(best);
  if (bestEl.textContent !== nextBest) bestEl.textContent = nextBest;
  if (bestEl.hidden !== (best === null)) bestEl.hidden = best === null;

  root.setAttribute("data-status", state.status);
}
