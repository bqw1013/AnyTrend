# medium/get-staff-picks

Fetch Medium Staff Picks, the official editorial curation list.

## Description

Navigates to the Medium Staff Picks page and extracts structured article data from `window.__APOLLO_STATE__`. Returns up to 20 staff-curated articles with full metadata and curator notes.

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `limit` | number | no | 20 | Number of items to return (range 1-20; out-of-range throws INVALID_PARAM) |

## Return Value

```json
{
  "items": [
    {
      "rank": 1,
      "title": "Example Article Title",
      "subtitle": "Example subtitle for the curated article.",
      "url": "https://medium.com/@example-author/example-article",
      "author": {
        "name": "Example Author",
        "username": "example-author",
        "url": "https://medium.com/@example-author"
      },
      "clapCount": 823,
      "responseCount": 13,
      "readingTime": 10,
      "publishedAt": "2026-06-03T12:34:22.274Z",
      "tags": ["Example Tag", "Another Tag"],
      "previewImage": "https://miro.medium.com/v2/resize:fit:400/0*example.jpeg",
      "curatorNote": "Example curator note from Medium Staff.",
      "isLocked": false
    }
  ],
  "count": 1
}
```

## Usage

```bash
# Fetch all 20 Staff Picks
websculpt medium get-staff-picks

# Fetch only the first 10
websculpt medium get-staff-picks --limit 10
```

## Common Error Codes

| Code | Description |
|------|-------------|
| `INVALID_PARAM` | `--limit` is invalid (non-positive integer or outside 1-20) |
| `PAGE_LOAD_FAILED` | Page load timed out; Apollo state did not hydrate |
| `APOLLO_STATE_NOT_FOUND` | `window.__APOLLO_STATE__` is missing; page structure may have changed |
| `CATALOG_NOT_FOUND` | Staff Picks catalog reference is missing |
| `ITEMS_NOT_FOUND` | Catalog items connection data is missing |
| `EMPTY_RESULT` | No valid article data could be extracted |
