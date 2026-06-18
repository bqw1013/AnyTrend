# Context

## Precipitation Background

This command fetches trending billboard data from the Douyin Creator Center Creative Insights module. It was created as part of the AnyTrend multi-platform trend-monitoring roadmap. Douyin is a major short-video platform, and its creator-center rankings are a useful signal source for content trend analysis. Access requires an authenticated browser session because the data is only available to logged-in creators.

## Value Assessment

- **Generality**: High. The command covers 6 billboard types, 20+ content categories, 4 sort orders, and 3 time ranges.
- **Reuse frequency**: Suitable for daily or hourly trend dashboards.
- **Time saved**: Automated retrieval takes seconds compared with manual browsing.

## Page Structure

### Key URLs
- Target page: `https://creator.douyin.com/creator-micro/creative-guidance`
- Billboard API: `GET https://creator.douyin.com/web/api/creator/material/center/billboard/`
- Config API: `GET https://creator.douyin.com/web/api/creator/material/center/config/`
- User info API: `GET https://creator.douyin.com/aweme/v1/creator/pc/user/info/`

### UI Structure (for reference)
- Top-level tabs include 创意洞察, 活动日历, and 关联视频搜索.
- Sub-menu items cover the six billboard types: 热门视频, 创作热点, 热门话题, 热门挑战, 热门道具, 热门音乐.
- Category tags are rendered as a horizontal list, e.g. 全部, 美食, 旅行, 泛生活, 汽车, 科技, 游戏, 二次元, 更多.
- Sort and time filters use dropdown components rendered in portal containers.

### API Parameter Mapping

**billboard_type**:
1=video, 2=hotspot, 3=topic, 4=challenge, 5=prop, 6=music

**order_key** (billboard_type=1 only):
1=play, 2=like, 3=comment, 4=hot

**time_filter** (billboard_type=1 only):
1=24h, 2=7d, 3=30d

**billboard_tag** (category codes from config API):
0=全部, 333=美食, 334=旅行, 299=泛生活, 335=汽车, 336=科技, 302=游戏, 296=二次元,
337=娱乐, 311=明星, 298=体育, 300=文化教育, 297=政务, 305=时尚, 306=才艺,
669=财经, 307=动植物, 309=图文控, 308=剧情, 315=亲子, 718=三农, 310=创意

## Environment Dependencies

- **Browser**: Chrome with remote debugging enabled.
- **Login state**: Must be logged into `creator.douyin.com` as a Douyin creator.
- **Security SDK**: The page loads a platform security SDK that can sign URLs when available.
- **Session tokens**: `msToken` is obtained dynamically from API response headers or browser storage.

## Failure Signals

- **Login expired**: Billboard API returns 401/403 or an empty `item_list` — re-login in Chrome.
- **Tag code not found**: Requested tag name does not match any entry in `hot_word_tag_list` — falls back to 全部 (all).
- **API structure drift**: Response `status_code` is non-zero, or expected fields are missing — inspect the live API response.
- **Rate limiting**: 429 or connection errors — reduce call frequency.
- **SDK change**: URL signing throws or returns unexpected values — verify the current page SDK API in DevTools.

## Repair Clues

- Keep parameter mappings synchronized with the creator center UI and API.
- Category codes should be resolved dynamically from the config API when possible; avoid hardcoding new category IDs.
- If the billboard API fails while the config API succeeds, focus diagnosis on billboard-specific parameters.
- Use browser DevTools to capture a working request from the actual page when troubleshooting signature or parameter issues.
