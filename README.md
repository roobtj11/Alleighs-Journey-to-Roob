# Adventure Engine MVP

A dependency-free, mobile-first prototype for a two-person scavenger-hunt/adventure game. It is intentionally generic: no real proposal story, memories, dates, locations, or final sequence are included.

## What the prototype proves

- Player dashboard and current objective
- Text-answer challenge with normalized answer matching
- A timed hint
- Prerequisites and inventory requirements
- Inventory reward
- Browser GPS distance check without a mapping API
- Game Master force-complete, force-unlock, location waiver, and message controls
- Progress persistence after refresh or browser restart
- Backup export/import and test reset
- Offline app-shell caching and installable-PWA metadata

## Architecture and project structure

This is a static app: no framework, package manager, build step, database, or paid service.

```text
.
├── index.html                  Player entry point
├── gm.html                     Game Master entry point
├── manifest.webmanifest        Installable-web-app metadata
├── sw.js                       Offline app-shell cache
├── assets/styles.css           Shared visual system
├── js/content.js               Game content you normally edit
├── js/storage.js               Versioned local persistence
├── js/engine.js                Rules, answers, requirements, GPS math
├── js/player.js                Player interface
├── js/gm.js                    GM interface
└── .github/workflows/pages.yml GitHub Pages deployment
```

## Run locally

Geolocation and service workers need HTTPS or `localhost`; opening `index.html` directly is not enough for those features.

With Python installed:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`. The GM view is at `http://localhost:8000/gm.html`.

VS Code's Live Server extension is another easy option.

## Edit game content

For normal authoring, edit `js/content.js`. Each challenge has a stable, unique `id`. Do not change an ID after a playthrough starts unless you intend its saved progress to stop matching.

An answer challenge looks like this:

```js
{
  id: "first_signal",
  title: "The First Signal",
  body: "Puzzle text goes here.",
  type: "answer",
  answers: ["accepted answer", "another accepted form"],
  hints: [
    { text: "Hint text.", availableAfterSeconds: 600 }
  ],
  rewards: ["brass_key"]
}
```

Answer matching ignores capitalization, punctuation, and repeated spaces. Answers are shipped in the page source; this is acceptable under the stated trust assumption, but is not anti-cheat security.

Requirements are combined automatically:

```js
requires: {
  completed: ["first_signal"],
  items: ["brass_key"],
  unlockAt: "2027-01-15T18:00:00-06:00"
}
```

All listed requirements must pass unless the GM force-unlocks the challenge.

## Hints

`availableAfterSeconds` starts counting when the player first opens that challenge. Used hints and their activity are stored. Add more objects to the `hints` array for multiple hints.

## Locations

A location challenge includes:

```js
location: {
  latitude: 41.8781,
  longitude: -87.6298,
  radiusMeters: 250,
  label: "Internal authoring label"
}
```

The engine uses the browser Geolocation API and the Haversine formula to calculate straight-line distance. No map service is needed. GPS can be inaccurate, especially indoors, so use a generous radius and keep the GM location waiver available. Location requires permission and HTTPS/localhost.

## Progress storage and GM controls

State is JSON in this browser's `localStorage` under `adventure-engine-state-v1`. It survives refreshes, phone locks, restarts, and temporary network loss, but it is not automatically backed up or shared across devices.

Open `gm.html` on the **same browser/device** to see submissions, completion, inventory totals, and activity. The GM can force-complete, force-unlock, waive GPS, publish a local message, export/import a backup, or reset the test game.

This local-only MVP deliberately does not pretend to support GM phone → player phone updates. That requirement justifies a later small shared backend (for example, a free-tier hosted database). Add it only when cross-device live control is needed; keep a local fallback and export/import recovery path.

The GM page has no real authentication. Knowing its URL is effectively access, consistent with the trust assumption.

## Deploy to GitHub Pages

1. Create an empty GitHub repository. For no-cost Pages on GitHub Free, use a public repository; use a discreet repository name if the name itself could spoil anything.
2. Put these files at the repository root and push the `main` branch.
3. In the repository, open **Settings → Pages**.
4. Under **Build and deployment**, set **Source** to **GitHub Actions**.
5. Open **Actions** and wait for “Deploy static site to Pages” to finish.
6. The deployment URL will appear in the workflow and Pages settings, normally `https://USERNAME.github.io/REPOSITORY/`.

The workflow deploys every push to `main`. All paths in the app are relative, so repository subpaths work correctly.

## Commit and push an update

```bash
git status
git add -- js/content.js
git commit -m "Update adventure content"
git push origin main
```

Stage only the files you intended to change. GitHub Actions redeploys after the push. A service worker can keep an older version briefly; close/reopen the installed app or refresh once after the new deployment finishes.

## If something breaks

1. Export a state backup from `gm.html` before risky edits.
2. Use `git status` and `git diff` to see local changes.
3. Find a known-good commit with `git log --oneline`.
4. Prefer `git revert COMMIT_ID` to create a safe undo commit, then push it.
5. If only content broke, restore `js/content.js` from a good commit and make a new commit.
6. Import the JSON state backup from the GM page if browser progress was lost or reset.

GitHub remains the source of truth for code; exported JSON backups are the source of truth for a specific in-progress local playthrough.

## Engine boundaries and next increments

Files normally edited: `js/content.js`, then `assets/styles.css` when theming. Core engine files: `js/storage.js` and `js/engine.js`. UI files: `js/player.js` and `js/gm.js`.

Good next increments, one at a time:

1. Add scheduled unlock UI and countdown presentation using the existing `unlockAt` rule.
2. Add photo capture with IndexedDB (better suited to blobs than `localStorage`).
3. Add QR payload validation as another challenge type.
4. Add a small shared backend only for cross-device state/live GM events.
5. Add web push only after shared event delivery and notification permission UX are settled.

Before the real event, test on both actual phones, test weak/offline conditions, export a fresh backup, record target coordinates on-site, allow for GPS drift, and keep a manual non-digital fallback.
