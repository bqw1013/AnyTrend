# Maintenance Notes

## Overview

This command fetches trending content from Toutiao channels using the browser runtime. It navigates to the platform entry point to establish the session context, then calls the platform's public content APIs from within the browser context.

## Data Sources

- Hot-board API for the 热点 (hot) channel: returns ranked hot list items.
- Feed API for all other supported channels: returns article feeds with cursor-based pagination.

## Channel Mapping

Channel names are mapped to internal IDs in `command.js` (`CHANNEL_MAP`). The mapping is static because the channel configuration is embedded in the platform's JavaScript bundles. If a channel stops working or a new channel needs to be added, verify the current IDs via the platform's network requests.

## Runtime Notes

- Browser runtime is required: the APIs rely on session cookies established after navigating to the entry page.
- No authentication is required for the supported public channels.
- Navigation uses `domcontentloaded` to avoid blocking on third-party trackers.

## Failure Signals

- `DRIFT_DETECTED`: API response no longer contains the expected `data` array or pagination fields.
- `EMPTY_RESULT`: API returns success but zero items.
- `API_ERROR`: API returns a non-2xx status.
- `INVALID_PARAM`: requested channel is not in the supported list.

## Repair Hints

- If the API endpoint or response shape changes, re-explore the platform's network requests from a browser session.
- If channel IDs change, update `CHANNEL_MAP` accordingly.
- If bot detection escalates, review the humanization helpers in `command.js` and adjust pause ranges or interaction patterns moderately.
