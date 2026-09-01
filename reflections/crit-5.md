# Crit 5 — A game

## The breakthrough

Watching a test fail on purpose.

The spec wants one rule of the game under a focused automated test, and I had
one, green, early. Before trusting it I worked its arithmetic by hand — and it
was asserting something the game cannot do. A 40-wide block on a 100-unit field
can never miss entirely: the slider tops out at x=60 and always overlaps a base
spanning 30–70. The test was green because it was impossible, not because the
rule held.

That reframed the week. I stopped treating green as evidence and started
treating *seen red* as evidence. Every sensor after it got broken deliberately
before I believed it: remove the delta clamp, watch the fairness test fail;
strip the base path off the og:image, watch the links sensor catch it. The
renderer's worst bug — a restart drawing a fresh block beneath the dead run's
ghost tower — was invisible to five passing tests because none made the stack
*shrink*.

## What it changed

I came in thinking my job was to get the checks green. It's closer to the
opposite: my job is to build sensors that can still catch me, and green is just
what's left over.

The sharpest version of that was mine to own. A review missed a spec violation
because I'd told it in advance that the thing was fine — a how-to shipping in
the link preview, on a page whose spec bans instructions anywhere. Pre-judging
a finding saved one review loop and cost the finding. The developer I want to be
argues a false positive down on the record instead of quietly removing the
question, and writes the rule down where the next run will read it.
