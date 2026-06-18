# Maintenance Notes

## Overview

This command fetches Medium Staff Picks by reading `window.__APOLLO_STATE__` from the public Staff Picks list page. It does not require authentication for the core dataset.

## Data Source

- **URL**: `https://medium.com/@MediumStaff/list/staff-picks-c7bc6e1ee00f`
- **Data source**: `window.__APOLLO_STATE__` (Apollo Client in-memory cache)
- **Key state path**: `ROOT_QUERY → catalogById → Catalog → itemsConnection → CatalogItemV2[] → Post`
- **GraphQL endpoint**: not called directly by this command

## Environment Notes

- **Browser**: Chrome/Edge with CDP remote debugging enabled
- **Login state**: Not required for public data; logged-in state may enrich the response
- **Stability**: Apollo state extraction is more stable than DOM scraping because it does not rely on obfuscated CSS class names
- **Anti-crawl**: Keep request frequency moderate. The command includes light human-like delays and small random mouse movements.

## Failure Signals

- `APOLLO_STATE_NOT_FOUND`: Apollo cache is missing; page architecture may have changed.
- `CATALOG_NOT_FOUND`: The staff picks catalog reference is missing; catalog ID or page structure may have drifted.
- `ITEMS_NOT_FOUND`: The items connection is missing; the list may not have loaded.
- `EMPTY_RESULT`: No valid Post items were extracted; possible structure drift.
- `PAGE_LOAD_FAILED`: Navigation or hydration timed out; possible network issue or blocking.

## Repair Clues

- Inspect `window.__APOLLO_STATE__.ROOT_QUERY` for the current `catalogById` key if the catalog reference changes.
- Inspect the Catalog object for the current items connection key pattern if `itemsConnection:(limit:20)` changes.
- As a fallback, navigate to `https://medium.com/` and look for the Staff Picks module in the homepage feed.
- Last-resort DOM fallback: articles are rendered in `div`s with obfuscated class names; look for `h2` title elements and nearby `a` tags for URLs.
- `previewImage` is an embedded object `{ __typename, id, focusPercentX, focusPercentY, alt }`, not a `__ref`. Build the URL as `https://miro.medium.com/v2/resize:fit:400/{id}`.
