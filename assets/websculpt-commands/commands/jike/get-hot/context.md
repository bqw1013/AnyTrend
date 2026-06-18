# Maintenance Notes: jike/get-hot

## Overview

Browser-runtime command that fetches hot-ranked posts from a Jike topic/circle.

Jike does not expose a global hot-ranking page. Hot content is scoped to individual topics under the hot/selected tab. The command automates topic discovery via search, resolves a target topic, and extracts hot posts through the public web API.

## Verified URLs

- Topic hot tab: `https://web.okjike.com/topic/{topicId}/selected`
- Topic live tab: `https://web.okjike.com/topic/{topicId}/square`
- Search: `https://web.okjike.com/search?q={query}`
- Discovery: `https://web.okjike.com/explore`

## API Endpoints

Base: `https://api.ruguoapp.com/1.0/`

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/search/integrate` | POST | Search topics/users/posts |
| `/topics/getDetail` | GET | Topic metadata |
| `/topics/tabs/selected/feed` | POST | Hot-ranked posts for a topic |
| `/topics/tabs/square/feed` | POST | Chronological posts for a topic |

The web app is a React SPA. Data extraction is API-driven via `page.evaluate()` fetch calls that inherit the browser session cookies.

## Runtime Requirements

- Chrome/Edge with remote debugging enabled.
- Active, logged-in Jike session in the attached browser.
- Command does not close the injected `page`.

## Humanization

To reduce bot-like signals, the command performs moderate mouse movement and random pauses during navigation. A final 0–3 s wait is applied before returning.

## Failure Signals

| Code | Meaning |
|------|---------|
| `AUTH_REQUIRED` | Browser session lacks a valid Jike login token. |
| `NOT_FOUND` | No topic matches the keyword, or the supplied topic ID is invalid. |
| `EMPTY_RESULT` | Topic exists but returned no hot posts. |
| `NETWORK_ERROR` | API unreachable or returned a non-2xx status. |
| `DRIFT_DETECTED` | Expected API fields are missing or changed shape. |

## Repair Clues

1. If the API response shape changes, inspect network traffic while manually browsing `https://web.okjike.com/topic/{topicId}/selected`.
2. If search breaks, test `https://web.okjike.com/search?q={query}` and watch `/1.0/search/integrate`.
3. If the web API domain changes, update `API_BASE` in `command.js`.
4. If login requirements tighten, verify the browser has a fresh Jike session and that `JK_ACCESS_TOKEN` is present in `localStorage`.
5. Degraded fallback: if `selected/feed` is removed, `square/feed` returns chronological posts that can be sorted locally by engagement.
