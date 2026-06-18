# Maintenance Notes

## Overview

This browser-runtime command retrieves hot topics from the Maimai community hot-rank page, or searches for hot posts by keyword when `query` is provided. It requires an authenticated Maimai session in the browser.

## Modes

### Hot-rank mode

- Navigates to `https://maimai.cn/community/hot-rank`.
- Extracts ranked topics from the server-rendered DOM.
- Selector: `main ul > li`.
- Each list item contains a `<button>` with up to three lines: rank number, topic title, and an optional tag.

### Search mode

- Calls `GET https://maimai.cn/search/feeds?query={q}&limit={n}&offset={o}&highlight=true&sortby=heat&jsononly=1`.
- Returns posts sorted by heat, including content, engagement counts, and author metadata.

## Auth & Runtime

- Requires a logged-in Maimai account; otherwise the command returns `AUTH_REQUIRED`.
- Runs inside the WebSculpt browser daemon, which attaches to the user's existing Chrome/Edge session via CDP.

## Anti-crawl Measures

- Random sleeps after navigation and before returning.
- Moderate mouse movements between actions.
- Final wait is randomized between 0 and 3 seconds.

## Failure Signals

- `AUTH_REQUIRED`: navigation redirects to a login page.
- `DRIFT_DETECTED`: the hot-rank selector matches no elements.
- `API_ERROR`: the search API returns a non-OK result or HTTP error.
- Empty feeds from the search API indicate no results for the keyword.

## Repair Clues

- If hot-rank extraction fails, inspect the DOM of `/community/hot-rank` for changes to `main > ul > li > button`.
- If search fails, verify the `/search/feeds` endpoint still returns JSON and that the session is valid.
- If requests start failing or returning empty, increase delays or add more human-like pauses.
