# Evidence: jiqizhixin/get-latest

This document records the research and validation evidence for the `jiqizhixin/get-latest` command.

## Exploration Path

- Checked existing commands via `websculpt command list --all`: no `jiqizhixin` commands existed.
- Similar AI media commands: `juejin/get-hot` (node, public API), `jike/get-hot` (browser, requires login).
- Explored via Playwright CLI attached to a Chrome CDP session, following the Playwright CLI guide.
- The homepage (`https://www.jiqizhixin.com/`) loaded successfully; the article API was discovered via network-request inspection.

## Verified URLs

- `https://www.jiqizhixin.com/` — Homepage, article library section visible
- `https://www.jiqizhixin.com/articles` — Article library page (subscription-gated for full content)
- `https://www.jiqizhixin.com/api/article_library/articles.json?sort=time&page=1&per=12` — Article API (verified, returns structured JSON)

## Structural Evidence

### Article API Endpoint

```
GET https://www.jiqizhixin.com/api/article_library/articles.json
```

**Query parameters:**
- `sort` (string, optional): sort order. Only `time` is functional; `hot`, `popular`, `recommended`, `latest`, `default` all return identical chronological results.
- `page` (number, optional): page number, starts at 1.
- `per` (number, optional): items per page. The API appears to cap at ~20 regardless of value.

**Required request headers:**
- `x-csrf-token`: CSRF token extracted from the homepage (available in page HTML meta tag or as cookie `XSRF-TOKEN`).
- `accept: application/json`
- `x-requested-with: XMLHttpRequest`

**Response schema (200):**
```json
{
  "success": true,
  "articles": [
    {
      "id": "uuid-string",
      "title": "文章标题",
      "coverImageUrl": "https://image.jiqizhixin.com/...",
      "category": "industry" | "practice" | "basic",
      "slug": "2026-06-04-3",
      "tagList": ["标签1", "标签2"],
      "author": "机器之心",
      "publishedAt": "2026/06/04 12:07",
      "content": "摘要文本...",
      "source": "机器之心"
    }
  ],
  "tags": ["标签1", "标签2", ...],
  "totalCount": 29861,
  "hasNextPage": true,
  "publishedArticlesCount": 29861,
  "elapsedDays": 4172
}
```

### CSRF Token Extraction

The CSRF token is embedded in the homepage HTML as a `<meta name="csrf-token">` tag. It can also be obtained from the `XSRF-TOKEN` cookie set by the server. The token is required for the article API to return data.

## Failure Signals

- **Anti-bot protection (Alibaba Cloud WAF)**: Direct HTTP requests from Node.js return a challenge page ("机器之心·数据服务", ~3KB) instead of the real homepage. The site uses an `acw_tc` cookie for bot detection. Browser runtime is required to bypass this.
- **Missing CSRF token**: Without a real browser session, the CSRF token is not present in the response. Browser runtime resolves this via `page.evaluate()`.
- **Invalid sort parameter**: Non-functional sort values are silently ignored; the API falls back to `time` ordering.
- **Category filter not working**: The `category` parameter is accepted but does not filter results server-side.
- **Rate limiting**: Not observed during testing, but rapid successive requests could trigger rate limiting.
- **Article content truncation**: The `content` field in the API response is a preview (truncated). Full article text requires accessing individual article pages (separate endpoint, not part of this command).
- **Site structure changes**: The API endpoint path or parameter names could change. The CSRF token mechanism is unlikely to change as it follows a standard Rails pattern.

## Capture Assessment

This command should be captured. The article API is stable, returns structured JSON, requires no authentication, and provides deterministic paginated access to the latest AI articles from a leading Chinese AI media outlet. The command fills a gap in Chinese AI media coverage alongside `juejin/get-hot`.

The command is named `get-latest` rather than `get-hot` because the API has no true "hot" ranking — all sort parameters return identical reverse-chronological ordering. The homepage presentation is effectively "latest = hot" for this site.
