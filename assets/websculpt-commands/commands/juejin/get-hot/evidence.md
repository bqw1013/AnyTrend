# Evidence: juejin/get-hot

This document records the research and validation evidence for the `juejin/get-hot` command.

## Exploration Path

- Checked command library via `websculpt command list`. No existing command covers juejin.cn hot articles.
- Attempted `WebFetch` on `https://juejin.cn/hot/articles` — page is JS-rendered, returned empty content.
- Used `WebSearch` to discover the juejin recommend API endpoint.
- Validated the API via `curl` POST request to `https://api.juejin.cn/recommend_api/v1/article/recommend_all_feed`.
- Consulted reference: `https://github.com/chenzijia12300/juejin-api` for API documentation.
- Node runtime contract: `skills/websculpt-capture/references/node-contract.md` was read before implementation.

## Verified URLs

- https://api.juejin.cn/recommend_api/v1/article/recommend_all_feed (POST) — verified, returns hot article data
- https://juejin.cn/hot/articles — visited but JS-rendered, no usable static content
- https://github.com/chenzijia12300/juejin-api — API reference collection

## Structural Evidence

### API Endpoint
- Method: POST
- URL: `https://api.juejin.cn/recommend_api/v1/article/recommend_all_feed`
- Content-Type: `application/json`

### Request Body
```json
{
  "id_type": 2,
  "client_type": 2608,
  "sort_type": 3,
  "cursor": "0",
  "limit": 20
}
```
- `id_type`: 2 = article type
- `client_type`: 2608 = Web client
- `sort_type`: 3 = hot rank, 200 = comprehensive/recommended
- `cursor`: pagination cursor, "0" for first page
- `limit`: number of results

### Required Headers
- `Content-Type: application/json`
- `X-Agent: Juejin/Web`

### Response Structure (verified fields)
```json
{
  "err_no": 0,
  "err_msg": "success",
  "data": [
    {
      "item_type": 2,
      "item_info": {
        "article_info": {
          "article_id": "...",
          "title": "...",
          "brief_content": "...",
          "cover_image": "...",
          "view_count": 3998,
          "collect_count": 77,
          "digg_count": 52,
          "comment_count": 7,
          "hot_index": 258,
          "read_time": "14分钟"
        },
        "author_user_info": {
          "user_name": "...",
          "job_title": "..."
        },
        "tags": [
          { "tag_name": "AI编程" }
        ]
      }
    }
  ]
}
```
- Filter: only items with `item_type === 2` are articles (type 14 = ads)
- `err_no === 0` indicates success

## Failure Signals

- API returns `err_no !== 0` with `err_msg` on failure
- Empty `data` array when no articles match
- Missing `X-Agent` header may return unrelated data
- API structure changes: if `item_info.article_info` path changes, DRIFT_DETECTED
- Network errors: standard fetch failures (timeout, connection refused)

## Capture Assessment

This command should be captured because:
1. The API endpoint is stable, public, and requires no authentication
2. The request/response structure is well-defined and verified
3. The command fills a gap in the library (no juejin coverage exists)
4. Reuse value is high — juejin hot list is a frequently checked resource
5. The implementation is simple (single POST request, JSON parsing)
