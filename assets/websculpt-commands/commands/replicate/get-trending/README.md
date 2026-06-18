# replicate/get-trending

Fetch trending AI models from Replicate's Explore page.

## Description

Replicate is the world's largest AI model hosting and execution platform. Its `/explore` page serves as the de facto trending hub, organized into three complementary sections:

- **Featured models** — Curated trending and popular models selected by Replicate
- **Official models** — Trending models from verified publishers with predictable pricing
- **Latest models** — Newest model arrivals, useful for catching early signals

This command extracts structured model data from all three sections using browser automation. No authentication or API key is required.

## Parameters

| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| `sections` | No | `featured,latest` | Comma-separated section names to include |
| `limit` | No | `12` | Maximum models per section (range: 1–50) |

## Return Value

```json
{
  "sections": [
    {
      "name": "featured",
      "label": "Featured models",
      "models": [
        {
          "owner": "owner-name",
          "name": "model-name",
          "displayName": "Model display name",
          "description": "Short model description...",
          "runs": "1.2M runs",
          "isOfficial": true,
          "coverImage": "https://...",
          "url": "https://replicate.com/owner-name/model-name"
        }
      ]
    }
  ]
}
```

## Usage

```bash
# Get the default sections (featured and latest)
websculpt replicate get-trending

# Include all three sections
websculpt replicate get-trending --sections featured,official,latest

# Latest models only, up to 5 per section
websculpt replicate get-trending --sections latest --limit 5
```

## Common Error Codes

| Code | Description |
|------|-------------|
| `DRIFT_DETECTED` | Page structure has changed — expected headings not found |
| `EMPTY_RESULT` | No model cards found in any requested section |
| `PAGE_LOAD_TIMEOUT` | Page failed to load within timeout |
| `BROWSER_ATTACH_REQUIRED` | Browser is not connected — ensure Chrome remote debugging is enabled |
