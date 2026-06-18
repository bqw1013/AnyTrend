# Evidence: baidu/get-hot

This document records the research and validation evidence for the `baidu/get-hot` command.

## Exploration Path

- Checked command library via `websculpt command list --all`. No existing `baidu` domain commands found.
- Explored `https://top.baidu.com/board` via curl and WebFetch. The page is server-side rendered Vue app with hashed CSS class names, making DOM parsing fragile.
- Discovered a public JSON API endpoint by probing `https://top.baidu.com/api/board?tab=realtime`. Returns structured hot list data without authentication.
- Verified multiple `tab` parameters via curl: `realtime` (50 items), `homepage` (15 items), `novel` (30 items), `movie` (10 items), `teleplay` (10 items).
- Read `skills/websculpt-capture/references/node-contract.md` before drafting implementation.

## Verified URLs

- `https://top.baidu.com/api/board?tab=realtime` — verified, returns 50 real-time hot search items
- `https://top.baidu.com/api/board?tab=homepage` — verified, returns 15 hot items + 3 category sub-lists
- `https://top.baidu.com/api/board?tab=novel` — verified, returns 30 novel hot items
- `https://top.baidu.com/api/board?tab=movie` — verified, returns 10 movie hot items
- `https://top.baidu.com/api/board?tab=teleplay` — verified, returns 10 TV drama hot items

## Structural Evidence

### API Endpoint
- Method: GET
- Base URL: `https://top.baidu.com/api/board?tab={tab}`
- No authentication headers required
- Response: JSON with `success: true` and `data.cards[]` array

### Response Structure
```json
{
  "success": true,
  "data": {
    "cards": [
      {
        "component": "hotList",
        "content": [
          {
            "word": "热搜词标题",
            "desc": "描述/摘要",
            "hotScore": "7808529",
            "hotTag": "1",
            "hotTagImg": "https://...png",
            "img": "https://...jpg",
            "index": 0,
            "url": "https://www.baidu.com/s?wd=...",
            "rawUrl": "https://www.baidu.com/s?wd=...",
            "appUrl": "https://www.baidu.com/s?wd=...",
            "hotChange": "same"
          }
        ]
      }
    ]
  }
}
```

### Field Mappings
| API Field | Mapping | Notes |
|-----------|---------|-------|
| `index` | `rank` | 0-based, add 1 for display rank |
| `word` | `title` | Hot search keyword/title |
| `hotScore` | `heatIndex` | Search heat index as string |
| `desc` | `description` | Brief description/summary |
| `hotTag` | `tag` | 0=none, 1=new, 3=hot; map to text labels |
| `hotTagImg` | `tagImg` | Tag image URL |
| `img` | `image` | Cover image URL |
| `url` | `url` | Baidu search link |
| `hotChange` | `trend` | same / up / down |

### Tab Parameters
| tab | Component | Item Count | Description |
|-----|-----------|------------|-------------|
| `realtime` | hotList | 50 | Real-time hot search ranking |
| `homepage` | hotList | 15 | Homepage hot search (also includes sub-lists) |
| `novel` | textImgListVerticalNormal | 30 | Novel trending list |
| `movie` | textImgListVerticalNormal | 10 | Movie trending list |
| `teleplay` | textImgListVerticalNormal | 10 | TV drama trending list |

## Failure Signals

- API returns non-JSON or `success: false` → transient server error, retry or report `API_ERROR`
- `data.cards` is empty or missing → possible API structure change, report `DRIFT_DETECTED`
- Network timeout → transient issue, report `NETWORK_ERROR`
- Unknown `tab` value → API still returns data but may be empty or fallback to default; validate tab against known values
- `hotTag` values other than 0/1/3 → new tag type introduced; gracefully handle as "unknown"

## Capture Assessment

This command should be captured. The public JSON API is stable, requires no authentication, and returns well-structured data. The `node` runtime with native `fetch` is sufficient. No browser automation needed. The path has been verified across all supported tab types.
