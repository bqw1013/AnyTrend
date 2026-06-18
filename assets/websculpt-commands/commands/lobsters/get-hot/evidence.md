# Evidence: lobsters/get-hot

This document records the research and validation evidence for the `lobsters/get-hot` command.

## Exploration Path

- Verified the target site through browser automation.
- Navigated to all 6 page variants and extracted data via `page.evaluate()`.
- All DOM selectors verified consistent across pages; no login, no anti-crawl observed.

## Verified URLs

- `https://lobste.rs` — homepage hot ranking, 25 stories
- `https://lobste.rs/newest` — newest submissions, same DOM structure
- `https://lobste.rs/active` — active discussions, same DOM structure
- `https://lobste.rs/top/1w` — top stories past week, same DOM structure
- `https://lobste.rs/top/1m` — top stories past month, same DOM structure
- `https://lobste.rs/page/2` — pagination page 2, same DOM structure

## Structural Evidence

**Page**: lobste.rs is a link aggregator. Stories are rendered as `<li class="story">` elements inside the main listing. Each page shows exactly 25 stories.

**DOM selectors** (verified on all 6 page variants above):

| Field | Selector | Notes |
|---|---|---|
| Story container | `li.story` | 25 per page |
| Short ID | `li.story[data-shortid]` | unique identifier |
| Title | `.link a.u-url` | textContent for title, href for URL |
| Votes | `.voters a.upvoter` | textContent is a plain integer |
| Domain | `.domain` | textContent |
| Tags | `.tags a` | multiple elements, textContent each |
| Author | `.byline a.user_is_author` | may be absent (returns null) |
| Comment count | `.comments_label a` | textContent e.g. "26 comments"; parse with parseInt |
| Time (ISO) | `.byline time` | `title` attribute in "YYYY-MM-DD HH:MM:SS" format |
| Time (relative) | `.byline time` | textContent e.g. "22 hours ago" |

**Page URL mapping**:

| sort value | URL path |
|---|---|
| `hot` | `/` |
| `new` | `/newest` |
| `active` | `/active` |
| `top` | `/top/{top_period}` (default period: `1w`) |

Pagination: `/page/{n}` appended to the sort path.

**Extraction approach**: Single `page.evaluate()` with `document.querySelectorAll('li.story')` — all data is in the DOM, no API calls or interaction needed. `commentCount` uses `parseInt(textContent)` directly (the built-in whitespace skipping handles leading newlines in the text content).

## Failure Signals

- **DRIFT_DETECTED**: `li.story` selector returns 0 items — site structure changed
- **EMPTY_RESULT**: Story list is empty (unlikely on main pages, possible on deep pagination)
- **INVALID_SORT**: Unknown sort parameter value — should validate early
- **INVALID_PERIOD**: Unknown top_period value — should validate early
- Page loads but `.link a.u-url` returns null — title link structure changed

## Capture Assessment

This command should be captured. The path is verified across 6 page variants with consistent DOM structure. Lobste.rs is a public site with no authentication, no anti-crawl barriers, and stable semantic HTML (`li.story`, `data-shortid`, microformat classes). The extraction logic is a single `evaluate()` call with no interaction steps.
