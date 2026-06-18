# Context

## Purpose

This command fetches the current Bilibili hot search list through a public HTTP API and returns trending entries with ranking and metadata.

## Verified Endpoint

- **URL**: `https://s.search.bilibili.com/main/hotword`
- **Method**: HTTP GET
- **Response format**: JSON

## Key Response Fields

- `list` (array): hot search entries
- `list[].keyword` (string): raw keyword
- `list[].show_name` (string): display label, fallback to `keyword`
- `list[].heat_score` (number): heat value
- `list[].heat_layer` (string): heat tier
- `list[].word_type` (number): category identifier
- `list[].icon` (string): icon URL

## Runtime & Auth

- Runtime: `node`
- Authentication: not required

## Common Failure Signals

- Non-2xx HTTP status
- `code !== 0` in API response
- Missing or empty `list`

## Maintenance Notes

- If the endpoint returns an error or empty list, verify the URL and response fields against the live API before changing the parsing logic.
- When adding parameters, declare them in `manifest.json` and read them explicitly as strings before converting to other types.
- Keep error handling consistent with the documented error codes in `README.md`.
