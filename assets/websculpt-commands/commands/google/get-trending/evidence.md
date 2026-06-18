# Evidence: google/get-trending

This document records the research and validation evidence for the `google/get-trending` command.

## Exploration Path

- Checked the WebSculpt command library for existing `google` domain commands.
- Attempted a direct HTTP fetch of the trending page — blocked by network restrictions.
- Switched to browser automation to render the JavaScript-driven page.
- Navigated to Google Trends and tested multiple geo variants.
- Data was extracted successfully from the rendered DOM `<table>`; no private API reverse-engineering was needed.

## Verified URLs

- `https://trends.google.com/trending?geo=JP` — Japan daily trending (verified, 25 rows extracted)
- `https://trends.google.com/trending?geo=US` — United States daily trending (verified, 25 rows extracted)
- `https://trends.google.com/trending?geo=HK` — Hong Kong daily trending (verified, 25 rows extracted)

## Structural Evidence

### Page URL pattern

`https://trends.google.com/trending?geo={GEO}` where GEO is a 2-letter ISO country code.

### DOM structure

- A single `<table>` element contains all trending data.
- Row 0: header row
- Rows 2–26: data rows (25 trending items)
- Each data row has 7 `<td>` cells:
  - `td[0]`: checkbox for row selection
  - `td[1]`: trend title (first child element holds clean title text)
  - `td[2]`: search volume + percentage change
  - `td[3]`: time started + status
  - `td[4]`: trend breakdown / related topics (buttons with related search terms)
  - `td[5]`: action menu
  - `td[6]`: sparkline chart

### Data extraction selectors (verified)

- Table: `document.querySelector('table')`
- Data rows: `table.querySelectorAll('tr')` → skip first 2 rows (header + empty)
- Title: `tds[1].firstElementChild?.textContent.trim()` or fallback `tds[1].textContent.trim()`
- Volume: regex match `/^([\d,]+[万+]?)/` on `tds[2].textContent`
- Change %: regex match `/([\d,]+%)/` on `tds[2].textContent`
- Time ago: regex match on `tds[3].textContent` for region-specific relative time strings
- Status (isActive): check if `tds[3].textContent` contains an active indicator
- Related topics: `tds[4].querySelectorAll('button')` → filter out generic "more" labels

### Page behavior

- Requires JavaScript rendering — static fetch returns empty page.
- No login required.
- Geo auto-detected from IP if not specified in URL.
- reCAPTCHA Enterprise loaded but not triggered during normal access.
- Page renders within a few seconds on a typical connection.

## Failure Signals

- **Empty table/0 rows**: Page structure changed — selector no longer matches. Throw `DRIFT_DETECTED`.
- **CAPTCHA triggered**: If reCAPTCHA challenge appears, page content blocked. Throw `ANTI_CRAWL_DETECTED`.
- **Page redirects to consent/region-select**: Geo code invalid or unrecognized. Throw `INVALID_GEO`.
- **Network timeout**: Connection issues or Google blocked in region. Throw `NETWORK_TIMEOUT`.

## Capture Assessment

This command should be captured. The extraction path is stable across multiple geo regions, uses simple DOM selectors, requires no authentication, and provides unique value (Google search trends) not covered by any existing command.
