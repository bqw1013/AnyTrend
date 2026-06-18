# Context

Generic maintenance notes for the `x/get-trending` browser command.

## Purpose

Fetch trending topics from X (Twitter) Explore tabs. The command relies on a logged-in browser session and DOM extraction from the public Explore page.

## Implementation Notes

- **Runtime**: browser
- **Primary URL pattern**: `https://x.com/explore/tabs/{tab}`
- **Key selector**: `[data-testid="trend"]`
- **Extraction**: Color-based text classification inside each trend element (white text for name/description, gray text for rank and domain context)
- **Humanization**: Conservative mouse movement, short scroll, and random pauses are used before extraction to reduce automation signals. Keep interactions minimal because X has strong anti-bot defenses.

## Parameters

- `tab`: one of `trending`, `for-you`, `news`, `sports`, `entertainment`
- `region`: client-side substring filter on `domain_context`
- `limit`: max number of results to return

## Failure Signals

- Login wall detected → `AUTH_REQUIRED`
- No trend elements found → `EMPTY_RESULT` (may also indicate selector drift)
- Unexpected empty result after successful navigation → possible `DRIFT_DETECTED`

## Maintenance Tips

- If the DOM structure changes, inspect the trend card manually and update the color/style based extraction logic.
- Keep anti-bot behavior conservative; avoid rapid repeated calls.
- Region is determined server-side by X based on IP and account settings. Client-side `region` filtering is the only supported control.
