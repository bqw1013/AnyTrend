# juejin/get-hot

Fetch the Juejin (掘金) hot articles ranking list.

## Description

Returns the current hot articles ranking from juejin.cn, including article title, author, brief summary, heat index, engagement metrics (views, likes, bookmarks, comments), tags, and estimated read time.

Data is fetched from the Juejin public recommend API. No authentication or login is required.

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `limit` | number | No | 20 | Number of articles to return |
| `sort_type` | number | No | 3 | Sort type: `3` for hot rank, `200` for recommended |

## Return Value

```json
{
  "items": [
    {
      "rank": 1,
      "title": "Article Title",
      "url": "https://juejin.cn/post/...",
      "author": "Author Name",
      "author_title": "Author Job Title",
      "brief": "Article summary",
      "tags": ["Tag 1", "Tag 2"],
      "view_count": 3998,
      "digg_count": 52,
      "collect_count": 77,
      "comment_count": 7,
      "hot_index": 258,
      "read_time": "14 min",
      "cover_image": "https://..."
    }
  ],
  "count": 20
}
```

## Usage

```
websculpt juejin get-hot
websculpt juejin get-hot --limit 10
websculpt juejin get-hot --sort_type 200
websculpt juejin get-hot --limit 5 --sort_type 200
```

## Common Error Codes

| Code | Description |
|------|-------------|
| `NETWORK_ERROR` | HTTP request failed (network issue or API downtime) |
| `API_ERROR` | Juejin API returned an error (`err_no !== 0`) |
| `EMPTY_RESULT` | API returned successfully but no articles were found |
