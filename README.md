# Skills & policy monitor

A single-page site that pulls the day's GOV.UK content across a curated set of skills, education, work, and government topics, lets you filter it, and exports it as CSV, JSON, or Excel. Runs entirely in the browser, no backend, no build step, no API key.

## Setting it up

1. Create a new GitHub repository (public or private, both work with GitHub Pages on a paid plan; public repos get Pages free).
2. Add these five files to the repo root: `index.html`, `style.css`, `app.js`, `taxonomy-loader.js`, `taxonomy.json`.
3. In the repo, go to **Settings → Pages**, set "Source" to the branch you pushed to (usually `main`) and the root folder, then save.
4. GitHub will give you a URL, usually `https://<your-username>.github.io/<repo-name>/`. It can take a minute or two to go live after the first push.

That's it, no other configuration. The page calls `https://www.gov.uk/api/search.json` directly from the visitor's browser, confirmed working without a CORS proxy or server-side step.

## What it does

Pressing "Run the sweep" fires a single call covering all 27 watched taxon branches (including Government), sorted newest first, unrestricted by format. Nothing is filtered server-side, every result GOV.UK returns for those branches comes back to the browser, and it's up to whoever's using the page to narrow it down from there.

Taxon IDs are resolved to readable topic names using the bundled `taxonomy.json`. Filters (text search, department, topic, and format) apply instantly to what's already loaded, no re-fetching. The three export buttons export whatever's currently visible under the active filters, not the full unfiltered set, so filtering to just `press_release`, `research`, `policy_paper`, and `independent_report` before exporting reproduces the narrower, curated view if that's what's wanted for a given use, without that restriction being baked into the call itself.

## Files

- `index.html` — page structure.
- `style.css` — styling.
- `app.js` — the call definition and fetch/filter/export logic.
- `taxonomy-loader.js` — loads `taxonomy.json` before the main app runs.
- `taxonomy.json` — a flat lookup of every taxon's content ID to its title. Generated from the full 1,369-row taxonomy reference table, not from live data, so it won't reflect brand-new taxons GOV.UK adds after it was generated. It also carries an `underGovernment` flag per taxon, unused by the app currently, left in in case format-based flagging is wanted again later.

## Changing the watch list

If the set of taxons being watched changes, update the `TOPIC_BRANCH_IDS` array near the top of `app.js`. Regenerate `taxonomy.json` if any newly added taxon isn't already in it, this needs the full taxonomy reference data, not something the page can do on its own.

## Known limits

- `first_published_at` isn't available through the public Search API, so there's no automatic "genuinely new vs. just updated" distinction here.
- `count` is fixed at 1500. Because Government is now included unrestricted, this reaches back less far than the split design did at the same count, roughly five weeks rather than two months at last measurement, since Government's routine output takes up a larger share of the shared budget. Worth re-checking this periodically as volume shifts, the same way it was tested originally, see the "Worked proof: count and reach" section of the project notes.
- The five taxon IDs that don't resolve to a name in some pulls are expected, they belong to GOV.UK's separate world-locations taxonomy, not the domestic topic tree this tool tracks, and will show as raw IDs in the Topic(s) column rather than a title.
