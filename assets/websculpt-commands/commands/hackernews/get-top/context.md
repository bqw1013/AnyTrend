# Context

## Background

This command fetches front-page stories from HackerNews using the public Algolia Search API. It avoids HTML scraping and browser automation by relying on the structured JSON endpoint.

## Endpoint

- **Primary URL**: `https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage={limit}`
- **Method**: HTTPS GET
- **Authentication**: Not required

## Response Structure

The API returns a JSON object with a top-level `hits` array. Each hit typically contains:

- `title` (string): Story title
- `url` (string | null): External article URL
- `points` (number): Upvote count
- `num_comments` (number): Comment count
- `author` (string): Submitter username
- `created_at` (string): ISO 8601 submission timestamp
- `objectID` (string) / `story_id` (number): HN story identifier

The HN discussion page can be constructed as:
`https://news.ycombinator.com/item?id={objectID}`

## Dependencies

- Runtime: `node`
- Modules: Node.js built-in `https` only
- Outbound HTTPS access to `hn.algolia.com`

## Failure Signals

- Missing or non-array `hits` → `DRIFT_DETECTED`
- Empty `hits` → returns `[]`
- HTTP 429 → `RATE_LIMITED`
- HTTP >= 400 (excluding 429) → `API_ERROR`
- Timeout or connection failure → `NETWORK_ERROR`
- Malformed JSON → `PARSE_ERROR`

## Maintenance Notes

- If the Algolia endpoint becomes unreliable, an alternative is the HackerNews Firebase REST API (`https://hacker-news.firebaseio.com/v0/topstories.json`), but it requires fetching one list plus N item requests.
- If field names change in the Algolia response, update the mapping in `command.js` and the drift checks accordingly.
- Keep result limits bounded (`limit` clamped to 30) to respect public-resource usage expectations.
