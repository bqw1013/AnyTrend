# Evidence: medium/get-tag-trending

This document records the research and validation evidence for the `medium/get-tag-trending` command.

## Exploration Path

- Confirmed no existing Medium tag-related command in the library.
- Navigated to `https://medium.com/tag/artificial-intelligence` using a browser automation tool.
- Discovered two data sources in Apollo state:
  1. `recommendedPostsFeed` (primary, 15 articles) — has full engagement data
  2. `seoMetaTags.jsonLd` (fallback, 20 articles) — SEO-only, no engagement metrics
- Verified that JSON-LD identifier !== Apollo Post.id — they are different article sets.

## Verified URLs

- `https://medium.com/tag/artificial-intelligence` — **Primary data source**: AI tag page with verified tag metadata and feed data

## Structural Evidence

### Primary: Apollo recommendedPostsFeed

Path: `window.__APOLLO_STATE__.ROOT_QUERY["tagFromSlug(...)"].viewerEdge -> recommendedPostsFeed:(limit:15)`

Returns a `TagFeedResult` with `items` array of `TagFeedItem` objects:

```json
{
  "__typename": "TagFeedResult",
  "items": [
    {
      "__typename": "TagFeedItem",
      "feedId": "39ad25a6-4e2e-4439-9e15-758758e924fd",
      "reason": 107,
      "post": { "__ref": "Post:e0172b6ac3b8" }
    }
  ]
}
```

Each `Post` object resolved from the `__ref` provides:
- `id` (string, e.g. "e0172b6ac3b8")
- `title` (string)
- `mediumUrl` (string, full article URL)
- `clapCount` (number, verified: 617)
- `readingTime` (float minutes, verified: 9.666 — round to integer, minimum 1)
- `postResponses.count` (number, verified: 20)
- `tags` (array of `Tag:{slug}` __ref references, must resolve via state, verified 5 tags)
- `creator` (__ref to User, resolves to: id, name, username)
- `previewImage` (object with `id` string — construct URL: `https://miro.medium.com/v2/{id}`)
- `extendedPreviewContent.subtitle` (string, article description)
- `firstPublishedAt` (timestamp in ms — convert to ISO string)
- `isLocked` (boolean)
- `isPublished` (boolean)
- `visibility` (string)

**Feed size**: 15 items only. The `recommendedPostsFeed` is user-personalized and may vary by session.

### Fallback: JSON-LD Structured Data

Path: `window.__APOLLO_STATE__[tagRef].seoMetaTags.jsonLd` (parsed)

```json
{
  "@type": "CollectionPage",
  "name": "The most insightful stories about Artificial Intelligence - Medium",
  "mainEntity": [
    {
      "@type": "SocialMediaPosting",
      "headline": "Article title",
      "identifier": "ec581abbdfce",
      "author": {
        "@type": "Person",
        "name": "Author Name",
        "identifier": "username",
        "url": "https://medium.com/@username"
      },
      "datePublished": "2026-06-04T06:07:05Z",
      "description": "Article description/summary",
      "url": "https://medium.com/@username/article-slug-identifier",
      "image": ["https://miro.medium.com/0*imageId.png"],
      "isAccessibleForFree": true
    }
  ]
}
```

JSON-LD provides 20 articles with: headline, author (name/username/url), datePublished, description, url, image, isAccessibleForFree.

**Critical finding**: JSON-LD `identifier` values do NOT match Apollo `Post.id` values. The JSON-LD articles are a curated "most insightful" list, while Apollo Post objects correspond to the user-personalized recommendation feed. Cross-referencing by identifier is NOT viable.

**Image quality issue**: Some articles have `image: ["https://miro.medium.com/"]` (bare domain, no path). Filter out paths that are just `/`.

### Tag Metadata

Tag object fields:
- `id` — slug (e.g., "artificial-intelligence")
- `displayTitle` — human-readable name (e.g., "Artificial Intelligence")
- `postCount` — total posts under this tag (e.g., 471553)

## Failure Signals

- **MISSING_PARAM**: `tag` parameter is empty or missing.
- **TAG_NOT_FOUND**: Tag slug does not exist on Medium (404 or no tagFromSlug in state).
- **JSON_LD_NOT_FOUND**: seoMetaTags.jsonLd missing — affects fallback path only.
- **JSON_LD_PARSE_FAILED**: Corrupted or malformed JSON-LD string — affects fallback path only.
- **NO_ARTICLES_IN_JSON_LD**: JSON-LD parsed but mainEntity is empty — affects fallback path only.
- **PAGE_LOAD_FAILED**: Apollo state did not hydrate within timeout — page load issue.
- **EMPTY_RESULT**: No valid articles extracted after all processing.

## Capture Assessment

This command uses Apollo `recommendedPostsFeed` as the primary data source (15 articles with full engagement data: clapCount, responseCount, readingTime, tags, previewImage). Falls back to JSON-LD (20 articles without engagement metrics) if the feed is unavailable. The dual-source approach provides resilience against partial structure changes.
