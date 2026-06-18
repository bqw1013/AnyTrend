# Evidence: replicate/get-trending

This document records the research and validation evidence for the `replicate/get-trending` command.

## Exploration Path

- Checked the WebSculpt command library for existing `replicate.com` commands.
- Read `references/access/playwright-cli-guide.md` for browser automation protocol guidance.
- Read `references/browser-contract.md` for capture runtime contract requirements.
- Used Playwright CLI CDP attach to explore `https://replicate.com/explore` in a real browser session.
- Confirmed the page renders server-side content and does not expose a stable public API endpoint.
- Confirmed no login is required; all content is publicly accessible.
- No anti-crawl signals were detected during exploration.

## Verified URLs

- `https://replicate.com/explore` — Public explore/discovery page used as the data source.

## Structural Evidence

**Page layout**: The `/explore` page contains multiple sections, three of which are model trending sections:

1. **Hero card**: One large featured model card with an `<h2>` display name.
2. **Featured models**: `<h2>Featured models</h2>` followed by a container of model cards in a horizontal grid.
3. **Official models**: `<h2>Official models</h2>` followed by a container of model cards.
4. **Category cards**: Collection/category cards that are not model cards and are excluded from extraction.
5. **Latest models**: `<h2>Latest models</h2>` followed by a list of model cards sorted by recency, with a `<button>Load more</button>` at the bottom.

**Model card structure**: Each card is an `<a>` tag with `href="/<owner>/<name>"`. The card contains:

- An `<img>` with `alt` text and `src` cover image URL
- Text content including owner, name, description, run count, and an optional "Official" badge

**Extraction approach**:

- Section identification: `document.querySelectorAll('h2')` and case-insensitive text matching
- Container discovery: walk up from each section heading, checking the immediate next sibling for a container holding at least two model-card images; fallback to searching ancestor subtree children
- Model links: query the container for `a[href]` and keep only paths matching `/<owner>/<name>` (excluding `/collections/`, `/playground/`, and `/_next/`)
- Data fields parsed from each card:
  - `owner` / `name`: parsed from `href`
  - `displayName`: from `<h2>` or `<h3>` child, or `img[alt]`
  - `runs`: regex match on full card text
  - `isOfficial`: presence of "Official" in full card text
  - `coverImage`: `img[src]` attribute
  - `description`: remaining card text after removing owner/name, display name, runs, and "Official"

**Pagination**: The Latest section may contain a "Load more" button. Clicking it appends more cards to the same container.

## Failure Signals

- `DRIFT_DETECTED` — expected `<h2>` section headings are missing or their text changed
- `EMPTY_RESULT` — section headings exist but the container contains no valid model card links
- `PAGE_LOAD_TIMEOUT` — `page.goto` exceeded its timeout
- `LOAD_MORE_FAILED` — clicking "Load more" did not increase the card count

## Capture Assessment

This command should be captured. The Replicate `/explore` page provides a publicly accessible view of trending, official, and newly published models. The section headings and model link patterns provide stable enough anchors for extraction, despite the content being rendered as HTML rather than delivered through a stable API.
