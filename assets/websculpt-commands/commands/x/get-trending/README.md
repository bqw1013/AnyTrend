# x/get-trending

Browser runtime command for X (Twitter) trending topics.

## Description

Fetches X (Twitter) trending topics from the Explore page. Navigates to `x.com/explore/tabs/{tab}` using browser automation, extracts `[data-testid="trend"]` elements from the DOM, and returns a structured list of trends. Supports different tabs (`trending`, `for-you`, `news`, `sports`, `entertainment`) and client-side filtering by `domain_context` (e.g., `United States`, `worldwide`).

Requires the browser to be logged in to X.com.

## Parameters

| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| `tab` | No | `trending` | Explore tab: `trending`, `for-you`, `news`, `sports`, `entertainment` |
| `region` | No | none | Filter by `domain_context` substring, e.g. `"United States"` or `"worldwide"` |
| `limit` | No | `30` | Maximum number of trends to return |

## Return Value

```json
{
  "tab": "trending",
  "region": "United States",
  "count": 10,
  "total_available": 15,
  "items": [
    {
      "rank": 1,
      "name": "Belfast",
      "domain_context": "Trending in United States",
      "search_url": "https://x.com/search?q=Belfast&src=trend_click&vertical=trends",
      "is_promoted": false
    }
  ]
}
```

## Usage

```
websculpt x get-trending
websculpt x get-trending --tab trending --region "United States"
websculpt x get-trending --tab for-you --limit 10
websculpt x get-trending --region worldwide
```

## Common Error Codes

| Error Code | Description |
|------------|-------------|
| `AUTH_REQUIRED` | Browser is not logged in to X.com |
| `EMPTY_RESULT` | No trending items found on the page |
| `INVALID_PARAM` | Invalid `tab` parameter value |
| `DRIFT_DETECTED` | `[data-testid="trend"]` selector no longer matches the page |
