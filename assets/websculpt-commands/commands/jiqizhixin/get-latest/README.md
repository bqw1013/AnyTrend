# jiqizhixin/get-latest

Fetch the latest AI article list from Jiqizhixin (机器之心), sorted by time in descending order.

## Description

Fetch the latest AI article list from Jiqizhixin, sorted by time in descending order. Jiqizhixin does not provide a traditional "hot" ranking — all sort parameters return the same reverse-chronological result. The command is named `get-latest` to accurately reflect this behavior. Returns article title, author, publish time, category, tags, summary, cover image, etc. No authentication required.

## Naming Note

This command is named `get-latest` rather than `get-hot` because Jiqizhixin has no traditional hot-ranking feature. All sort values accepted by the article-library API (`time`, `hot`, `popular`, etc.) return the same reverse-chronological list. The homepage effectively presents "latest as hottest".

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `limit` | number | No | 20 | Number of articles to return, between 1 and 20. The API always returns about 20 items; the command truncates client-side. |

## Return Value

```json
{
  "totalCount": 29861,
  "hasNextPage": true,
  "publishedArticlesCount": 29861,
  "elapsedDays": 4172,
  "limit": 20,
  "articles": [
    {
      "id": "uuid-string",
      "title": "文章标题",
      "coverImageUrl": "https://image.jiqizhixin.com/...",
      "category": "industry",
      "slug": "2026-06-04-3",
      "tagList": ["标签1", "标签2"],
      "author": "机器之心",
      "publishedAt": "2026/06/04 12:07",
      "content": "摘要文本（截断）...",
      "source": "机器之心"
    }
  ],
  "tags": ["标签1", "标签2", "..."]
}
```

## Usage

```bash
# Fetch the latest articles (default 20)
websculpt jiqizhixin get-latest

# Specify a count
websculpt jiqizhixin get-latest --limit 10
```

## Common Error Codes

| Error Code | Description |
|------------|-------------|
| `CSRF_MISSING` | CSRF token not found on the homepage |
| `INVALID_PARAM` | `limit` is not an integer between 1 and 20 |
| `API_ERROR` | Article API returned an error status or `success=false` |
| `EMPTY_RESULT` | Returned article list is empty |
