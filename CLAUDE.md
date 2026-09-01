# COMP4020 prototype

This is your starter repo for a COMP4020 prototype: a static site built with
**Astro** that builds to plain HTML/CSS/JS and deploys to GitHub Pages. The
**deployed site is what gets marked** --- not this repo, and not "it works on my
machine". It's marked live in Chrome against the deployed URL at two viewports
--- 1920×1080 (desktop) and 390×844 (phone) --- and both count in full, so make
that artefact good at both and use the checks below to know whether it is.

The course website publishes this deliverable's brief and spec. The brief poses
the problem; the spec is the fixed contract every response must satisfy. This
repo's name tells you which deliverable applies. Run the course plugin's
**start** skill at the start of each week: it pulls the right spec from the
course API, carries your harness forward from last week, and helps you turn the
spec's checkable lines into tests of your own. Read the brief and spec before
you plan or build, and see `spec/README.md` for how the checks relate to them.

## How to work in here

- Keep the dev server running (`pnpm dev`) so you see changes as you make them.
- Before you push, run `pnpm check`. It runs most of what CI runs --- build,
  lint, and the spec --- so you catch those in seconds instead of waiting for
  the pipeline. The evidence check, the secrets scan, and the deploy itself only
  run in CI; `pnpm check:evidence` and `pnpm check:links` cover the first two
  locally.
- **Don't run `linkinator ./dist` — it lies.** The starter used to recommend it,
  and `.github/workflows/checks.yml` now runs `pnpm check:links` instead --- it did
  not until ship day, and the first public CI run failed on it --- for the reason you
  will hit: linkinator crawls `dist/` as if it were the server root, so every
  `base`-prefixed href resolves to `dist/comp4020-crit5-anpham-09/…`, which does
  not exist locally, and it reports 404s for a site that serves perfectly on
  Pages. `pnpm check:links` (`spec/links.test.ts`) resolves them the way Pages
  does. Trust that one.
