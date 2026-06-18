# Evidence: maimai/get-hot

This document records the research and validation evidence for the `maimai/get-hot` command.

## Exploration Path

- Checked the WebSculpt command library: no existing maimai command.
- Reviewed browser automation guidelines before proceeding.
- Attached to the user's existing Chrome session via CDP.
- Verified the user was already logged into maimai.cn (profile avatar visible).
- Opened `https://maimai.cn/community/hot-rank` and confirmed the hot-rank list renders 15 ranked topics server-side.
- Clicked a hot-rank topic and verified it navigates to `/community/topic-detail/{topic_id}/hot`.
- Used the search box to search for "人工智能" and switched to "热门排序" (sort by heat).
- Observed the search API endpoint in network requests: `GET /search/feeds?query={q}&limit={n}&offset={o}&highlight=true&sortby=heat&jsononly=1`.
- Verified the search API returns clean JSON with post content, engagement counts, and author metadata.

## Verified URLs

- `https://maimai.cn/community/hot-rank`
- `https://maimai.cn/community/topic-detail/KkBJM8F4/hot`
- `https://maimai.cn/web/search_center?highlight=true&query=%E4%BA%BA%E5%B7%A5%E6%99%BA%E8%83%BD&type=feed`
- `https://maimai.cn/search/feeds?query=%E4%BA%BA%E5%B7%A5%E6%99%BA%E8%83%BD&limit=20&offset=0&highlight=true&sortby=heat&jsononly=1`

## Structural Evidence

### Hot-rank page (`/community/hot-rank`)
- The page is server-rendered by Next.js RSC; the JSON POST response does not contain the list data directly.
- DOM structure is stable:
  - Container: `main > ul > li`
  - Each item contains a `<button>` with three lines of text:
    1. rank number (e.g., "1")
    2. topic title
    3. optional tag (e.g., "新", "爆")
- Extracted sample (2026-06-10):
  ```json
  [
    { "rank": "1", "title": "奥尔特曼认为AI行业存在大量无效投入", "tag": "新" },
    { "rank": "2", "title": "阿里合伙人委员会发帖，回应钉钉管理", "tag": "新" },
    { "rank": "3", "title": "小红书发力AI，推RED Skill功能", "tag": "新" },
    ...15 items total
  ]
  ```

### Search hot-posts API (`/search/feeds`)
- Endpoint: `GET https://maimai.cn/search/feeds`
- Required query params: `query`, `limit`, `offset`, `highlight=true`, `sortby=heat`, `jsononly=1`
- Response shape:
  ```json
  {
    "result": "ok",
    "data": {
      "feeds": [
        {
          "fid": "...",
          "feed": {
            "id": "...",
            "text": "...",
            "summary": "...",
            "crtime": "YYYY-MM-DD HH:MM:SS",
            "likes": 133,
            "spreads": 1,
            "total_cnt": 491,
            "ctype": "feed"
          },
          "contact": {
            "name": "...",
            "avatar": "...",
            "line1": "...",
            "company": "...",
            "position": "..."
          }
        }
      ]
    }
  }
  ```

## Failure Signals

- `auth_required`: if the user is not logged in, maimai redirects to a login wall. The command should surface `AUTH_REQUIRED`.
- `drift_detected`: if the hot-rank DOM structure changes (e.g., `main ul li button` no longer matches), extraction returns empty.
- `empty_result`: search API returns `result: "ok"` but `data.feeds` is empty.
- No CAPTCHA or 429 observed during exploration, but aggressive automation may trigger platform risk controls.

## Capture Assessment

This command should be captured. The path is verified and parameterizable:
- Default mode extracts the 15 hot topics from `/community/hot-rank`.
- Search mode uses the verified JSON API to return hot posts for any keyword (e.g., AI-related terms).
- The command requires browser login state and uses random delays to reduce anti-crawl risk.
