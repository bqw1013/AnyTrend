# Maintenance Notes

## Purpose

Browser-runtime command that fetches Substack trending content. It supports two modes:

- Global trending topics (`tab=explore`)
- Per-category author/publication leaderboards (`tab=<categoryId>`)

No login is required for the explored endpoints.

## Runtime

- `runtime`: `browser`
- `requiresBrowser`: `true`

The command relies on a browser session because the target site uses Cloudflare protection that blocks plain HTTP clients.

## Parameters

- `tab` — Optional. Defaults to `explore` for global trending topics. Use a numeric category identifier for a category leaderboard.
- `cursor` — Optional pagination cursor returned by a previous call.

## Implementation Notes

- The injected `page` object must not be closed by the command; the daemon manages its lifecycle.
- The command navigates to the explore API URL and reads the JSON body rendered by the browser.
- Anti-crawl strategy: use the browser's native request handling and cookie jar. Avoid direct HTTP clients and aggressive polling.
- Light human-like behavior is included (small random mouse moves, short pauses, smooth scroll, and a final random wait up to 3 seconds).

## Common Failure Codes

- `API_ERROR` — The response body could not be parsed as JSON.
- `DRIFT_DETECTED` — The expected item type is missing from the API response, which may indicate a structural change.
- `BROWSER_ATTACH_REQUIRED` — The daemon cannot attach to a browser.
- `EMPTY_RESULT` — The result list is empty, which can happen during low-activity periods.

## Maintenance Checklist

- If the output structure changes, verify the latest response shape in a browser session before updating selectors or field mappings.
- If requests start failing, confirm the browser session has a valid cookie context and is not blocked by a challenge page.
- When updating API paths, parameters, or return fields, keep the manifest, README, and this document in sync.
- Preserve the anti-crawl logic and human-like pauses when editing the command code.
