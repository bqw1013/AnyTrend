# Evidence: toutiao/get-hot

This document records the research and validation evidence for the `toutiao/get-hot` command.

## Exploration Path

- Checked command library via `websculpt command list`: 13 existing commands found, none for toutiao.com.
- Read `references/access/playwright-cli-guide.md` for browser automation protocol.
- Attached to existing Chrome session via `playwright-cli attach --cdp=chrome --session=default`.
- Opened `https://www.toutiao.com/` in new tab, observed network requests to discover API endpoints.
- Tested both APIs (hot-board and feed) from within `page.evaluate()` context — both work without explicit signature parameters because browser cookies handle authentication.
- Clicked through all 15 channel tabs to build complete channel_id mapping.
- 热点 tab uses a completely different API (`/hot-event/hot-board/`) from all other channels (`/api/pc/list/feed`).
- 懂车帝 redirects externally and has no feed API; 关注 requires login.

## Verified URLs

- `https://www.toutiao.com/` — main SPA entry point, loads initial channel config and SSR data
- `https://www.toutiao.com/hot-event/hot-board/?origin=toutiao_pc` — hot board API for 热点 tab (50 ranked items)
- `https://www.toutiao.com/api/pc/list/feed?channel_id=3189399007&min_behot_time=0&offset=0&refresh_count=1&category=pc_profile_channel&client_extra_params={"short_video_item":"filter"}&aid=24&app_name=toutiao_web` — feed API for 财经 channel (example)
- `https://www.toutiao.com/api/pc/list/feed?channel_id=0&min_behot_time=0&offset=0&refresh_count=1&category=pc_profile_recommend&aid=24&app_name=toutiao_web` — feed API for 推荐 channel

## Structural Evidence

### Two Data APIs

**1. Hot-Board API** (for 热点 channel only):
- Endpoint: `https://www.toutiao.com/hot-event/hot-board/?origin=toutiao_pc`
- Method: GET
- Response structure: `{ data: [{ ClusterId, Title, Label, LabelUrl, HotValue, Url, Schema }] }`
- Returns max 50 ranked items with hot values
- Fields: Title (string), HotValue (string, numeric), Label ("hot"/"新"/"爆"/etc), Url (detail page), ClusterId (unique ID)

**2. Feed API** (for all other channels):
- Endpoint: `https://www.toutiao.com/api/pc/list/feed`
- Method: GET
- Required params: `channel_id`, `min_behot_time` (cursor, 0 for first page), `offset`, `refresh_count`, `category`, `aid=24`, `app_name=toutiao_web`
- Optional: `client_extra_params={"short_video_item":"filter"}`
- Response: `{ has_more: boolean, data: [article objects], cursor: number }`
- Article fields: title, Abstract, article_url, media_name, source, behot_time, comment_count, digg_count, read_count, share_count, has_video, image_list (array of url objects), middle_image, keywords, tag, label, group_id, item_id, publish_time, video_duration
- Pagination: use `cursor` value from last item as `min_behot_time` for next page, while `has_more` is true

### Channel ID Mapping

Hardcoded mapping required because channel IDs are embedded in JS bundles, not in SSR data or DOM attributes:

| Channel Name | channel_id | category | Special |
|---|---|---|---|
| 推荐 | 0 | pc_profile_recommend | no client_extra_params |
| 北京 | 3202164529 | pc_profile_channel | |
| 视频 | 3431225546 | pc_profile_channel | |
| 财经 | 3189399007 | pc_profile_channel | |
| 科技 | 3189398999 | pc_profile_channel | |
| 热点 | — | — | uses hot-board API, not feed |
| 军事 | 3189398996 | pc_profile_channel | |
| 国际 | 3189398960 | pc_profile_channel | |
| 体育 | 3189398968 | pc_profile_channel | |
| 娱乐 | 3189398957 | pc_profile_channel | |
| 历史 | 3189398972 | pc_profile_channel | |
| 美食 | 3189398965 | pc_profile_channel | |
| 直播 | 3189399002 | pc_profile_channel | |
| 旅游 | 3189398983 | pc_profile_channel | |

Excluded channels:
- 关注: requires login (no anonymous access)
- 懂车帝: redirects externally to dcd app, no feed API

### Execution Strategy

Browser runtime required because both APIs need cookies set by visiting toutiao.com first. Strategy:
1. Navigate to `https://www.toutiao.com/` with `waitUntil: "domcontentloaded"` to establish session cookies
2. If channel is 热点: call hot-board API via `page.evaluate` (fetch from within browser context)
3. For all other channels: build feed API URL with correct `channel_id` and `category`, call via `page.evaluate`
4. For feed pagination: use `cursor` from previous response as `min_behot_time`

## Failure Signals

- **DRIFT_DETECTED**: hot-board API returns `data` with unexpected structure or empty array; feed API returns `has_more` but empty `data`; channel_id mapping becomes stale (new channels added/removed)
- **EMPTY_RESULT**: API returns success but zero items (may happen for obscure channels or off-hours)
- **NETWORK_ERROR**: API request fails (toutiao.com unreachable, CDN issues)
- **INVALID_PARAM**: channel name not in the supported list
- Hot-board has fixed 50 items; subsequent pages will be empty (no pagination support for this API)
- Session cookies have a TTL; if the command runs for a very long time, a fresh navigation may be needed

## Capture Assessment

This command should be captured. The exploration phase:
- Verified two stable API endpoints on toutiao.com
- Built complete channel_id mapping for 14 channels
- Confirmed both APIs work from within browser context without explicit signature handling
- Tested actual data extraction successfully

The browser runtime approach is required because the APIs depend on cookies established by visiting toutiao.com. The `page.evaluate` pattern (calling fetch from within the page context) is a proven approach used by other WebSculpt commands (e.g., douyin/get-hot, jiqizhixin/get-latest).
