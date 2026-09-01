/**
 * Every internal href on this site goes through here.
 *
 * The site deploys under `…github.io/comp4020-crit5-anpham-09/`, so a
 * root-absolute `/menu/` resolves against the domain root on the live URL and
 * 404s — while looking perfect on `pnpm dev`. One helper means there is one
 * place for that to be right.
 *
 * `joinBase` is pure so it can be tested without an Astro build; `route` is
 * what pages and components call.
 */
export function joinBase(base: string, target: string): string {
  const root = base.replace(/\/+$/, "");
  const slug = target.replace(/^\/+|\/+$/g, "");

  // Trailing slash matters: Astro builds `menu/index.html`, and asking for
  // `/menu` makes GitHub Pages issue a redirect we don't need.
  return slug === "" ? `${root}/` : `${root}/${slug}/`;
}

export function route(target: string): string {
  return joinBase(import.meta.env.BASE_URL, target);
}

/**
 * The same prefixing for a file rather than a route.
 *
 * `route()`'s trailing slash is right for a directory Astro built an
 * `index.html` into and wrong for anything in `public/`: `route("card.png")`
 * asks Pages for `card.png/`, which is a 404 the link-preview crawler reports
 * and no local sensor sees. Assets go through here instead.
 */
export function joinAsset(base: string, file: string): string {
  const root = base.replace(/\/+$/, "");
  return `${root}/${file.replace(/^\/+/, "")}`;
}

export function asset(file: string): string {
  return joinAsset(import.meta.env.BASE_URL, file);
}
