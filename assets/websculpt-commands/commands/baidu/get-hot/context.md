# Context

## Purpose

This command fetches public Baidu hot-search board data via a JSON API. It supports multiple board types and returns ranked items with metadata.

## Data Source

- Public endpoint: `https://top.baidu.com/api/board?tab={tab}`
- Primary data path: `data.cards[0].content`
- No authentication required

## Supported Boards

| `tab` | Typical item count | Description |
|-------|-------------------|-------------|
| `realtime` | 50 | Real-time hot search ranking |
| `homepage` | 15 | Homepage hot search ranking |
| `novel` | 30 | Novel trending board |
| `movie` | 10 | Movie trending board |
| `teleplay` | 10 | TV drama trending board |

## Output Fields

| Field | Source | Note |
|-------|--------|------|
| `rank` | `index + 1` | 1-based display rank |
| `title` | `word` | Hot-search keyword/title |
| `heatIndex` | `hotScore` | Search heat index (string) |
| `description` | `desc` | Brief description |
| `tag` | `hotTag` | Mapped label for known tag codes |
| `tagImg` | `hotTagImg` | Tag image URL |
| `image` | `img` | Cover image URL |
| `url` | `url` / `rawUrl` / `appUrl` | Baidu search link |
| `trend` | `hotChange` | `same`, `up`, or `down` |

## Maintenance Notes

- Validate unknown `tab` values against the supported list before calling the API.
- If the API endpoint or response shape changes, inspect network traffic on `https://top.baidu.com/board` to locate the current data source.
- The fallback SSR HTML parse path is fragile and should only be used if the JSON API is discontinued.
