# Context

## Precipitation Background

This command fetches the current Zhihu hot list from the rendered `https://www.zhihu.com/hot` page.
It was created because the existing `zhihu/get-feed` command only covers the personalized home feed and does not return the hot list.
Direct HTTP attempts against Zhihu's hot-list API returned authentication errors, and static page fetches encountered anti-crawl behavior.
Browser automation against the rendered page successfully extracted ranked titles, links, and heat values.

## Value Assessment

The command is useful for recurring "what is trending on Zhihu now" requests.
It avoids repeating API discovery, anti-crawl probing, and manual DOM extraction.
The parameter surface is intentionally small: `limit` controls output size while keeping the command focused on the default hot list.

## Page Structure

Entry URL: `https://www.zhihu.com/hot`.

Verified extraction:

- Wait for `main h2` to appear in the rendered page.
- Each hot item title is rendered as an `h2`.
- The closest ancestor `a` of the `h2` contains the question URL.
- The heat value appears in nearby parent text and matches `/[0-9.]+\s*万热度/`.

## Environment Dependencies

Runtime is `browser`. The command only reads the hot list page and does not click, post, follow, vote, or transmit user data.
Do not solve CAPTCHA or bypass a safety challenge in the command.

## Failure Signals

- `main h2` never appears: blocked page, not logged in, loading failure, or page structure drift.
- Items exist but URLs are missing: link structure drift.
- Items exist but all heat values are missing: heat text structure drift.
- Empty extraction after waiting: list structure changed or access blocked.

## Repair Clues

First verify the rendered page manually with a browser session at `https://www.zhihu.com/hot`.
If `main h2` changes, inspect the hot card container and update the selector to target the new title element.
If heat text changes, update the regular expression while preserving the return field name `hot`.
If Zhihu exposes a stable browser-accessible API in network requests, consider switching to that endpoint only after validating authentication and anti-crawl behavior.
