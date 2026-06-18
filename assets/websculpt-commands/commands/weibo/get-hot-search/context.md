# Maintenance Notes

## Purpose

Fetch the current Weibo hot-search list from the public JSON endpoint and return a ranked array of topics.

## Verified Behavior

- Endpoint returns JSON with `ok: 1` and a `data.realtime` array.
- Each item normally contains `word`, `note`, `num`, `realpos`, `icon_desc`, `label_name`, and `word_scheme`.
- No authentication is required.

## Common Failure Signals

- `ok !== 1` in the response: service-side issue or temporary restriction.
- HTTP status >= 400: network block, endpoint change, or connectivity problem.
- Missing or empty `data.realtime`: response structure drift.
- Missing `num` on some items: expected for certain entry types; handled by returning `null`.

## Repair Notes

- If the command stops returning data, verify the endpoint and response shape with a direct HTTPS request.
- If field names change, inspect the raw JSON and remap the fields used for `title`, `heat`, `rank`, `tag`, and `url`.
- Persistent network failures may require checking outbound HTTPS access or switching to a different runtime after user confirmation.
