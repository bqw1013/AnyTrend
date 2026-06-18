# qbitai/get-latest

Fetch the latest AI article list from the Qbitai homepage (qbitai.com).

## Description

Qbitai does not provide a traditional hot-ranking page; all articles are listed in reverse chronological order on the homepage. This command extracts the homepage article list (about 20 articles), including title, link, summary, author, publish time, and tags. Optionally returns the top featured carousel editor picks.

## Parameters

- `limit`: number (optional, default 20) — Number of articles to return, maximum 20.
- `includeFeatured`: boolean (optional, default false) — Whether to also return the top featured carousel editor picks (usually 4 articles, with cover images).

## Return Value

```typescript
{
  articles: Array<{
    rank: number,
    title: string,
    url: string,
    summary: string,
    author: string,
    authorUrl: string,
    time: string,
    tags: Array<{ name: string, url: string }>
  }>,
  featured?: Array<{
    rank: number,
    title: string,
    url: string,
    coverImage: string
  }>
}
```

## Usage

```bash
websculpt qbitai get-latest
websculpt qbitai get-latest --limit 10
websculpt qbitai get-latest --includeFeatured true
websculpt qbitai get-latest --limit 5 --includeFeatured true
```

## Common Error Codes

- `DRIFT_DETECTED` — The page structure has changed and the article list cannot be located.
- `EMPTY_RESULT` — The page loaded successfully but no articles were found.
- `BROWSER_ATTACH_REQUIRED` — A browser environment is required. Open `chrome://inspect/#remote-debugging` in Chrome and allow remote debugging.
