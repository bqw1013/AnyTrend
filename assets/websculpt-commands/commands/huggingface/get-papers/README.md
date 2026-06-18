# huggingface/get-papers

Fetch trending AI research papers from Hugging Face Papers (PapersWithCode successor).

## Description

This command retrieves trending AI research papers from Hugging Face's Papers section. PapersWithCode redirects to this page, making it the canonical source for trending AI papers. Supports filtering by Daily, Weekly, or Monthly trending periods.

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `period` | string | No | `daily` | Time period: `daily`, `weekly`, or `monthly` |
| `limit` | number | No | `20` | Maximum papers to return |

## Return Value

```json
{
  "papers": [
    {
      "rank": 1,
      "title": "Paper Title",
      "url": "https://huggingface.co/papers/xxxx",
      "abstract": "Paper abstract...",
      "authors": ["Author Name"],
      "published": "Jun 1, 2026",
      "upvotes": 100,
      "github": { "url": "https://github.com/...", "stars": "10k" },
      "arxiv": "https://arxiv.org/abs/xxxx"
    }
  ],
  "count": 20,
  "period": "daily"
}
```

## Usage

```bash
# Daily trending papers (default)
websculpt huggingface get-papers

# Weekly trending papers
websculpt huggingface get-papers --period weekly

# Top 10 monthly trending papers
websculpt huggingface get-papers --period monthly --limit 10
```

## Common Error Codes

| Code | Description |
|------|-------------|
| `EMPTY_RESULT` | No papers found on the page |
| `DRIFT_DETECTED` | Page structure changed and selectors no longer match |
| `COMMAND_TIMEOUT` | Page load timed out |
