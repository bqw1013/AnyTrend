# Context

## Purpose

This command fetches the latest AI articles from Jiqizhixin (jiqizhixin.com). The site has no traditional hot ranking; the article-library API always returns a reverse-chronological list, making it a stable source for tracking new Chinese AI content.

## Runtime Requirements

- Browser runtime is required. The site uses Alibaba Cloud WAF anti-bot protection; direct HTTP requests from a generic client are intercepted.
- No login or authentication is required.
- A real browser session is needed to obtain the CSRF token from the homepage meta tag or cookie.
- No known rate limits.

## Page/API Notes

- **Homepage** (`https://www.jiqizhixin.com/`): contains the article-library section; CSRF token is embedded in `<meta name="csrf-token">`.
- **Article API** (`/api/article_library/articles.json`): GET, parameters `sort`/`page`/`per`, requires `x-csrf-token` header.
- **Article library page** (`/articles`): public titles only; full text requires subscription.

## Known Limitations

- The API seems to ignore the `per` parameter and always returns roughly 20 items. The command enforces `limit` via client-side truncation.
- The `page` parameter is accepted but currently returns the first page regardless of value. Pagination is not exposed.
- The `category` parameter is accepted but does not filter results server-side.

## Failure Signals

- **CSRF token mechanism changes**: if the `<meta name="csrf-token">` tag structure changes, token extraction fails and `CSRF_MISSING` is raised.
- **API path changes**: if `/api/article_library/articles.json` changes, the call fails and `API_ERROR` is raised.
- **Response schema changes**: if JSON field names change, output fields may be empty or missing.

## Repair Clues

- CSRF token extraction has two fallback paths: meta tag first, then the `XSRF-TOKEN` cookie.
- If the API becomes unavailable, a fallback could render the public article library page (`/articles`) and parse titles from the DOM.
- Keep anti-crawl behavior light and human-like; avoid rapid, repetitive requests.
