# Context

## Command Purpose

Fetch trending articles for a Medium tag from the public tag page. The command is useful for tracking topic popularity and collecting structured article metadata without an API key.

## Page Structure

- **URL pattern**: `https://medium.com/tag/<tag-slug>`
- **Primary data source**: Apollo state path `ROOT_QUERY["tagFromSlug(...)"].viewerEdge.recommendedPostsFeed:(limit:15)` — up to 15 articles with engagement metrics.
- **Fallback data source**: Apollo state path `[tagRef].seoMetaTags.jsonLd` — up to 20 articles without engagement metrics.
- **Tag metadata**: Apollo `Tag:<slug>` object provides `id`, `displayTitle`, and `postCount`.

## Runtime Notes

- Requires a browser runtime with CDP remote debugging enabled.
- Works without authentication, but results may differ for logged-in sessions because the feed is personalized.
- Medium may rate-limit excessive tag-page access. Keep call frequency moderate and avoid rapid repeated calls.

## Failure Signals

- **Tag not found**: `tagFromSlug` is missing from `ROOT_QUERY`.
- **Primary feed missing/empty**: Falls back to JSON-LD. Engagement fields become zero or empty in fallback mode.
- **JSON-LD missing**: Command fails if neither source returns data.
- **Page load timeout**: Apollo state did not hydrate within the configured timeout.

## Maintenance Notes

- Verify the Apollo `recommendedPostsFeed` key format if feed resolution fails.
- Verify Apollo `Post` field names if article metadata becomes empty or malformed.
- Tag slugs use lowercase hyphenated form.
