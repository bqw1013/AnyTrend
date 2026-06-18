# Context

## Purpose

Browser-based extraction of Reddit's public front-page feed. The browser runtime avoids TLS-fingerprint blocking that can affect headless HTTP clients.

## Page Structure

- **Primary URL**: `https://www.reddit.com/hot/`
- **Alternative sort URLs**: replace `hot` with `top`, `rising`, or `new`
- **Post container**: `<shreddit-post>` custom element
- **Data attributes used for extraction**:
  - `post-title`
  - `subreddit-prefixed-name`
  - `score`
  - `comment-count`
  - `permalink`
  - `content-href`
  - `author`
- **Ad filtering**: require `subreddit-prefixed-name` to start with `"r/"`

## Runtime Notes

- Requires a browser connection.
- No authentication required for public front-page feeds.
- Reddit lazy-loads posts as the user scrolls; the command scrolls the feed to render additional items.
- Light human-like pauses, cursor movement, and smooth scrolling are used to reduce detection risk.

## Failure Signals

- No `shreddit-post` elements found after navigation → `DRIFT_DETECTED`
- Navigation timeout → `TIMEOUT`
- Empty results after filtering ads → `EMPTY_RESULT`

## Maintenance Notes

- If `shreddit-post` attribute names change, inspect a live Reddit page and update the attribute names in `page.evaluate`.
- If Reddit introduces a login wall for the front page, the command may need to require authentication or switch to an alternative entry point.
- Keep scroll delays and final wait within reasonable ranges to balance reliability and human-like pacing.
