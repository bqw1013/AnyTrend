# toutiao/get-hot

Fetch trending content from a Toutiao channel.

## Overview

Supports two data sources:
- **热点 (hot) channel**: calls the hot-board API and returns ranked hot-list data (with hot values and labels), approximately 50 items.
- **Other channels** (推荐/财经/科技/军事/体育 and 9 more): call the feed API and return article feeds with cursor pagination.

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `channel` | string | yes | — | Channel name: 热点, 推荐, 财经, 科技, 军事, 体育, 娱乐, 历史, 美食, 直播, 旅游, 国际, 视频, 北京 |
| `limit` | number | no | 20 | Maximum number of items to return |
| `cursor` | number | no | 0 | Pagination cursor (use `nextCursor` from the previous response), 0 = first page. Only effective for feed channels; ignored for 热点 |

## Usage

```bash
# Fetch hot-board ranking
websculpt toutiao get-hot --channel=热点

# Fetch finance channel, 30 items
websculpt toutiao get-hot --channel=财经 --limit=30

# Paginate: use the previous nextCursor
websculpt toutiao get-hot --channel=科技 --cursor=1780555754999
```

## Response Structure

```json
{
  "channel": "热点",
  "items": [
    {
      "rank": 1,
      "title": "菲律宾落选安理会非常任理事国",
      "hotValue": "17551975",
      "label": "hot",
      "url": "https://...",
      "clusterId": "7646455956210008073"
    }
  ],
  "count": 20,
  "hasMore": true,
  "nextCursor": 1780555096999
}
```

Hot-board specific fields: `rank`, `hotValue`, `label`, `clusterId`.
Feed specific fields: `abstract`, `source`, `commentCount`, `diggCount`, `readCount`, `shareCount`, `hasVideo`, `imageUrl`, `behotTime`, `publishTime`, etc.

## Error Codes

| Error Code | Description |
|------------|-------------|
| `INVALID_PARAM` | Channel parameter is not in the supported list |
| `EMPTY_RESULT` | Request succeeded but returned no content |
| `API_ERROR` | API returned a non-200 status |
| `DRIFT_DETECTED` | API response structure changed; maintenance required |
