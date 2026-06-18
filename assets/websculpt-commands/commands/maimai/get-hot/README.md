# maimai/get-hot

Fetch the Maimai (maimai.cn) community hot-rank topics, or search for the hottest posts by keyword.

## Description

- Default mode: visits `https://maimai.cn/community/hot-rank` and extracts the top 15 hot-rank topics (rank, title, tag).
- Search mode: when `query` is provided, calls the Maimai search API `/search/feeds?sortby=heat` and returns posts sorted by heat, including author, title, and engagement counts.

Requires the browser to be logged in to Maimai; otherwise the command returns `AUTH_REQUIRED`.

## Parameters

- `limit` (optional, default `15`): Number of results to return. Maximum 15 in hot-rank mode, maximum 50 in search mode.
- `query` (optional): Search keyword, for example `AI` or `人工智能`. When provided, switches to hot-post search mode.
- `offset` (optional, default `0`): Only effective in search mode, used for pagination.

## Return Value

**Hot-rank mode**
```json
{
  "mode": "hot-rank",
  "count": 15,
  "items": [
    { "rank": 1, "title": "奥尔特曼认为AI行业存在大量无效投入", "tag": "新", "url": "..." }
  ]
}
```

**Search mode**
```json
{
  "mode": "search",
  "query": "人工智能",
  "limit": 20,
  "offset": 0,
  "count": 20,
  "items": [
    {
      "fid": "1755640416",
      "title": "人工智能领域发生大事了...",
      "summary": "...",
      "text": "...",
      "author": "吴得天",
      "author_title": "南通九维软件科技有限公司智能化架构师",
      "avatar": "...",
      "company": "...",
      "position": "...",
      "published_at": "2022-10-16 11:10:12",
      "likes": 133,
      "shares": 1,
      "comments": 491,
      "url": "https://maimai.cn/web/feed_detail?fid=1755640416"
    }
  ]
}
```

## Usage

```bash
# Maimai community hot-rank
websculpt maimai get-hot

# Only the top 5 hot-rank topics
websculpt maimai get-hot --limit 5

# Search hot posts related to AI
websculpt maimai get-hot --query AI

# Search for 人工智能 and return the top 10
websculpt maimai get-hot --query 人工智能 --limit 10
```

## Common Error Codes

- `AUTH_REQUIRED`: The browser is not logged in to Maimai. Please log in manually first.
- `DRIFT_DETECTED`: The hot-rank page DOM structure has changed and the command needs to be repaired.
- `API_ERROR`: The search API returned an error.
