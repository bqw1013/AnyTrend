# Evidence: medium/get-staff-picks

This document records the research and validation evidence for the `medium/get-staff-picks` command.

## Exploration Path

- Executed `websculpt command list` — no Medium-related commands exist in the library.
- Consulted the browser automation guide for the CDP protocol.
- Attached to a local Chrome instance via CDP.
- Navigated to Medium homepage, Featured feed, Staff Picks page, and Tag page.
- Discovered `window.__APOLLO_STATE__` as the primary structured data source.
- Confirmed the Staff Picks catalog is reachable from the public list page.
- Explore assess passed: `medium/get-staff-picks` confirmed as candidate.

## Verified URLs

- `https://medium.com/` — Medium homepage, confirmed SPA with Apollo state
- `https://medium.com/?feed=featured` — Featured feed (empty without login)
- `https://medium.com/@MediumStaff/list/staff-picks-c7bc6e1ee00f` — **Primary data source**: Staff Picks curated list

## Structural Evidence

### Data Source

All article data is in `window.__APOLLO_STATE__`, Medium's Apollo Client in-memory cache. No API calls or DOM scraping needed.

### Data Model Chain

```
ROOT_QUERY["catalogById({\"catalogId\":\"c7bc6e1ee00f\"})"]
  → Catalog:c7bc6e1ee00f
    → itemsConnection:(limit:20)
      → items[] → CatalogItemV2:{\"catalogItemId\":\"...\"}
        → entity → Post:{id}
          → creator → User:{id}
          → tags[] → Tag:{slug}
          → previewImage → ImageMetadata:{imageId}
```

### Post Fields (verified via eval extraction)

| Field | Path | Type | Notes |
|-------|------|------|-------|
| title | `post.title` | string | Article title |
| subtitle | `post.extendedPreviewContent.subtitle` | string | Article subtitle/dek |
| url | `post.mediumUrl` | string | Full Medium article URL |
| clapCount | `post.clapCount` | number | Number of claps (likes) |
| responseCount | `post.postResponses.count` | number | Number of responses (comments) |
| readingTime | `post.readingTime` | number | Estimated reading time in minutes (float) |
| publishedAt | `post.firstPublishedAt` | number | Unix timestamp in milliseconds |
| tags | `post.tags[].__ref` | ref → Tag | Tag references |
| isLocked | `post.isLocked` | boolean | Whether article is member-only |
| uniqueSlug | `post.uniqueSlug` | string | URL-safe slug |

### User Fields

| Field | Path | Type |
|-------|------|------|
| name | `user.name` | string |
| username | `user.username` | string |

### Tag Fields

| Field | Path | Type |
|-------|------|------|
| id | `tag.id` | string (slug) |
| displayTitle | `tag.displayTitle` | string |

### CatalogItemV2 Fields

| Field | Path | Type |
|-------|------|------|
| annotation | `item.userAnnotation.annotation` | string (curator's note) |

### ImageMetadata Fields

The `previewImage` on a Post is an **embedded object** (NOT a `__ref`), with the following structure:
```json
{
  "__typename": "ImageMetadata",
  "id": "0*VJ6z1MmqfkStgung.jpeg",
  "focusPercentX": null,
  "focusPercentY": null,
  "alt": "image description"
}
```

There is NO `url` field on the ImageMetadata object. The URL must be constructed as: `https://miro.medium.com/v2/resize:fit:400/{imageId}`.

## Failure Signals

- **APOLLO_STATE_NOT_FOUND**: `window.__APOLLO_STATE__` is undefined — page failed to load or Medium changed their architecture.
- **CATALOG_NOT_FOUND**: The staff picks catalog reference is missing from ROOT_QUERY — Medium may have changed the catalog ID or page structure.
- **ITEMS_NOT_FOUND**: The items connection is missing — page may not have loaded fully.
- **EMPTY_RESULT**: No valid Post items extracted — possible structure drift.
- **PAGE_LOAD_FAILED**: `page.goto()` fails — network issue or Medium blocking the request.
- The Featured feed (`?feed=featured`) shows "No featured stories" when not logged in — Staff Picks does not have this issue.

## Capture Assessment

This command should be captured. The extraction path is stable:
1. Navigate to a public URL (no login required for core data).
2. Wait for Apollo state hydration.
3. Extract structured data following a deterministic reference chain.
4. Return typed, validated output.

The Apollo state approach is more reliable than DOM scraping because it provides structured data independent of CSS class names (which are obfuscated in Medium's React rendering).
