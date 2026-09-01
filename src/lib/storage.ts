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
