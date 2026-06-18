# douyin/get-hot

Fetch trending billboard data from the Douyin Creator Center's Creative Insights module. Supports multiple billboard types, content categories, sort orders, and time ranges.

## Description

This command retrieves structured trending-rank data from the Douyin Creator Center (`creator.douyin.com`) Creative Insights module. It calls the platform's JSON API and returns ranked entries with title, author, play count, likes, comments, shares, hot score, cover image, keywords, and more.

**Key capabilities**:
- 🎬 **6 billboard types**: hot videos, creation hotspots, hot topics, hot challenges, hot props, hot music
- 🏷️ **20+ content categories**: 美食, 旅行, 游戏, 科技, 娱乐, 体育, and more
- 📊 **4 sort dimensions**: most plays, most likes, most comments, highest hot score
- ⏱️ **3 time ranges**: 24 hours, 7 days, 30 days

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `type` | string | No | `video` | Billboard type: `video` (hot videos) / `hotspot` (creation hotspots) / `topic` (hot topics) / `challenge` (hot challenges) / `prop` (hot props) / `music` (hot music) |
| `tag` | string | No | `全部` | Content category label in Chinese, e.g. `美食`, `旅行`, `科技`, `游戏`. Only applies when `type=video` |
| `order` | string | No | `play` | Sort order: `play` (most plays) / `like` (most likes) / `comment` (most comments) / `hot` (highest hot score). Only applies when `type=video` |
| `period` | string | No | `24h` | Time range: `24h` (last 24 hours) / `7d` (last 7 days) / `30d` (last 30 days). Only applies when `type=video` |
| `limit` | number | No | `20` | Maximum number of entries to return (1–50) |

## Return Value

```json
{
  "items": [
    {
      "rank": 1,
      "title": "视频标题",
      "author_name": "作者昵称",
      "author_link": "https://www.iesdouyin.com/share/user/...",
      "play_count": 48847847,
      "like_count": 2138430,
      "comment_count": 34065,
      "share_count": 39809,
      "hot_score": 148900,
      "duration": 266053,
      "key_words": ["儿童节", "嫣然", "医疗"],
      "cover_url": "https://p9-sign.douyinpic.com/...",
      "item_id": "7646294080116539115"
    }
  ],
  "count": 20,
  "total_available": 50
}
```

**Field descriptions**:
- `rank`: 1-based ranking position
- `title`: Video title (may include hashtags)
- `author_name`: Creator nickname
- `author_link`: Creator profile URL
- `play_count`: Play count
- `like_count`: Like count
- `comment_count`: Comment count
- `share_count`: Share count
- `hot_score`: Douyin composite hot score (ranking basis)
- `duration`: Video duration in milliseconds
- `key_words`: Related trending keywords
- `cover_url`: Cover image URL
- `item_id`: Douyin video unique ID

## Usage

```bash
# Hot videos (default: all categories, most plays, last 24 hours)
websculpt douyin get-hot

# Food category, highest hot score, last 7 days
websculpt douyin get-hot --tag 美食 --order hot --period 7d

# Gaming category, most likes, last 30 days, return 10 items
websculpt douyin get-hot --tag 游戏 --order like --period 30d --limit 10

# Creation hotspots
websculpt douyin get-hot --type hotspot

# Hot topics
websculpt douyin get-hot --type topic

# Hot music
websculpt douyin get-hot --type music
```

## Common Error Codes

| Code | Meaning | Suggestion |
|------|---------|------------|
| `AUTH_REQUIRED` | Not logged in to a Douyin creator account | Log in to `creator.douyin.com` in Chrome and retry |
| `INVALID_PARAM` | Invalid parameter value | Check that `type`/`order`/`period` are within allowed values |
| `EMPTY_RESULT` | No results for the query | Try a different category or time range |
| `SDK_NOT_LOADED` | Platform security SDK failed to load | Check network connection or wait for the page to fully load |
| `API_ERROR` | API returned an unexpected status | Possible rate limit; reduce call frequency |
| `BROWSER_ATTACH_REQUIRED` | Browser not connected | Connect Chrome via the Playwright CLI CDP attach flow first |

## Prerequisites

1. **Login state**: A Douyin creator account must be logged in on `creator.douyin.com` in Chrome.
2. **Browser connection**: Chrome must be connected via Playwright CLI CDP.
3. **Security SDK**: The page's security SDK is used automatically when available.
