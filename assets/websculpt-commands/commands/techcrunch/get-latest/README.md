# techcrunch/get-latest

Fetch the latest articles from TechCrunch via WordPress REST API. Returns reverse-chronological articles with title, URL, date, excerpt, and featured image.

## Description

This command retrieves articles from TechCrunch, one of the most authoritative sources for startup and technology news. Data is sourced from the public WordPress REST API — no authentication or browser required.

Supports 23 category filters including AI, startups, security, venture, climate, crypto, and more. Pagination is available via `per_page` and `page` parameters.

## Parameters

| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| `category` | No | (all) | Category slug to filter by. See below for full list. |
| `per_page` | No | 20 | Number of articles per page (1-100). |
| `page` | No | 1 | Page number for pagination. |

### Available Categories

`artificial-intelligence`, `startups`, `venture`, `security`, `apps`, `climate`, `biotech-health`, `commerce`, `cryptocurrency`, `enterprise`, `fintech`, `fundraising`, `gadgets`, `gaming`, `government-policy`, `hardware`, `media-entertainment`, `privacy`, `real-estate`, `robotics`, `social`, `space`, `transportation`

## Return Value

```json
{
  "articles": [
    {
      "id": 3131988,
      "title": "xAI fired an engineer who raised alarms about Grok safety, new lawsuit claims",
      "url": "https://techcrunch.com/2026/06/10/xai-fired-an-engineer-who-raised-alarms-about-grok-safety-new-lawsuit-claims/",
      "date": "2026-06-10T15:31:19",
      "excerpt": "A former xAI engineer is suing the company and SpaceX...",
      "image": "https://techcrunch.com/wp-content/uploads/2026/03/grok-getty.jpg?w=668"
    }
  ],
  "count": 20,
  "page": 1,
  "perPage": 20,
  "category": "artificial-intelligence"
}
```

## Usage

```bash
# Get latest articles from all categories
websculpt techcrunch get-latest

# Get latest AI articles
websculpt techcrunch get-latest --category=artificial-intelligence

# Get 10 startup articles, page 2
websculpt techcrunch get-latest --category=startups --per_page=10 --page=2
```

## Common Error Codes

| Code | Description |
|------|-------------|
| `INVALID_CATEGORY` | The provided category slug is not recognized. |
| `INVALID_PARAM` | A parameter value is out of range (e.g., per_page > 100). |
| `NETWORK_ERROR` | Failed to connect to the TechCrunch API. |
| `API_ERROR` | The API returned a non-200 status code. |
| `PARSE_ERROR` | The API response could not be parsed as JSON. |
| `DRIFT_DETECTED` | The API response format has changed unexpectedly. |
