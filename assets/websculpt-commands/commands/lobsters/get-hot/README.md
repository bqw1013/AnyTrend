# lobsters/get-hot

Fetch the hot story ranking from Lobsters (lobste.rs), a high-quality engineer community covering programming languages, systems, security, AI, and more.

## Description

Returns up to 25 ranked stories from the Lobsters front page or its alternate views (newest, active, top). Each story includes title, URL, votes, source domain, tags, author, comment count, and publish time. No authentication required — the site is publicly accessible.

## Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `sort` | string | `"hot"` | Sort mode: `hot` (votes + recency), `new` (latest submissions), `active` (recent comments), `top` (highest votes in time window) |
| `limit` | number | `25` | Maximum stories to return (1–25) |
| `page` | number | `1` | Page number for pagination |
| `top_period` | string | `"1w"` | Time window when sort=top: `1w` (week), `1m` (month), `1y` (year) |

## Return Value

```json
{
  "items": [
    {
      "id": "zwn4xe",
      "title": "Test-case Reducers Are Underappreciated Debugging Tools",
      "url": "https://tratt.net/laurie/blog/2026/...",
      "votes": 70,
      "domain": "tratt.net",
      "tags": ["compilers", "debugging"],
      "author": "ltratt",
      "commentCount": 26,
      "time": "2026-06-09 05:55:01",
      "timeAgo": "22 hours ago"
    }
  ],
  "count": 25,
  "page": 1,
  "sort": "hot"
}
```

## Usage

```
websculpt lobsters get-hot
websculpt lobsters get-hot --sort new
websculpt lobsters get-hot --sort top --top_period 1m
websculpt lobsters get-hot --limit 10 --page 2
```

## Common Error Codes

| Code | Description |
|------|-------------|
| `INVALID_SORT` | Unknown sort parameter value |
| `INVALID_PERIOD` | Unknown top_period value |
| `NAVIGATION_FAILED` | Page failed to load |
| `DRIFT_DETECTED` | No story elements found — page structure may have changed |
