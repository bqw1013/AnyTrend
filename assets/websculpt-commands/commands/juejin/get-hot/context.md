# Context

## Precipitation Background

This command fetches the Juejin hot articles ranking. It exists to provide a reusable way to retrieve trending developer articles from juejin.cn.

## Value Assessment

- **Generality**: Covers the primary use case of fetching a ranked list of hot articles
- **Reuse frequency**: Juejin hot list is a frequently checked developer resource
- **Time saved**: Eliminates manual API discovery and response parsing

## Page Structure

### Primary API
- **Endpoint**: `POST https://api.juejin.cn/recommend_api/v1/article/recommend_all_feed`
- **Key request fields**: `id_type`, `client_type`, `sort_type`, `cursor`, `limit`
- **Key response path**: `data[] -> item_info.article_info`, `item_info.author_user_info`, `item_info.tags[]`
- **Filtering**: Valid articles have `item_type === 2`

## Environment Dependencies

- No login or authentication required
- No browser needed
- Public API over standard HTTPS

## Failure Signals

- API returns a non-zero `err_no`
- Empty `data` array
- Response structure changes
- HTTP errors from the upstream API

## Repair Clues

- Verify the endpoint and request body if errors occur
- Check whether response field paths have changed
- Confirm the public API remains accessible without authentication
