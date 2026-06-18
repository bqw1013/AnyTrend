# huggingface/get-trending

Fetch the daily trending leaderboard from Hugging Face Hub for Models, Datasets, or Spaces.

## Description

This command retrieves trending items from Hugging Face Hub. It supports three content types (models, datasets, spaces) and multiple sort orders. Each result includes the item name, URL, type tag, parameter size, last update time, download count, and like count. No authentication is required.

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `type` | string | No | `models` | Content type: `models`, `datasets`, or `spaces` |
| `sort` | string | No | `trending` | Sort order: `trending`, `likes`, `downloads`, `created`, `modified`, `params_desc`, `params_asc` |
| `limit` | number | No | `20` | Maximum number of items to return |

## Return Value

```json
{
  "items": [
    {
      "rank": 1,
      "name": "nvidia/LocateAnything-3B",
      "url": "https://huggingface.co/nvidia/LocateAnything-3B",
      "type": "Image-Text-to-Text",
      "params": "4B",
      "updated": "Updated 7 days ago",
      "downloads": 78900,
      "likes": 1110
    }
  ],
  "count": 20
}
```

## Usage

```bash
# Default: top 20 trending models
websculpt huggingface get-trending

# Trending datasets
websculpt huggingface get-trending --type datasets

# Top 10 trending spaces
websculpt huggingface get-trending --type spaces --limit 10

# Most liked models
websculpt huggingface get-trending --sort likes

# Recently created datasets
websculpt huggingface get-trending --type datasets --sort created --limit 5
```

## Common Error Codes

| Code | Description |
|------|-------------|
| `INVALID_PARAM` | Invalid `type` or `sort` parameter value |
| `EMPTY_RESULT` | No items found on the page |
| `DRIFT_DETECTED` | Page structure changed and selectors no longer match |
| `COMMAND_TIMEOUT` | Page load timed out |
