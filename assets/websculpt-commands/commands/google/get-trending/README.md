# google/get-trending

Fetch Google Trends daily trending searches with optional geo filtering.

## Description

Get the daily trending search keywords from Google Trends. Returns up to 25 ranked trending items for the specified region, each with search volume, percentage change, time started, active status, and related topics. No authentication required.

## Parameters

| Name | Required | Description |
|------|----------|-------------|
| `geo` | No | 2-letter ISO country code. Defaults to `US`. Examples: `JP`, `HK`, `GB`, `KR`. **CN is not supported** — Google Trends does not serve data for this region. |
| `limit` | No | Maximum number of trending items to return (positive integer). Defaults to returning all available items (typically ~25). |

## Return Value

```typescript
{
  items: Array<{
    title: string;           // Trending keyword
    searchVolume: string;    // Search volume (e.g. "100K+", "5,000+")
    changePct: string;       // Percentage change (e.g. "1,000%")
    timeAgo: string;         // Time since trend started (format depends on region)
    isActive: boolean;       // Whether the trend is still actively rising
    relatedTopics: string[]; // Related search topics
  }>;
  count: number;             // Number of items returned
}
```

## Usage

```bash
# US trending (default)
websculpt google get-trending

# Japan trending
websculpt google get-trending --geo JP

# Hong Kong trending
websculpt google get-trending --geo HK

# Limit to top 5 results
websculpt google get-trending --limit 5

# Limit with geo filter
websculpt google get-trending --geo KR --limit 10
```

## Common Error Codes

| Code | Description |
|------|-------------|
| `EMPTY_RESULT` | No trending items found on the page |
| `DRIFT_DETECTED` | Page structure has changed — selectors no longer match |
| `ANTI_CRAWL_DETECTED` | CAPTCHA or anti-bot challenge triggered |
| `INVALID_GEO` | Invalid or unsupported geo code |
| `NETWORK_TIMEOUT` | Page failed to load within timeout |
| `INVALID_PARAM` | Invalid parameter value (e.g. unsupported geo code, non-positive limit) |
