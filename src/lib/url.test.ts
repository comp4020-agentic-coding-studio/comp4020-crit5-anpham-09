import { describe, expect, it } from "vitest";
import { joinAsset, joinBase } from "./url";

// The base path is the single most likely way to ship a site that works locally
// and 404s when deployed, so the helper that builds every internal href has a
// test of its own rather than being trusted by inspection.
describe("joinBase", () => {
  it("prefixes a route with the base path", () => {
    expect(joinBase("/comp4020-crit5-anpham-09", "menu")).toBe(
      "/comp4020-crit5-anpham-09/menu/",
    );
  });

  it("resolves the home route to the base itself", () => {
    expect(joinBase("/comp4020-crit5-anpham-09", "")).toBe(
      "/comp4020-crit5-anpham-09/",
    );
  });

  it("does not double up slashes, whichever side supplies them", () => {
    expect(joinBase("/comp4020-crit5-anpham-09/", "/menu/")).toBe(
      "/comp4020-crit5-anpham-09/menu/",
    );
  });

  it("still works when the site is served from a domain root", () => {
    expect(joinBase("/", "menu")).toBe("/menu/");
    expect(joinBase("/", "")).toBe("/");
  });

  it("never emits a root-absolute path that skips the base", () => {
    const base = "/comp4020-crit5-anpham-09";

    for (const target of ["", "menu", "about", "visit"]) {
      expect(joinBase(base, target).startsWith(`${base}/`)).toBe(true);
    }
  });
});

// A file is not a route: the trailing slash route() adds turns card.png into a
// directory request, which 404s on Pages and nowhere else.
describe("joinAsset", () => {
  it("prefixes a file without adding a trailing slash", () => {
    expect(joinAsset("/comp4020-crit5-anpham-09", "card.png")).toBe(
      "/comp4020-crit5-anpham-09/card.png",
    );
  });

  it("does not double up slashes, whichever side supplies them", () => {
    expect(joinAsset("/comp4020-crit5-anpham-09/", "/card.png")).toBe(
      "/comp4020-crit5-anpham-09/card.png",
    );
  });

  it("still works when the site is served from a domain root", () => {
    expect(joinAsset("/", "card.png")).toBe("/card.png");
  });

  it("carries the base for every asset it is given", () => {
    const base = "/comp4020-crit5-anpham-09";

    for (const file of ["card.png", "favicon.svg", "audio/kick.wav"]) {
      expect(joinAsset(base, file).startsWith(`${base}/`)).toBe(true);
    }
  });
});
