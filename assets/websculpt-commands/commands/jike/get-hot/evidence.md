# Evidence: jike/get-hot

This document records the research and validation evidence for the `jike/get-hot` command.

## Exploration Path

1. Checked `websculpt command list` — no existing jike command. Confirmed no conflict.
2. Consulted `skills/websculpt-explore/references/access/playwright-cli-guide.md` for browser automation protocol.
3. Used Playwright CLI to attach to user's Chrome session with existing Jike login state.
4. Explored `https://web.okjike.com/explore` (discovery page) — found personalized recommendation feed, no global hot-ranking UI.
5. Navigated to `https://web.okjike.com/topic/63579abb6724cc583b9bba9a` (AI探索站 topic/circle) — discovered two tabs: "动态" (square/live) and "热门" (selected/hot).
6. Clicked "热门" tab — URL changed to `/topic/{id}/selected`, confirmed hot-ranked posts exist.
7. Used `https://web.okjike.com/search?q=AI` to verify topic discovery via search.
8. Captured network requests to identify the underlying API endpoints.

The exploration trace is recorded at `.websculpt/explores/jike-hot-topics/trace.md`.

## Verified URLs

- https://web.okjike.com/explore — Discovery page, verified no global hot-list exists
- https://web.okjike.com/topic/63579abb6724cc583b9bba9a/selected — AI探索站 topic hot tab, verified hot-ranked posts
- https://web.okjike.com/search?q=AI — Search page, verified topic discovery
- https://api.ruguoapp.com/1.0/search/integrate (POST) — Search API, returns topics/users/posts
- https://api.ruguoapp.com/1.0/topics/getDetail?id=63579abb6724cc583b9bba9a (GET) — Topic detail API
- https://api.ruguoapp.com/1.0/topics/tabs/selected/feed (POST) — Hot posts API (core endpoint)
- https://api.ruguoapp.com/1.0/topics/tabs/square/feed (POST) — Live posts API (fallback)

## Structural Evidence

### API Endpoints

All API requests go to `https://api.ruguoapp.com/1.0/`. The base domain and cookies are shared with the web app (`web.okjike.com`), so the browser session automatically includes the necessary auth cookies.

**1. Search topics: `POST /1.0/search/integrate`**

Request body (formatted):
```json
{"q": "AI", "limit": 20}
```

Response structure:
```json
{
  "data": [
    {"type": "SECTION_HEADER", "sectionViewType": "SEARCH", "title": "主题"},
    {"id": "63579abb6724cc583b9bba9a", "type": "TOPIC", "content": "AI探索站", "subscribersCount": 113152, "squarePicture": {...}, "topicType": "OFFICIAL", ...},
    {"type": "SECTION_HEADER", "sectionViewType": "SEARCH", "title": "用户"},
    {"id": "...", "type": "USER", "screenName": "...", ...}
  ]
}
```

Key TOPIC fields: `id`, `content` (name), `subscribersCount`, `squarePicture.picUrl`, `topicType`, `briefIntro`.

**2. Topic detail: `GET /1.0/topics/getDetail?id={topicId}`**

Response: `{ "success": true, "data": { "id": ..., "content": "AI探索站", "subscribersCount": 113152, "approximateSubscribersCount": "11万", "squarePicture": {...}, "briefIntro": "...", ... } }`

**3. Hot posts: `POST /1.0/topics/tabs/selected/feed`**

Request body (formatted):
```json
{"topicId": "63579abb6724cc583b9bba9a", "limit": 20}
```

Response structure:
```json
{
  "data": [
    {
      "id": "6a1d7c8e7d7e0332c2e86860",
      "type": "ORIGINAL_POST",
      "content": "才发现 6.2 报名就要截止了...",
      "likeCount": 59,
      "commentCount": 8,
      "repostCount": 2,
      "shareCount": 19,
      "createdAt": "...",
      "user": {
        "id": "...",
        "username": "9653043B-54DD-4AE5-8DC7-C7FD0FA0BF87",
        "screenName": "海辛Hyacinth",
        "briefIntro": "...",
        "avatarImage": { "thumbnailUrl": "...", "smallPicUrl": "...", "picUrl": "..." },
        "statsCount": { "followedCount": ..., "liked": ..., "followingCount": ... }
      },
      "topic": {
        "id": "63579abb6724cc583b9bba9a",
        "type": "TOPIC",
        "content": "AI探索站",
        "subscribersCount": 113152,
        "squarePicture": { "picUrl": "..." }
      },
      "pictures": [...],
      "urlsInText": [...]
    }
  ]
}
```

Key post fields: `id`, `type`, `content`, `likeCount`, `commentCount`, `repostCount`, `shareCount`, `createdAt`, `user` (screenName, username, briefIntro, avatarImage, statsCount), `topic` (id, content, subscribersCount), `pictures` (array of {picUrl, thumbnailUrl, ...}), `urlsInText`.

**4. Square/live posts (fallback): `POST /1.0/topics/tabs/square/feed`**

Same request and response structure as `selected/feed`, but returns chronological posts instead of hot-ranked ones.

### Data Flow

```
search/integrate (keyword) → extract TOPIC ids → filter relevant topics
    → getDetail (topicId) → verify topic metadata
    → selected/feed (topicId) → extract hot-ranked posts with full metadata
```

### DOM / Page Structure (not used for extraction — API-based approach)

The web app at `web.okjike.com` is a React SPA. Pages use Mantine UI components with generated class names and refs. We do NOT rely on DOM selectors — all data extraction goes through the API endpoints above.

## Failure Signals

- **AUTH_REQUIRED**: If the browser session does not have valid Jike login cookies, API calls will return 401 or redirect to login.
- **NOT_FOUND**: Topic ID does not exist or is no longer accessible.
- **EMPTY_RESULT**: Search or feed returns zero items (valid but empty).
- **DRIFT_DETECTED**: API response structure changes — expected fields (`data`, `id`, `content`, `likeCount`, `user.screenName`, `topic.content`) are missing or have different types.
- **RATE_LIMITED**: API returns 429 or error indicating rate limiting.
- **NETWORK_ERROR**: API unreachable (fetch throws).

## Capture Assessment

This command should be captured. The API-based extraction path is stable, reproducible, and does not depend on fragile DOM selectors. The Jike web API (`api.ruguoapp.com`) provides structured JSON responses with all necessary fields for a hot-ranking command. The browser runtime is required only for auth cookie inheritance — the actual data extraction is entirely API-driven.

The command maps directly to the P0 `jike/get-hot` entry in AnyTrend's platform coverage roadmap.
