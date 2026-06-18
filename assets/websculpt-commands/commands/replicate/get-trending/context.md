# Context

## Precipitation Background

This command exists to extract structured trending-model data from the public Replicate `/explore` page. The page serves as the platform's discovery hub and exposes Featured, Official, and Latest model sections without requiring authentication.

## Value Assessment

- **Generality**: Useful for any workflow that monitors popular or newly published AI models.
- **Reuse frequency**: Daily — the page updates continuously as models gain runs and new models are published.
- **Time saved**: Automates opening the page, scrolling sections, and copying model details into a structured format.
- **Unique position**: Complements other model-hosting trend sources by focusing on runnable, deployment-oriented models.

## Page Structure

- **URL**: `https://replicate.com/explore`
- **Framework**: Next.js with server-rendered content
- **Key anchors**: `<h2>` elements with text "Featured models", "Official models", "Latest models"
- **Card format**: `<a href="/<owner>/<name>">` containing an `<img>`, description text, run count, and optional "Official" badge
- **Pagination**: The Latest section may expose a `<button>` with "Load more" text that appends more cards client-side
- **No public API**: Data is embedded in server-rendered HTML

## Environment Dependencies

- **Browser**: Required (Chrome / Edge with remote debugging enabled)
- **Login**: Not required
- **Anti-crawl**: Human-like behavior is built into the command (small random mouse moves, short random pauses, smooth scroll before clicks, final 0–3 s wait). Keep these guards in place.
- **Stability notes**: Section heading text is the primary extraction anchor and is relatively stable. Tailwind utility class names may change across redesigns, so prefer text/structure-based selectors.

## Failure Signals

- **Section headings disappear or change text**: Expected `<h2>` elements are not found → `DRIFT_DETECTED`
- **No model links in any section**: Cards render but links are empty or in an unexpected format → `EMPTY_RESULT`
- **"Load more" button absent or broken**: Pagination stops working for the Latest section → silently returns whatever was loaded
- **Page load timeout**: Site is slow or blocking → `PAGE_LOAD_TIMEOUT` (from browser runtime)
- **Browser not attached**: Daemon cannot connect to a debugging-enabled browser → `BROWSER_ATTACH_REQUIRED`

## Repair Clues

- If section heading text changes, update the `SECTION_PATTERNS` regexes in `command.js`.
- If card link format changes (`/<owner>/<name>`), update the URL filter and excluded path list.
- If the "Load more" button text or element type changes, update the button selector logic.
- If the layout is redesigned into tabs or a single list, the section-walking strategy may need to be reworked.
- Alternative entry point: `https://replicate.com/collections` may be worth exploring if `/explore` is deprecated.