- To see what the page actually looks like rather than what you assume it looks
  like, open it in a browser (the `agent-browser` CLI, documented on
  [the course site](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/topics/backpressure/#agent-browser-the-rendered-page-as-ground-truth),
  works well for this). The rendered page is the truth; your mental model of it
  isn't. Two things that cost me time here: a screenshot is a moment, not a
  state, so a CSS transition caught mid-flight looks exactly like a bug --- zoom
  or wait before believing it; and content that seems to have vanished is
  usually just below the fold, so scroll before diagnosing.
- **To render the 390×844 marking viewport, use an iframe, not the window.**
  Chrome on macOS clamps how narrow a window can go, so `resize_window` reports
  success and the page still lays out at ~1500px. Load the built page into a
  same-origin `<iframe>` sized 390×844 instead: media queries resolve against
  the frame, so the phone layout genuinely renders. Read `innerWidth`,
  `documentElement.scrollWidth` and the computed `grid-template-columns` off
  `iframe.contentDocument` --- scrollWidth exceeding innerWidth is horizontal
  overflow, which is the failure this viewport is checked for.
- When a check fails, read its output before changing anything. Each check below
  names what it measures, and the failure message is the instruction: it tells
  you the file, the line, or the contract. Treat a red check as authoritative
  --- the page is wrong until the check is green, not until you decide it should
  be.
- Commit when the checks pass. Never commit a red state.

## The checks (your sensors)

CI runs these on every push once your repo is public. GitHub's checks UI shows
two jobs, `check` and `deploy` --- not one status per sensor below --- and
within `check` the steps run in sequence (`pnpm check` chains typecheck, build,
lint, and the spec with `&&`), so an early failure like a broken build stops the
later sensors from running for that push; fix it and push again to see the rest.
While the repo is private (all week, until you ship) the CI jobs stay skipped
--- `pnpm check` is the same roster on your machine, and it's the faster loop
anyway. They aren't hoops. Each is a different way of finding out something true
about the site that you can't reliably see by looking at it.

They also carry a mark at a crit: the sweep runs fifteen minutes after your
cutoff, and green checks there are worth half that week's shipped mark. Still
running counts as not green, so ship with time for CI to finish.

- **typecheck** --- `astro check` runs first in `pnpm check`, so a type error
  stops the roster before the build even starts. (`tsc --noEmit` can't read
  `.astro` files, which is why this repo uses `astro check` instead.) The types
  are extra backpressure: a red here is the compiler telling you a claim in the
  code is false.
- **build** --- the site must build (`pnpm build`). A build failure means the
  deployed site is broken or stale, so nothing else matters until this is green.
- **deploy / online** --- the live GitHub Pages URL must load and return the
  page you expect. An asset that 404s on the deployed URL counts as broken even
  if it loads locally.
- **spec** --- `spec/invariants.test.ts` asserts what's true of any good
  website, whatever the week's brief asks; the tests you write for the week's
  spec run alongside it (any `spec/*.test.ts`). A failure names the contract
  you haven't met yet.
- **lint** --- `stylelint` for CSS, `oxlint` for TypeScript. Flags code that's
  wrong, fragile, or non-idiomatic. Read the rule it names.
- **tests** --- any other tests you write, wherever you put them (co-located
  with your source is fine, not just `spec/`), must pass. Vitest picks up both
  this and the spec suite in one `vitest run`, the last step of `pnpm check`. A
  failing test is a claim about the site that's no longer true.
- **evidence** (`pnpm check:evidence`) --- checks your process evidence:
  `PROCESS.md`'s citations resolve to real commits, the current deliverable's
  exact reflection is in `reflections/` (worked out from this repo's name
  against the public course API), and your `CLAUDE.md` is present. Evidence
  gates the deploy --- `deploy` needs `check` to pass, so failing evidence
  blocks the deploy alongside everything else. See
  [Your process is part of the mark](#your-process-is-part-of-the-mark) below,
  and the course website's
  [assessment page](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/topics/assessment/#what-you-submit)
  for what counts as evidence.
- **links** --- internal links must resolve. A broken link is a dead end you
  didn't mean to ship.
- **secrets** --- the repo is scanned for committed credentials. Never put a
  key, token, or password in a tracked file. If one leaks, rotate it. A local
  pre-commit hook (`.githooks/pre-commit`, installed by `pnpm install`) also
  blocks any commit containing something shaped like an API key --- by the time
  CI sees a key it's already pushed, so the hook is the sensor that matters.

Nothing here measures **accessibility** or **performance** --- wiring those
sensors (`axe-core`, Lighthouse, or whatever you choose) is your work, and later
in the course the spec will ask you to show how you tested both. When you do,
read a green performance result honestly: it's a lab estimate from one run on a
CI machine, not proof the site is fast for real users.

## The link-preview card

`public/card.png` (1200x630) is the image a shared link shows, and the `<head>`
that names it must be on every page. Under Astro that head block belongs in a
layout in `src/layouts/`, not copy-pasted per page --- the Vite template's
advice to "copy the head block into any new page" is one route to it, and the
worse one. Replace the card and the `description` meta. The card URL resolves
against the page that names it, like any link, so build it through `asset()`
rather than writing `./card.png`; nothing in CI checks it, so look at the
deployed head when you add pages.

## The stack: Astro (chosen in C2, kept for A1, C4 and C5)

The template shipped plain HTML/CSS/TypeScript on Vite. C2 swapped to Astro and
every week since has kept it --- the build config carries across, the prototype
source never does. Nothing in CI names a tool; the whole contract is:

- `pnpm build` emits the complete site into `dist/`
- the `package.json` scripts (`check`, `check:evidence`, `build`) keep working
- whatever lands in `dist/` still passes the invariants in `spec/`

Facts about this stack to work from, rather than rediscover:

- **Routing is `src/pages/`.** A file there is a route; there is no build config
  to update when you add a page. Do not add `.html` files at the repo root —
  that was the Vite template's convention and Astro will ignore them.
- **`base` is load-bearing.** The site deploys under
  `…github.io/comp4020-crit5-anpham-09/`, and `astro.config.mjs` sets `base`
  accordingly. Build internal links and asset URLs from
  `import.meta.env.BASE_URL`, never as `/foo`. A root-absolute URL looks perfect
  on `pnpm dev` and 404s on the live site; `spec/links.test.ts` guards this, so
  treat that test going red as the deploy already being broken.
- **Don't hand-write that prefix — call `route()`.** `src/lib/url.ts` is the one
  place the base path is assembled, and `src/lib/url.test.ts` holds it. A rule I
  have to remember is weaker than a function with tests around it, so new pages
  and components import `route()` rather than interpolating `BASE_URL` again.
  It emits a trailing slash, because Astro builds `menu/index.html` and asking
  for `/menu` makes Pages issue a redirect.
- **A file is not a route: assets go through `asset()`, not `route()`.** That
  trailing slash is right for a directory Astro built an `index.html` into and
  wrong for anything in `public/` — `route("card.png")` asks Pages for
  `card.png/` and 404s. `spec/links.test.ts` only resolves `href`/`src`, so the
  og:image meta this first bit me on had no sensor at all; `src/lib/url.test.ts`
  holds both helpers now.
- **Astro eats the whitespace between a text node and a following element.**
  `…the source is\n<a href=…>` renders as `…the source is<a href=…>` — no space.
  Write `is{" "}` before the link. Nothing in the check roster can see this,
  because every sensor is about structure and this is about a space: it only
  showed up on the rendered page.
- **Class names are plain kebab-case.** `stylelint-config-standard`'s
  `selector-class-pattern` rejects BEM's `__` and `--`, so `header-inner`, not
  `site-header__inner`. Also: `@media (width >= 48rem)` not `(min-width: …)`
  (`media-feature-range-notation`), modern `rgb(0 0 0 / 10%)` colour syntax, and
  watch `no-descending-specificity` when a bare `a` rule follows an `a:hover`
  one — `:any-link` fixes it without disabling the rule.
- **`astro check`, not `tsc`.** See the typecheck sensor above.
- **A `<script>` with any attribute is `is:inline`, and inline means invisible.**
  `define:vars`, or any other attribute, makes Astro ship the block untouched:
  no imports, no TypeScript, no typechecking. The symptom is `astro check`
  reporting perfectly real variables as unresolvable names while the page works
  fine in the browser. Believe the hint. Behaviour that the typechecker cannot
  see is also behaviour no test can import, which is how a page ends up with an
  interaction nothing asserts.
- **Behaviour lives in `src/lib/`, markup lives in the page.** A `.astro` file
  owns structure; anything with logic in it gets a module, and the script tag is
  a thin adapter that reads the DOM and calls it. The rule that makes this pay
  off: any function that touches the DOM takes its root as an argument rather
  than reaching for `document`, so a test can hand it a JSDOM built from the
  real `dist/` output and assert on what the visitor would see.
- **A test for code you haven't written yet must import it dynamically.**
  `pnpm check` chains typecheck first, so a static `import` of an unwritten
  module is a `ts(2307)` that stops the build, the lint and every other test
  from running — one unwritten file blacks out the whole roster. Hold the
  specifier in a variable and `await import()` it behind an `existsSync` guard.
  A red test should narrow what you don't know, not hide it.
- **A test whose name makes a claim its body doesn't check is worse than no
  test.** If the assertion is hard to write, that is usually the code's shape
  talking, not the test's — move the code. And before trusting a new test,
  break the thing it covers and confirm it goes red; a test that has never
  failed hasn't told you anything yet.
- **Styles scoped inside `.astro` files are not linted.** `stylelint` only reads
  `**/*.css`, so CSS written in a component's `<style>` block has no sensor on
  it. Put shared styles in a real `.css` file if you want them checked.
- **Never write `*/` inside a CSS comment** --- including in a glob like the one
  in the bullet above. It closes the comment early, and what lightningcss
  reports is `Expected identifier in class selector, got WhiteSpace`, pointing
  at a line nowhere near the comment. Cost a confused minute the first time.
- **Astro inlines a small module script straight into the HTML.** No `.js` file
  is emitted at all for a page with one short script, so any test that reads
  `dist/**` filtered to `.js` sees an empty bundle and reports a page with no
  event handlers. Read the inline `<script>` elements too --- a sensor a bundler
  setting can switch off is not measuring the contract.
- **JSDOM has no layout engine: every rect it reports is zero.** Anything that
  divides by a height silently becomes `NaN`, and any assertion about geometry
  passes for the wrong reason. Give the measurement its own pure function so it
  can be tested as arithmetic, and stub `getBoundingClientRect` in the DOM test
  when the wiring itself is what's being checked. This is exactly how a
  "velocity varies with where you hit the key" test passed with the velocity
  hardcoded.

### Rules for the page itself

These are constraints on the artefact, not on the tooling. Each one is here
because it's invisible to every sensor in the roster above, so the only thing
holding it is this file.

- **A repaint query is scoped to what it repaints.** A render function taking a
  root so a test can hand it a JSDOM makes it tempting to query from that root
  for everything. In A1 that silently rewrote the legend on every repaint,
  because the legend swatches shared a data attribute with the grid cells.
  Query from the element that owns the thing you're changing, not from the root
  you happened to be handed.
- **Colour only ever comes from a custom property.** No literal hex in a rule
  body. Dark mode is then one `prefers-color-scheme` block redefining the
  tokens, not fifty overrides — and a hardcoded colour is a bug that only shows
  up in the theme you weren't looking at.
- **Judge colour separation in OKLab, not RGB or hue angle.** When a set of
  colours has to be told apart at a glance, both RGB distance and hue angle
  **rank the pairs backwards** — don't reach for them. And a distance floor is a
  floor, never an objective: maximising minimum distance produces gamut extremes
  and assigns hot pink to "sleep". Clear the floor, then choose by meaning. (A1
  held this with a `spec/palette.test.ts`; write the equivalent if this week's
  page depends on colour being read.)
- **Every transition and animation needs a `prefers-reduced-motion` escape.**
  Wrap them, or add them to a blanket `@media (prefers-reduced-motion: reduce)`
  reset at the bottom of `global.css`. Motion that can't be turned off is an
  accessibility defect, and vestibular disorders are not an edge case.
- **No `100vh`.** Mobile Safari's address bar makes it lie, and the marker
  resizes mid-use. Use `dvh` with a fallback, or don't do viewport-height layout
  at all. Sticky bars use `position: sticky; top: 0`, never viewport arithmetic.
- **Interactive targets are at least 44×44px** (WCAG 2.5.5). That's the slider
  thumb, not just the track, and it's the reason A1's preset buttons carried
  more padding than they looked like they needed. Where the target and the thing
  you can see must differ --- a black piano key is a bit over half a white one,
  which is 28px on a 390px screen --- give the element the *visible* size and
  grow the target with an absolutely positioned `::after`. A pseudo-element
  takes the pointer events of the element it sits on, so the hit area grows and
  the key does not. Two more things measured rather than assumed: body padding
  quietly ate 23px of the phone's 390 until the keyboard was allowed to run
  full bleed, and Chrome resolved `max(2.75rem, 100%)` to **43.9941px** --- so
  size targets a hair over the floor, never exactly on it.
- **No web font.** An external font request is a failure mode on a deployed page
  that nothing in the check roster would catch.
- **`.astro/` is generated** and gitignored; it's rebuilt by every `dev` and
  `build`. Never edit or commit it.
- **Commit the updated `pnpm-lock.yaml`**: CI installs with `--frozen-lockfile`.

## Your process is part of the mark

The deployed page is only half of it. How you got there is marked too: your
commit history, your agent files, and the decisions visible across them. The
checks above can't see any of that, so a person reads it directly --- which
means building legibly is part of building well.

- **Commit as you go.** Small, frequent commits are the record of how the work
  came together, and that record is read, not just the final state. A trail that
  grew alongside the code is the strongest evidence of your process; a single
  dump the night before is the weakest.
- **Keep a process overview** (`PROCESS.md`). A short reading-guide, not an
  essay: what you built, the moments that mattered --- each pointing at a
  commit, a `CLAUDE.md` change, or a prompt and the commit it produced --- and
  where to look in the history. It points a marker at the evidence; it doesn't
  stand in for it, and claims the history doesn't back don't count. The
  `PROCESS.md` in this repo is a template showing the shape and the citation
  format (link text the commit hash or range, target the commit or compare URL);
  `pnpm check:evidence` verifies your citations resolve to real commits before
  you ship. Markers follow those citations and don't trawl the repo for evidence
  you didn't cite.
- **Write your reflection in `reflections/`** --- a short markdown file in this
  repo, named for the deliverable it answers, so the number in the filename is
  the number in this repo's name (`crit-5.md` in `comp4020-crit5-<you>`,
  `assignment-1.md` in `comp4020-ass1-<you>`); `reflections/README.md` has the
  full rule. `pnpm check:evidence` checks the exact current name against the
  course API, not merely the presence of any well-named file. It answers the two
  standing prompts: the breakthrough that moved the work forward, and what this
  work changed about the developer you want to be. It stays out of the deployed
  site. It's due at the cutoff, and if it isn't in the repo by then the week
  doesn't count as shipped, however good the prototype is.
- **This file is process evidence.** The harness you build to direct the agent,
  this `CLAUDE.md` and any `AGENTS.md`, is itself read as part of how you
  worked. Keep it honest and current (see below).

You don't need a name, a student number, or any identity file in the repo: we
know whose repo it is. Spend the effort on the work.

## This file is yours

This CLAUDE.md is a starting point, not a fixed rulebook. As you learn what your
prototype needs --- a convention to hold the agent to, a sensor that keeps
catching you out, a fact about the stack the agent keeps getting wrong --- write
it down here. Growing this file is the work of harness engineering, and the gap
between this boilerplate and your own version is part of what your prototype
says about the developer you're becoming.

This file and the sensors you wire into `check` carry across the course --- both
come with you into next week's repo. The prototype doesn't: source, and the
tests answering this week's published spec, stay behind. `spec/README.md` draws
the line.
