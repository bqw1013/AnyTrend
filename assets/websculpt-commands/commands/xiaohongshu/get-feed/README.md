# xiaohongshu/get-feed

Get Xiaohongshu explore/discover feed notes from a specified content channel.

## Description

Fetches the personalized content feed from Xiaohongshu's explore page. Data is extracted from server-side rendered (SSR) state embedded in the page HTML, avoiding direct API calls that require request signing.

This command requires a browser with an active Xiaohongshu login session.

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `category` | string | No | `推荐` | Content channel: 推荐, 穿搭, 美食, 彩妆, 影视, 职场, 情感, 家居, 游戏, 旅行, 健身 |
| `limit` | number | No | `20` | Max notes to return |

## Return Value

```typescript
{
  channel: string;              // Channel display name
  channel_id: string;           // Channel ID (e.g., "homefeed.fashion_v3")
  notes: Array<{
    rank: number;               // Position in feed (1-based)
    note_id: string;            // Note ID
    title: string;              // Note title
    type: "normal" | "video";   // Content type
    author: {
      nickname: string;         // Author display name
      user_id: string;          // Author user ID
      avatar: string;           // Avatar image URL
    };
    likes: string;              // Like count (e.g., "2.8万")
    cover: {
      url: string;              // Cover image URL
      width: number;            // Cover width (px)
      height: number;           // Cover height (px)
    };
    duration: number;           // Video duration in ms (0 for non-video)
    note_url: string;           // Full note URL
  }>;
  count: number;                // Actual returned count
  total_available: number;      // Total notes in feed state
}
```

## Usage

```bash
# Default: 推荐 channel, 20 notes
websculpt xiaohongshu get-feed

# Specific channel
websculpt xiaohongshu get-feed --category 穿搭

# Custom limit
websculpt xiaohongshu get-feed --category 彩妆 --limit 10
```

## Common Error Codes

| Code | Meaning |
|------|---------|
| `INVALID_PARAM` | Unknown category name |
| `DRIFT_DETECTED` | Page structure changed — SSR script not found |
| `EMPTY_RESULT` | No notes in feed (empty channel or login required) |
| `AUTH_REQUIRED` | Login session expired or not present |
