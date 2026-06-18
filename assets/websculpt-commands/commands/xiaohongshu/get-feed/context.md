# Maintenance Notes: xiaohongshu/get-feed

## Command Overview

Browser-runtime command that extracts the Xiaohongshu explore/discover feed for a selected content channel. It navigates to the public explore page, reads the server-side rendered (SSR) state embedded in the page, optionally scrolls to trigger lazy-loaded content, and returns a list of notes.

## Runtime & Authentication

- Runtime: `browser`
- Auth: `required` — the browser must have an active `xiaohongshu.com` login session.

## Entry URL

- Base: `https://www.xiaohongshu.com/explore`
- With channel: `https://www.xiaohongshu.com/explore?channel_id=<channel_id>`

## Channel Mapping

The `category` parameter is mapped to a `channel_id` query parameter:

| Category | channel_id |
|----------|------------|
| 推荐 | `homefeed_recommend` |
| 穿搭 | `homefeed.fashion_v3` |
| 美食 | `homefeed.food_v3` |
| 彩妆 | `homefeed.cosmetics_v3` |
| 影视 | `homefeed.movie_and_tv_v3` |
| 职场 | `homefeed.career_v3` |
| 情感 | `homefeed.emotion_v3` |
| 家居 | `homefeed.home_v3` |
| 游戏 | `homefeed.game_v3` |
| 旅行 | `homefeed.travel_v3` |
| 健身 | `homefeed.fitness_v3` |

Users may pass any raw `channel_id` directly by adding it to the mapping if needed.

## Data Extraction

- SSR state is stored in a `<script>` tag as `window.__INITIAL_STATE__={...}`.
- The command reads the script text, strips the prefix, and evaluates it to avoid Vue reactivity proxy issues.
- Feed items are located at `feed.feeds` (object with integer-like keys).
- Each usable item contains a `noteCard` object with title, author, interaction info, cover, type, and optional video metadata.

## Anti-Crawl Measures

- Reuses the user's real browser profile and login state via CDP attach.
- Includes human-like delays: small random mouse moves, eased scroll steps with per-step jitter, and a pre-return pause.
- Avoids direct API calls that would require platform request signatures.

## Failure Signals

- `INVALID_PARAM` — the requested `category` is not in the channel map.
- `DRIFT_DETECTED` — the SSR script or expected state paths are missing.
- `EMPTY_RESULT` — no notes in the feed, often due to an expired or missing login session.
- `AUTH_REQUIRED` — returned by the runner when the browser has no active login session.

## Repair Hints

1. If the SSR script cannot be found, verify the page still renders `window.__INITIAL_STATE__` and that the variable name has not changed.
2. If channel names change, update `CHANNEL_MAP` in `command.js` and this document.
3. If `noteCard` field names change, update the extraction mapping in `command.js`.
4. If lazy-loaded content stops appearing, check whether the scroll distance or wait time needs adjustment.
