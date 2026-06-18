# Evidence: substack/get-trending

This document records the research and validation evidence for the `substack/get-trending` command.

## Exploration Path

1. Checked command library via `websculpt command list` — no existing Substack commands. Medium commands are not reusable for Substack.
2. Consulted the browser automation guide for the Playwright CLI protocol.
3. Attached to a local Chrome instance via Playwright CLI and opened `https://substack.com/explore` in a new tab.
4. Probed the DOM structure and found trending topics rendered with class-based selectors.
5. Captured network traffic to discover the explore API calls used by the page.
6. Retrieved and analyzed response bodies from:
   - Category tab listing endpoint
   - Trending topics endpoint (`tab=explore&type=base`)
   - Technology category leaderboard endpoint (`tab=4&type=category`)
7. Verified the API works without an identifying query parameter via the browser's native `fetch()`.
8. Confirmed plain HTTP/curl access is blocked by Cloudflare, validating the need for a browser runtime.

## Verified URLs

- `https://substack.com/explore` — Explore page, trending topics + notes feed
- `https://substack.com/api/v1/search/explore/web?tab=explore&type=base` — Core trending API (200 OK)
- `https://substack.com/api/v1/search/explore/web?tab=4&type=category` — Technology category leaderboard API (200 OK)
- `https://substack.com/api/v1/reader/feed/tabs?surface=explore&selectedTab=explore&type=base` — Category tabs listing API (200 OK)
- `https://substack.com/` — Homepage

## Structural Evidence

### API Endpoint

**Primary data source**: `https://substack.com/api/v1/search/explore/web`

Query parameters:
- `tab` — `"explore"` for trending topics, or category ID (e.g. `"4"`=Technology, `"62"`=Business, `"118"`=Crypto) for category leaderboard
- `type` — `"base"` for trending topics, `"category"` for category leaderboard
- `cursor` — optional pagination cursor string

### Response Structure (tab=explore, type=base)

```json
{
  "items": [{
    "type": "trendingTopicsExplore",
    "suggestedSearches": [{
      "query": "string",
      "title": "string",
      "description": "string",
      "push_title": "string",
      "push_subtitle": "string",
      "category": "string",
      "long_description": "string",
      "photoUrl": "string (URL)",
      "predictionMarket": { "title": "string", "service": "string", "slug": "string", "url": "string", "confidence": "number" },
      "topNoteIds": ["number[]"],
      "topAuthorIds": ["number[]"],
      "topPostIds": ["number[]"],
      "is_neutral_topic": "boolean",
      "is_currently_happening": "boolean",
      "id": "string (UUID)",
      "firstTrendingAt": "string (ISO 8601)",
      "recentUsers": [{ "user_id": "number", "name": "string", "photo_url": "string" }]
    }],
    "featuredTopic": { /* same structure as suggestedSearch */ }
  }],
  "originalCursorTimestamp": "string (ISO 8601)",
  "nextCursor": "string",
  "tabs": [{ "id": "string", "name": "string", "type": "string", "slug": "string" }]
}
```

### Response Structure (tab=<categoryId>, type=category)

```json
{
  "items": [{
    "type": "categoryLeaderboard",
    "title": "string",
    "profiles": [{
      "id": "number",
      "name": "string",
      "handle": "string",
      "bio": "string",
      "photo_url": "string (URL)",
      "bestseller_tier": "number",
      "status": {
        "bestsellerTier": "number",
        "subscriberTier": "number",
        "leaderboard": {
          "ranking": "string (paid|trending|free)",
          "rank": "number",
          "publicationName": "string",
          "label": "string",
          "categoryId": "string",
          "publicationId": "number"
        }
      },
      "primary_publication": {
        "id": "number",
        "name": "string",
        "subdomain": "string",
        "logo_url": "string (URL)"
      }
    }],
    "items": ["array"],
    "more": {}
  }],
  "tabs": [{ "id": "string", "name": "string", "type": "string", "slug": "string" }]
}
```

### Access Requirements

- Browser session with cookies (no login required for trending topics)
- Cloudflare protection blocks plain curl/HTTP requests
- The `userId` query parameter is optional — API works without it via browser cookies

### Category Tab IDs (verified)

| ID | Name | Slug |
|----|------|------|
| explore | Explore | - |
| 4 | Technology | technology |
| 62 | Business | business |
| 118 | Crypto | crypto |
| 96 | Culture | culture |
| 76739 | U.S. Politics | us-politics |
| 76740 | World Politics | world-politics |
| 153 | Finance | finance |
| 134 | Science | science |
| 94 | Sports | sports |
| ... | (32 categories total) | |

## Failure Signals

1. **BROWSER_ATTACH_REQUIRED**: Cloudflare protection prevents direct HTTP access. The API requires a browser session with valid cookies.
2. **EMPTY_RESULT**: The API returns trending topics from the current moment. If no topics are trending, `suggestedSearches` may be empty. The `items` array always contains at least the `trendingTopicsExplore` wrapper.
3. **DRIFT_DETECTED**: If Substack changes the API endpoint or response structure, the command would need to be updated. The explore API path `/api/v1/search/explore/web` is the most stable known endpoint.
4. **INVALID_TAB**: If an invalid tab ID is provided, the API may return an empty result set or a generic explore response. Category tab IDs are numeric strings fetched from the tabs listing.
5. **PAGINATION_EXHAUSTED**: When `nextCursor` is empty or null, there are no more pages.

## Capture Assessment

This command should be captured. The exploration confirmed:

- A stable, structured JSON API endpoint that returns trending topics and category leaderboards
- No authentication required for basic access
- Rich metadata per topic (descriptions, categories, prediction markets, trending timestamps)
- Pagination support via cursor
- Consistent response structure across different tab/category values
- The path is parameterizable via `tab` and `cursor` parameters
- All evidence is from verified first-hand API responses, not search result summaries
