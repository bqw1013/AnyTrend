# Maintenance Notes

## Endpoint

`https://api.github.com/search/repositories`

## Query Construction

The command builds a search query from the provided parameters:

- `period` maps to a recent push date offset:
  - `daily` → last 1 day
  - `weekly` → last 7 days
  - `monthly` → last 30 days
- `language` adds a `language:{value}` qualifier when provided
- `stars:>10` is always included as a baseline popularity filter

The query is sent with `sort=stars&order=desc&per_page={limit}`.

## Parameters

- `period`: optional, default `weekly`, must be one of `daily`, `weekly`, `monthly`
- `language`: optional, no default
- `limit`: optional, default `10`, integer between 1 and 50

## Rate Limits

The GitHub Search API enforces a rate limit of 10 requests per minute for unauthenticated requests. HTTP 403 or 429 responses indicate rate limiting.

## Failure Signals

- HTTP 403/429: rate limit exceeded
- HTTP 422: query rejected by the API
- Missing or empty `items` array: no matching repositories
- Non-JSON or unexpected response structure: possible API drift

## Recovery Hints

- If the Search API behavior changes, verify the query qualifier syntax and response field names against the current GitHub REST API documentation.
- If rate limits become an issue, consider adding optional authentication support.
