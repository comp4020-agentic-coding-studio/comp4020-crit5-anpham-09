# Process overview

## What I built

**Stack Tower.** A block sweeps above a tower; tap to drop it and it trims to
its overlap with the block below. Width decays with every imperfect drop, speed
rises with every successful one, so difficulty compounds. No instructions
anywhere — a moving block above a stationary one is the whole tutorial.

## The moments that mattered

**1. The graded rule test asserted something impossible.** I wrote "a block with
zero overlap ends the game", then computed it by hand rather than trust it green.
With a 40-wide block on a 100-unit field the slider tops out at x=60 and always
overlaps a base spanning 30–70; a miss needs width below a third of the field.
The test could never have failed. Fixed in
[`e27a546`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-anpham-09/commit/e27a546), plan corrected in
[`233836d`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-anpham-09/commit/233836d). It also told me something about the game: the
opening drops genuinely cannot be lost.

**2. A sensor that couldn't fire, widened rather than weakened.**
`spec/links.test.ts` guards the deploy base path and carries an anti-vacuous
check — every page must link to something, or `it.each` registers zero tests
and passes silently. A one-page game has only a `#fragment`. Rather than delete
the guard or add a decorative link, I widened `internalRefs` to collect the
og:image, which is a base-dependent path `CLAUDE.md` already noted nothing
checked, then broke it to watch the sensor go red:
[`f22cbbe`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-anpham-09/commit/f22cbbe).

**3. A review told not to look, didn't.** A task review's prompt dismissed
`meta[name=description]` as "link-preview text, not on-page instruction" — so
it never saw the how-to shipping there, on a page whose spec bans instructions
"on screen or off". The final review, given no steer, found it at once:
[`792ef2e`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-anpham-09/commit/792ef2e). That became a harness rule, alongside
correcting this file's long-standing false claim that evidence gates the deploy:
[`1f56c3e`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-anpham-09/commit/1f56c3e).
