# baidu/get-hot

Fetch Baidu hot-search rankings for multiple board types.

## Description

Calls the public Baidu hot-search API to retrieve realtime, homepage, novel, movie, and teleplay boards. Returns ranked hot-search items with title, heat index, description, tag, cover image, search link, and trend.

No browser or authentication required.

## Parameters

| Name | Required | Default | Description |
|------|----------|---------|-------------|
| `tab` | No | `realtime` | Board type: `realtime` (real-time hot search, 50 items), `homepage` (homepage hot search, 15 items), `novel` (novel board, 30 items), `movie` (movie board, 10 items), `teleplay` (TV drama board, 10 items). |
| `limit` | No | `20` | Maximum number of items to return. |

## Return Value

```json
{
  "tab": "realtime",
  "total": 50,
  "count": 20,
  "items": [
    {
      "rank": 1,
      "title": "跑好历史接力赛",
      "heatIndex": "7808529",
      "description": "...",
      "tag": "",
      "tagImg": "",
      "image": "https://...",
      "url": "https://www.baidu.com/s?wd=...",
      "trend": "same"
    }
  ]
}
```

## Usage

```bash
# Default: top 20 real-time hot search items
websculpt baidu get-hot

# Top 10 real-time hot search items
websculpt baidu get-hot --limit 10

# Top 30 novel board items
websculpt baidu get-hot --tab novel --limit 30

# Movie board
websculpt baidu get-hot --tab movie

# TV drama board
websculpt baidu get-hot --tab teleplay
```

## Common Error Codes

| Code | Description |
|------|-------------|
| `INVALID_PARAM` | `tab` is not one of the supported board types. |
| `NETWORK_ERROR` | Network request failed. |
| `API_ERROR` | API returned a non-success status or `success=false`. |
| `PARSE_ERROR` | Failed to parse the API response as JSON. |
| `DRIFT_DETECTED` | API response structure changed; maintenance needed. |
