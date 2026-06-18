# medium/get-tag-trending

Fetch trending articles for a Medium tag. Uses the Apollo `recommendedPostsFeed` as the primary source and falls back to JSON-LD structured data if the feed is unavailable.

## Description

Visits a Medium tag page and extracts the recommended posts feed from Apollo state. Each article includes engagement metrics where available. If the recommended feed is missing or empty, the command falls back to JSON-LD metadata, which provides articles without engagement metrics.

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `tag` | string | **yes** | — | Tag slug, e.g. `artificial-intelligence`, `programming`, `technology`, `machine-learning` |
| `limit` | number | no | 20 | Maximum number of articles to return (capped at 20) |

## Return Value

```json
{
  "tag": {
    "slug": "artificial-intelligence",
    "displayTitle": "Artificial Intelligence",
    "postCount": 471553
  },
  "items": [
    {
      "rank": 1,
      "title": "Sample article title",
      "subtitle": "A short preview of the article content.",
      "url": "https://medium.com/@sample-author/sample-article",
      "author": {
        "name": "Sample Author",
        "username": "sample-author",
        "url": "https://medium.com/@sample-author"
      },
      "clapCount": 617,
      "responseCount": 20,
      "readingTime": 10,
      "publishedAt": "2026-06-11T08:32:59.018Z",
      "tags": ["Artificial Intelligence", "Technology", "Machine Learning"],
      "previewImage": "https://miro.medium.com/v2/1*sample.png",
      "isLocked": true
    }
  ],
  "count": 15
}
```

## Usage

```bash
# Fetch trending articles for the AI tag
websculpt medium get-tag-trending --tag artificial-intelligence

# Fetch top 5 articles for the programming tag
websculpt medium get-tag-trending --tag programming --limit 5

# Fetch articles for the design tag
websculpt medium get-tag-trending --tag ux-design
```

## Field Reliability Notes

| Field | Description |
|-------|-------------|
| `clapCount` | Taken from Apollo `Post.clapCount`. `0` in JSON-LD fallback mode. |
| `responseCount` | Taken from Apollo `postResponses.count`. `0` in JSON-LD fallback mode. |
| `readingTime` | Taken from Apollo `readingTime`, rounded to the nearest minute with a minimum of `1`. `0` in JSON-LD fallback mode. |
| `tags` | Resolved from Apollo `Post.tags` references. Empty in JSON-LD fallback mode. |
| `previewImage` | Constructed from Apollo `previewImage.id` as `https://miro.medium.com/v2/{id}`. In fallback mode, taken from JSON-LD `image` with invalid URLs filtered out. |

## Common Error Codes

| Code | Description |
|------|-------------|
| `MISSING_PARAM` | Required parameter `tag` is missing or empty |
| `TAG_NOT_FOUND` | The requested tag does not exist |
| `JSON_LD_NOT_FOUND` | JSON-LD data is missing (fallback path) |
| `JSON_LD_PARSE_FAILED` | JSON-LD could not be parsed (fallback path) |
| `NO_ARTICLES_IN_JSON_LD` | JSON-LD contains no articles (fallback path) |
| `PAGE_LOAD_FAILED` | Apollo state did not hydrate within the timeout |
| `EMPTY_RESULT` | No valid articles were extracted |
