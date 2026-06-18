# Maintenance Notes

## Page Structure

- **Primary URL**: `https://www.youtube.com/`
- **Primary data source**: `window.ytInitialData.contents.twoColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.richGridRenderer.contents[]`
- **Video item keys**:
  - `richItemRenderer.content.lockupViewModel` — newer format with `contentId`, `metadata.lockupMetadataViewModel`, `contentImage.thumbnailViewModel`
  - `richItemRenderer.content.videoRenderer` — legacy format with `videoId`, `title.runs`, `ownerText.runs`, `viewCountText.simpleText`, `publishedTimeText.simpleText`, `lengthText.simpleText`
- **DOM fallback**: `ytd-rich-item-renderer` elements; skip items containing `ytd-display-ad-renderer` or `ytd-ad-slot-renderer`
- **Tab navigation**: `[role="tab"]` buttons with text matching the requested tab label

## Environment Dependencies

- **Login state**: Not required for public homepage access.
- **Browser config**: Requires a Chromium-based browser with remote debugging enabled.
- **Anti-detection strategy**:
  - Use `domcontentloaded` instead of `load` for navigation to avoid ad/tracker timeouts.
  - Add small random mouse movements, short randomized pauses, and occasional smooth scrolling.
  - End each session with a short random wait before returning results.
- **Stability notes**: The `ytInitialData` structure changes periodically. The DOM fallback provides resilience against minor structural changes.

## Failure Signals

- `window.ytInitialData` is `undefined` → DOM fallback engaged
- `richGridRenderer.contents` is empty or missing → likely region restriction or unusual page state → throw `EMPTY_RESULT`
- `videoRenderer` / `lockupViewModel` count is zero after filtering → ads-only page or restricted content → throw `EMPTY_RESULT`
- Tab click has no effect → page structure changed; tabs may use different selectors

## Repair Clues

- If the `ytInitialData` path changes, inspect the object in the browser console and trace the new video data path.
- If DOM selectors break, use `ytd-rich-item-renderer` as the entry point and inspect child elements for updated selectors.
- Alternative stable path: an official data API with region-based trending support, which requires an API key.
