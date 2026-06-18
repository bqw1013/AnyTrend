# Context

## Command Purpose

Fetch the latest article list from the Qbitai homepage using browser automation.

## Runtime

- Browser runtime (`requiresBrowser: true`).
- No authentication required.
- The page is server-rendered and the DOM structure has been stable during exploration.

## Verified Selectors

- Article list container: `div.text_box`
- Title and link: `div.text_box h4 a`
- Summary: first non-empty `div.text_box p`
- Author: `div.text_box .info .author a`
- Publish time: `div.text_box .info .time`
- Tags: `div.text_box .info .tags_s a`
- Featured carousel: `.swiper-slide` containing `a` and `img`

## Failure Signals

- `document.querySelectorAll('.text_box')` returns an empty collection → page structure has drifted, throw `DRIFT_DETECTED`.
- No articles found after a successful page load → throw `EMPTY_RESULT`.
- Long unresponsiveness → runner will surface a timeout or `BROWSER_ATTACH_REQUIRED`.

## Maintenance Notes

- If `.text_box` becomes invalid, the homepage may have been redesigned. Try broader selectors such as `article` or `[class*="post"]`.
- The homepage consistently serves around 20 articles with no pagination or "load more" mechanism.
- If the featured carousel class changes, re-verify the slide selector and keep de-duplication by URL to avoid loop-animation duplicates.
- No aggressive anti-crawl measures were observed, but keep human-like delays and avoid rapid repeated calls.
