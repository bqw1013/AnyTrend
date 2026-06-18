# Context

## Precipitation Background

This command was created to provide programmatic access to Google Trends daily trending searches. Google Trends exposes the data through a JavaScript-rendered page rather than a simple public API, so a browser runtime command is used to extract the rendered table content.

## Value Assessment

- **Generality**: Works for any country/region supported by Google Trends.
- **Reuse frequency**: High — daily trending data is useful for content monitoring, market research, and trend analysis.
- **Time saved**: Eliminates manual browsing and copy-paste of trending items.
- **Complementarity**: Can be combined with other search-trend commands for broader coverage.

## Page Structure

- **Primary URL**: `https://trends.google.com/trending?geo={GEO}`
- **Key selector**: `table` → `tr` rows (skip first 2 header rows)
- **Data cells per row**: 7 `<td>` elements
  - Index 1: trend title (use `firstElementChild.textContent` for clean title)
  - Index 2: search volume + percentage change
  - Index 3: time ago + active/ended status
  - Index 4: related topic buttons
- **JS rendering required**: Static fetch returns an empty page

## Environment Dependencies

- Browser with remote debugging enabled
- WebSculpt daemon attached to the browser session
- No login, no API key, no cookies required

## Failure Signals

- **Selector returns null**: `table` not found or `<tr>` count < 3 → page structure changed, throw `DRIFT_DETECTED`
- **0 items extracted**: Page loaded but data rows empty → throw `EMPTY_RESULT`
- **CAPTCHA visible**: reCAPTCHA iframe in DOM → throw `ANTI_CRAWL_DETECTED`
- **Redirect to consent page**: URL changed to accounts.google.com → geo code invalid or region blocked

## Maintenance Notes

### Unsupported Geo Codes

Some region codes are rejected before navigation because the target page loads an empty table and times out, producing a confusing `DRIFT_DETECTED` error. Unsupported codes are handled with `INVALID_PARAM`.

### Client-Side Limit

The `--limit` parameter truncates results after extraction. The page renders all available items, so slicing the returned array keeps the implementation simple and consistent across regions.

### Humanization

The command includes light human-like behavior: small random mouse movements, smooth scrolling, and short random pauses. This helps the page behave naturally without significantly slowing execution.

## Repair Clues

- Verify that `https://trends.google.com/trending?geo=US` still loads a table with data rows.
- Inspect the table DOM if selectors fail; the provider may replace the table with custom elements.
- Backup data source: Google Trends provides an RSS feed at `https://trends.google.com/trends/trendingsearches/daily/rss?geo=US`.
