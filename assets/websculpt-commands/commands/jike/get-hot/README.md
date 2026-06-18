# jike/get-hot

Fetch hot-ranked posts from a Jike topic/circle.

## Description

Searches for topics on Jike by default, then returns hot-ranked posts from the topic's selected/hot tab. Posts are sorted by engagement — each result includes full content text, author profile, interaction counts (likes, comments, reposts, shares), and topic metadata.

Jike does not have a global hot-ranking page. Hot content is organized per topic/circle. This command automates the full flow: discover relevant topics → fetch hot posts → return structured results.

## Parameters

| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| `keyword` | no | `"AI"` | Search keyword for topic discovery. Ignored when `topic_id` is provided. |
| `topic_id` | no | — | Explicit topic/circle ID. Skips keyword search and fetches hot posts directly. |
| `limit` | no | `20` | Max number of hot posts to return. |

## Return Value

```json
{
  "topic": {
    "id": "string",
    "name": "string",
    "subscribers_count": 0,
    "pic_url": "string"
  },
  "items": [
    {
      "rank": 1,
      "id": "string",
      "content": "string",
      "like_count": 0,
      "comment_count": 0,
      "repost_count": 0,
      "share_count": 0,
      "created_at": "ISO date string",
      "user": {
        "screen_name": "string",
        "username": "string",
        "brief_intro": "string",
        "avatar_url": "string"
      },
      "topic": {
        "id": "string",
        "name": "string",
        "subscribers_count": 0,
        "pic_url": "string"
      },
      "pictures": ["url string"],
      "url": "string"
    }
  ],
  "count": 0
}
```

## Usage

```bash
# Get AI hot posts (default)
websculpt jike get-hot

# Search for a different topic
websculpt jike get-hot --keyword "product"

# Target a specific topic by ID
websculpt jike get-hot --topic_id TOPIC_ID_HERE

# Limit results
websculpt jike get-hot --limit 10
```

## Common Error Codes

| Code | Description |
|------|-------------|
| `AUTH_REQUIRED` | Browser session lacks valid Jike login cookies |
| `NOT_FOUND` | No topics match the keyword, or the topic ID is invalid |
| `EMPTY_RESULT` | Topic exists but has no hot posts |
| `NETWORK_ERROR` | API unreachable or returned non-200 status |
| `DRIFT_DETECTED` | API response structure changed unexpectedly |
| `COMMAND_TIMEOUT` | Execution exceeded 20-minute timeout |
