# youtube/get-feed

Fetch YouTube homepage video feed as a trending substitute.

## Description

Since the dedicated YouTube Trending page (`/feed/trending`) is unavailable in some regions (redirects to homepage), this command extracts ranked video recommendations from the YouTube homepage. The homepage feed serves as a practical trending indicator, showing popular and recommended videos with full metadata.

Data is extracted primarily from YouTube's internal `ytInitialData` JSON, with a DOM-based fallback for resilience.

## Parameters

| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| `limit` | No | `20` | Number of videos to return (max 50) |
| `tab` | No | `全部` | Homepage tab: `全部`, `音乐`, `直播`, `播客`, `游戏`, `最近上传`, `发现新视频` |

## Return Value

```json
{
  "items": [
    {
      "rank": 1,
      "videoId": "ZlDnsf_DOzg",
      "title": "Every Claude Code Concept Explained for Normal People",
      "channel": "Simon Scrapes",
      "channelUrl": "/@simonscrapes",
      "views": "73万次观看",
      "publishedTime": "3个月前",
      "duration": "27:24",
      "videoUrl": "https://www.youtube.com/watch?v=ZlDnsf_DOzg"
    }
  ],
  "count": 1
}
```

## Usage

```
websculpt youtube get-feed
websculpt youtube get-feed --limit 10
websculpt youtube get-feed --tab 音乐
websculpt youtube get-feed --tab 游戏 --limit 5
```

## Common Error Codes

| Code | Description |
|------|-------------|
| `EMPTY_RESULT` | No video content found on the homepage (e.g., restricted region or unusual page state) |
| `COMMAND_TIMEOUT` | Page navigation or data extraction timed out |
| `BROWSER_ATTACH_REQUIRED` | Browser not connected — ensure Chrome remote debugging is enabled |
