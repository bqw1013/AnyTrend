# Evidence: xiaohongshu/get-feed

This document records the research and validation evidence for the `xiaohongshu/get-feed` command.

## Exploration Path

- Checked the command library for existing Xiaohongshu commands.
- Closest references: `douyin/get-hot` (browser, login-required), `zhihu/get-hot` (browser, hot list).
- Verified browser attachment via Playwright CLI CDP and read the browser guide.
- Discovered Vue SSR with embedded `window.__INITIAL_STATE__` — extraction from raw script text avoids Vue reactivity circular references.
- Channel/category tabs (推荐, 穿搭, 美食, etc.) found by clicking through the UI and recording the URL pattern `?channel_id=homefeed.{channel}_v3`.
- Scrolling triggers lazy-load requests after scrolling ~3000px.

## Verified URLs

- `https://www.xiaohongshu.com/explore` — Main explore/discover page (SSR data: 35 notes)
- `https://www.xiaohongshu.com/explore?channel_id=homefeed.fashion_v3` — 穿搭 channel
- `https://www.xiaohongshu.com/explore?channel_id=homefeed.food_v3` — 美食 channel
- `https://www.xiaohongshu.com/explore?channel_id=homefeed.cosmetics_v3` — 彩妆 channel
- `https://www.xiaohongshu.com/explore?channel_id=homefeed.movie_and_tv_v3` — 影视 channel

## Structural Evidence

### SSR Data Extraction

The page embeds SSR state in a `<script>` tag as:

```
window.__INITIAL_STATE__={...}
```

**Extraction method**: Read script text content, strip prefix, use `eval('(' + text + ')')` to reconstruct the object. This avoids Vue reactivity proxy circular references that occur when accessing `window.__INITIAL_STATE__` directly.

**Key state paths**:
- `feed.feeds` — Object with integer keys (not array): `{"0": {...}, "1": {...}, ...}`
- `feed.channels` — Channel metadata
- `feed.currentChannel` — Active channel info

**Note item structure** (from `feed.feeds[key]`):
```javascript
{
  id: "6a1d505d0000000007013e12",       // Note ID
  model_type: "note",
  ignore: false,
  xsec_token: "ABN4Opo7h9NwMCcjdI3Ma-...",
  note_card: {
    type: "normal" | "video",            // Content type
    display_title: "笔记标题",
    user: {
      nickname: "作者昵称",
      user_id: "5aebc9514eacab7ff43363b3",
      avatar: "https://sns-avatar-qc.xhscdn.com/...",
      nick_name: "作者昵称"
    },
    interact_info: {
      liked_count: "2.8万",             // Like count (string, may include Chinese units)
      liked: false
    },
    cover: {
      url_default: "http://sns-webpic-qc.xhscdn.com/...",
      url_pre: "http://...",
      width: 1200,
      height: 1600,
      info_list: [{image_scene: "WB_PRV", url: "..."}, {image_scene: "WB_DFT", url: "..."}]
    },
    video: {                             // Only present when type === "video"
      capa: { duration: 1876 }           // Duration in milliseconds
    }
  }
}
```

### Channel ID Mapping (verified by UI clicking)

| Chinese Name | channel_id URL Parameter |
|-------------|--------------------------|
| 推荐 (default) | `homefeed_recommend` |
| 穿搭 | `homefeed.fashion_v3` |
| 美食 | `homefeed.food_v3` |
| 彩妆 | `homefeed.cosmetics_v3` |
| 影视 | `homefeed.movie_and_tv_v3` |

Additional channels follow the same pattern with an English translation + `_v3` suffix. For unsupported channels, users can pass the raw `channel_id` directly.

### Human-like Behavior Pattern

- Smooth scroll with easing: 8–14 steps, each step delayed 100–400ms (random)
- Scroll Y target: current position + 1500–3000px (random)
- Pre-return delay: 800–3000ms to simulate reading
- Mouse move: random small movements within page bounds

## Failure Signals

- **Login expired**: SSR data has no feed items or user redirects to login page → `AUTH_REQUIRED`
- **Channel not found**: Requested category name doesn't match any known channel_id → `INVALID_PARAM`
- **SSR script missing**: `<script>` tag with `__INITIAL_STATE__` not found → `DRIFT_DETECTED` (page structure changed)
- **Empty feed**: `feed.feeds` has 0 keys → `EMPTY_RESULT`
- **DOM structure drift**: `.note-item` selectors or `window.__INITIAL_STATE__` field names change → `DRIFT_DETECTED`

## Capture Assessment

This command should be captured because:
1. **Proven path**: SSR extraction works reliably, verified across multiple channels (fashion, food, cosmetics, movie_and_tv)
2. **No direct API dependency**: Data comes from embedded SSR state, avoiding request-signature reverse-engineering
3. **Reusable**: 11+ channels, parameterizable, useful for trend analysis
4. **Human-like**: Built-in behavioral delays reduce bot detection risk
