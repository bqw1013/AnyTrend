# Evidence: x/get-trending

This document records the research and validation evidence for the `x/get-trending` command.

## Exploration Path

- Checked command library: `websculpt command list` — 17 commands registered, none for X/Twitter
- Read `playwright-cli-guide.md` for browser automation protocol
- Used Playwright CLI (v0.1.13) attached to Chrome `default` session (already open, logged into X.com as an authenticated user)
- Navigated to `https://x.com/explore/tabs/trending` — page loaded successfully with trending content
- Inspected DOM: trends rendered as `<div data-testid="trend">` elements
- Discovered GraphQL API endpoints via network request inspection:
  - `GenericTimelineById` (`xjVsCYARMt6R_z0QeWcRGA`) — returns pure trending timeline
  - `ExplorePage` (`LOLkOnxrvpJzJwyZ7748Bw`) — returns mixed explore feed
- Visited `https://x.com/settings/explore` — confirmed no explicit region dropdown; location is IP-based with toggle switches
- Extracted full API response bodies to verify data structures

## Verified URLs

- `https://x.com/explore/tabs/trending` — X Trending tab, primary data source
- `https://x.com/settings/explore` — Explore settings page (location/personalization toggles)
- `https://x.com/i/api/graphql/xjVsCYARMt6R_z0QeWcRGA/GenericTimelineById?variables={"timelineId":"VGltZWxpbmU6DAC2CwABAAAACHRyZW5kaW5nAAA=","count":20,"withQuickPromoteEligibilityTweetFields":true}` — Trending timeline GraphQL API
- `https://x.com/i/api/graphql/LOLkOnxrvpJzJwyZ7748Bw/ExplorePage?variables={"cursor":""}` — Explore page GraphQL API

## Structural Evidence

### Approach: DOM extraction via `page.evaluate()`

The simplest and most reliable approach is DOM extraction after navigating to the trending page.

**Key selectors:**
- Each trend item: `[data-testid="trend"]`
- Trend name: second `.css-146c3p1.r-bcqeeo.r-1ttztb7.r-qvutc0.r-37j5jr` span (or `[dir="ltr"] > span`) within the trend element
- Domain context (category + region): first `.css-146c3p1.r-bcqeeo.r-1ttztb7.r-qvutc0.r-37j5jr` span (typically contains "·" separator)
- Search URL: extracted from `trend_url.url` pattern, or constructed from `name`

**Extraction logic (verified via eval):**
```js
document.querySelectorAll('[data-testid="trend"]').forEach(el => {
  const spans = el.querySelectorAll('span');
  // spans[1] or similar contains the metadata line: "1 · Food · Trending"
  // spans[last] contains the trend name
})
```

**Actual extracted data sample (from eval):**
```
rank: "1", domain_context: "Food · Trending", name: "スムージー"
rank: "2", domain_context: "Technology · Trending", name: "#realmeP4R"
rank: "4", domain_context: "Trending worldwide", name: "#BTS_WORLDTOUR_BANGKOK"
```

### Approach: GraphQL API interception

The `GenericTimelineById` API provides structured JSON with rich metadata:
- Each trend in `data.timeline.timeline.instructions[].entries[]`
- Entry type: `TimelineTimelineItem` with `itemContent.__typename: "TimelineTrend"`
- Fields: `name`, `rank`, `trend_metadata.domain_context`, `trend_metadata.meta_description`, `trend_url.url`, `is_promoted`

**API response trend entry structure:**
```json
{
  "entryId": "trend-Belfast",
  "itemContent": {
    "__typename": "TimelineTrend",
    "itemType": "TimelineTrend",
    "name": "Belfast",
    "rank": "1",
    "trend_metadata": {
      "domain_context": "Trending in United States",
      "meta_description": "...",
      "url": {"url": "twitter://search/?query=Belfast...", "urlType": "DeepLink"}
    },
    "trend_url": {"url": "twitter://search/?query=Belfast..."}
  }
}
```

**Timeline IDs discovered:**
- Trending: `VGltZWxpbmU6DAC2CwABAAAACHRyZW5kaW5nAAA=`
- News, Sports, Entertainment (also available in ExplorePage response)

### Decision: DOM extraction approach

DOM extraction is chosen over API interception because:
1. No need to reverse-engineer the features parameter (long, may change)
2. Selector `[data-testid="trend"]` is stable (used across X's React SPA)
3. Simpler code, fewer dependencies on internal API stability
4. `domain_context` text contains the region info needed for optional filtering

## Failure Signals

- **Login wall**: If user is not logged into X.com in Chrome, the page redirects to login. Error: `AUTH_REQUIRED`.
- **Empty result**: If the trending page loads but no `[data-testid="trend"]` elements found, error: `EMPTY_RESULT`. Could indicate region has no trends or page changed.
- **Structure drift**: If `data-testid="trend"` is removed or renamed in X's UI update, error: `DRIFT_DETECTED`.
- **Rate limiting**: Rapid repeated calls could trigger X's rate limiting. The command should not be called in tight loops.
- **Region limitation**: X determines trending region from IP and account settings server-side. There is no parameter to request a specific region's trending — only client-side filtering by `domain_context` is possible.
- **Anti-automation**: X is known to detect automation. Using the real browser session helps but doesn't fully eliminate risk.

## Capture Assessment

This command should be captured because:
1. The path is verified: DOM extraction from `x.com/explore/tabs/trending` works reliably with the logged-in browser session
2. `[data-testid="trend"]` is a stable selector used by X's React components
3. The approach matches existing commands like `jike/get-hot` and `juejin/get-hot` (browser-based DOM extraction)
4. Provides unique value as the first X/Twitter command in the library, covering a P0 priority platform from the roadmap
5. The `domain_context` field enables client-side region filtering (US, worldwide) without requiring server-side region switching
