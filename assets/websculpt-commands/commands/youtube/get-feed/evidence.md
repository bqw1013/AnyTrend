# Evidence: youtube/get-feed

This document records the research and validation evidence for the `youtube/get-feed` command.

## Exploration Path

- Executed `websculpt command list` — no existing YouTube command in the library.
- Consulted `references/access/playwright-cli-guide.md` for browser automation protocol.
- Used `@playwright/cli` CDP attach to explore YouTube homepage and verify data extraction paths.
- Multiple URL variants tested (`/feed/trending`, `/feed/explore`, `/feed/trending?gl=US&hl=en`) — all redirect to homepage, confirming no dedicated Trending page exists for this region.

## Verified URLs

- `https://www.youtube.com/` — homepage, the primary data source. Contains video recommendation feed with rich metadata.
- `https://www.youtube.com/feed/trending` — returns 302 redirect to `/`, not a valid trending endpoint.
- `https://www.youtube.com/feed/explore` — returns 302 redirect to `/`, not a valid endpoint.

## Structural Evidence

**Primary data source: `window.ytInitialData`**

Path to video items:
```
contents.twoColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.richGridRenderer.contents[]
```

Each content item structure:
- `richItemRenderer.content.videoRenderer` — the video data object
  - `videoId: string` — unique video identifier
  - `title: { runs: [{ text: string }] }` — video title
  - `ownerText: { runs: [{ text: string, navigationEndpoint: { browseEndpoint: { canonicalBaseUrl: string } } }] }` — channel name and URL
  - `viewCountText: { simpleText: string }` — view count (may be absent for very new videos)
  - `publishedTimeText: { simpleText: string }` — relative time (may be absent)
  - `lengthText: { simpleText: string }` — video duration
  - `thumbnail: { thumbnails: [{ url: string }] }` — thumbnail images

Not all richGridRenderer items are videos — some are ads (`adRenderer`), continuation markers (`continuationItemRenderer`), or shelf sections. Filter for `richItemRenderer.content.videoRenderer`.

**Fallback DOM approach (if ytInitialData is unavailable):**

DOM elements: `ytd-rich-item-renderer` (32 found on page). Each contains:
- `a#video-title-link` or link to `/watch?v=VIDEO_ID`
- `yt-formatted-string` for title text
- `ytd-channel-name` for channel info

## Failure Signals

- **Region restriction**: `/feed/trending` redirects to homepage in this region. The command uses homepage feed as the data source, which is universally available.
- **ytInitialData absent or restructured**: YouTube periodically changes its internal data format. If `window.ytInitialData` is missing or the content path returns undefined, fall back to DOM extraction.
- **Empty feed**: If no `videoRenderer` items are found (e.g., user is logged out and YouTube shows a minimal page), return `EMPTY_RESULT`.
- **Ad items mixed in**: `richGridRenderer.contents` includes ads and other non-video items. Code must filter strictly for `videoRenderer`.

## Capture Assessment

This command should be captured. The homepage feed provides reliable, structured video data that serves as a practical substitute for the unavailable Trending page. The extraction path via `ytInitialData` is stable and commonly used by YouTube scrapers, with a DOM fallback for resilience. Command provides clear value for tracking video trends across categories.
