# Context

## Maintenance Notes

This command fetches public story listings from Lobsters (`lobste.rs`) using the browser runtime. The site renders stories as static HTML, so extraction is done with a single `page.evaluate()` call.

## Page Structure

- **Story container**: `<li class="story">` with a `data-shortid` attribute. Each listing page contains up to 25 stories.
- **Title and URL**: `.link a.u-url`
- **Votes**: `.voters a.upvoter`
- **Domain**: `.domain`
- **Tags**: `.tags a`
- **Author**: `.byline a.user_is_author` (may be absent)
- **Comment count**: `.comments_label a`
- **Publish time**: `.byline time` (ISO format in the `title` attribute, relative text in `textContent`)
- **URL patterns**:
  - Hot ranking: `/`
  - Newest submissions: `/newest`
  - Active discussions: `/active`
  - Top stories: `/top/{period}` where period is `1w`, `1m`, or `1y`
  - Pagination: `/page/{n}` appended to the sort path

## Human-like Behavior

The command includes light, randomized interactions before extraction to mimic a real reader:

- A short pause after navigation.
- A small, random mouse movement.
- A gentle smooth scroll.
- A final randomized wait of 0–3 seconds before returning.

These pauses are intentionally small and do not change the extraction logic or output shape.

## Failure Signals

- `li.story` returns 0 items → `DRIFT_DETECTED` — the page layout likely changed.
- `.link a.u-url` returns null → the title/link structure changed.
- Navigation fails → `NAVIGATION_FAILED` — the site may be unreachable.
- Deep pagination beyond available pages may return an empty list → `EMPTY_RESULT` or `DRIFT_DETECTED`.

## Repair Clues

- If `.link a.u-url` breaks, try `.link a` as a fallback.
- If `.byline a.user_is_author` breaks, look for any `<a>` in the byline with an `href` starting with `/~`.
- If `.comments_label a` breaks, look for any `<a>` inside `.byline` containing "comment" in its text.
- The site also publishes an RSS feed at `/rss`, which can serve as an alternative extraction path if the DOM drifts significantly.
