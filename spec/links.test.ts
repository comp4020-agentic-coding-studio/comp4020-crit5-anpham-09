import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";

import config from "../astro.config.mjs";

// The internal-links sensor, reading the built site.
//
// CI used to run `linkinator ./dist`, which crawls the directory as though it
// were the server root. This site deploys under a base path, so every internal
// href starts with /comp4020-crit5-anpham-09/ — and linkinator resolved those
// against dist/, looking for dist/comp4020-crit5-anpham-09/menu/ and reporting
// a 404 for a link the live site serves perfectly. Five false failures, and no
// flag fixes it because directory mode treats internal links as file paths.
//
// So resolve them the way Pages does instead: strip the base, look the target
// up inside dist, and treat a directory as its index.html. No network, no
// server, and the base comes from astro.config.mjs so the two can't drift.
const DIST = resolve("dist");
const BASE = `/${(config.base ?? "/").replace(/^\/+|\/+$/g, "")}`;

function htmlFiles(dir: string = DIST): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return htmlFiles(path);
    return entry.name.endsWith(".html") ? [path] : [];
  });
}

const pages = htmlFiles().map((path) => ({
  name: relative(DIST, path),
  doc: new JSDOM(readFileSync(path, "utf8")).window.document,
}));

// Anything that leaves the site or addresses something other than a path is
// somebody else's contract: mail, phone, external hosts, in-page fragments.
const external = /^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i;

function internalRefs(doc: Document): string[] {
  const linked = [...doc.querySelectorAll("[href], [src]")].map(
    (el) => el.getAttribute("href") ?? el.getAttribute("src") ?? "",
  );

  // The link-preview card is an internal path like any other — it just arrives
  // as `content` rather than href/src, so the query above cannot see it. It has
  // to carry the base and exist in dist for exactly the same reason, and until
  // now nothing in the roster checked it.
  const card = [...doc.querySelectorAll('meta[property="og:image"]')].map(
    (el) => el.getAttribute("content") ?? "",
  );

  return [...linked, ...card].filter((ref) => ref !== "" && !external.test(ref));
}

// Pages serves dist/ at <base>/, so the disk path is the URL minus the base.
function diskPath(ref: string): string {
  const path = ref.split(/[?#]/)[0].slice(BASE.length);
  const target = join(DIST, path);
  return path.endsWith("/") || path === "" ? join(target, "index.html") : target;
}

describe("internal links resolve in the built site", () => {
  it("built at least one page", () => {
    expect(pages.length).toBeGreaterThan(0);
  });

  for (const { name, doc } of pages) {
    describe(name, () => {
      const refs = internalRefs(doc);

      it("links to something", () => {
        expect(refs.length).toBeGreaterThan(0);
      });

      // A root-absolute link that skips the base is the failure that looks
      // perfect on `pnpm dev` and 404s on the deployed URL.
      it.each(refs)("%s carries the deploy base", (ref) => {
        expect(ref.startsWith(`${BASE}/`)).toBe(true);
      });

      it.each(refs)("%s exists in dist", (ref) => {
        expect(existsSync(diskPath(ref))).toBe(true);
      });
    });
  }
});
