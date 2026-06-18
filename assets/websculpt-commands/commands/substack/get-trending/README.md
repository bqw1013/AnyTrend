# substack/get-trending

Fetch Substack trending content via the explore API. Supports two modes: global trending topics and per-category leaderboards.

## Description

This command calls Substack's explore API endpoint to retrieve:
- **Trending Topics** (`tab=explore`) — AI-curated trending search topics across all domains (tech, business, politics, crypto, etc.), each with rich metadata
- **Category Leaderboards** (`tab=<categoryId>`) — Top authors/publications ranked by paid subscriber count or trending status within a specific category

No Substack account required. Requires a browser session to bypass Cloudflare.

## Parameters

| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| `tab` | No | `explore` | `explore` for trending topics, or a numeric category ID (e.g. `4`=Technology, `62`=Business, `118`=Crypto) for leaderboard |
| `cursor` | No | — | Pagination cursor from the `nextCursor` field of a previous response |

## Return Value

**Trending Topics mode** (tab=explore):
```json
{
  "trendingTopics": [{
    "query": "Example trending query",
    "title": "Example trending title",
    "description": "Example trending description",
    "push_title": "Example push title",
    "push_subtitle": "Example push subtitle",
    "category": "Technology",
    "long_description": "A longer description of the trending topic...",
    "photoUrl": "https://...",
    "predictionMarket": { "title": "...", "service": "...", "url": "https://...", "confidence": 55 },
    "is_neutral_topic": true,
    "is_currently_happening": true,
    "id": "a567b9d5-...",
    "firstTrendingAt": "2026-06-09T19:16:14.957Z",
    "recentUsers": [{ "user_id": 123456, "name": "Example User", "photo_url": "https://..." }]
  }],
  "featuredTopic": { /* same structure, or null */ },
  "nextCursor": "1",
  "tabs": [{ "id": "4", "name": "Technology", "type": "category", "slug": "technology" }]
}
```

**Category Leaderboard mode** (tab=<categoryId>):
```json
{
  "leaderboard": [{
    "rank": 1,
    "ranking": "paid",
    "name": "Example Author",
    "handle": "examplehandle",
    "bio": "Example author bio...",
    "photoUrl": "https://...",
    "bestsellerTier": 1000,
    "publication": {
      "id": 123456,
      "name": "Example Publication",
      "subdomain": "examplepub",
      "logoUrl": "https://..."
    }
  }],
  "tabs": [{ "id": "4", "name": "Technology", "type": "category", "slug": "technology" }]
}
```

## Usage

```bash
# Get global trending topics
websculpt substack get-trending

# Get Technology category leaderboard
websculpt substack get-trending --tab 4

# Get Business category leaderboard
websculpt substack get-trending --tab 62

# Get Crypto category leaderboard
websculpt substack get-trending --tab 118

# Paginate
websculpt substack get-trending --cursor 1
```

## Common Error Codes

| Code | Description |
|------|-------------|
| `API_ERROR` | Substack API returned a non-200 status |
| `BROWSER_ATTACH_REQUIRED` | No browser session available — daemon cannot connect to Chrome |
| `DRIFT_DETECTED` | Expected data structure not found in API response — Substack may have changed the API |
