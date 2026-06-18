# Evidence: techcrunch/get-latest

This document records the research and validation evidence for the `techcrunch/get-latest` command.

## Exploration Path

- Explored TechCrunch homepage (`/`), Latest page (`/latest/`), RSS feed (`/feed/`), and WordPress REST API (`/wp-json/wp/v2/posts`) using browser automation and direct HTTP requests.

## Verified URLs

- `https://techcrunch.com/` — Homepage with hero articles, top headlines sidebar, and latest news section. Verified via browser (DOM snapshot + eval extraction).
- `https://techcrunch.com/latest/` — Pure reverse-chronological article listing. Verified via browser eval, successfully extracted 25 articles.
- `https://techcrunch.com/feed/` — RSS 2.0 XML feed. Verified via curl, returns hourly-updated feed with title, link, pubDate, dc:creator, category[], description.
- `https://techcrunch.com/wp-json/wp/v2/posts` — WordPress REST API v2. Verified via curl, returns JSON with id, date, title.rendered, excerpt.rendered, link, jetpack_featured_media_url.
- `https://techcrunch.com/wp-json/wp/v2/categories` — Category taxonomy endpoint. Verified via curl, returns 25 categories with id, name, slug.

## Structural Evidence

### Primary Data Source: WP REST API

Endpoint: `GET https://techcrunch.com/wp-json/wp/v2/posts`

Query parameters:
- `per_page` (int, default 10, max 100) — number of posts
- `page` (int, default 1) — page number for pagination
- `categories` (int) — filter by category ID
- `_fields` (string) — comma-separated field names to reduce response size

Response format (JSON array):
```json
[
  {
    "id": 3131988,
    "date": "2026-06-10T15:31:19",
    "date_gmt": "2026-06-10T22:31:19",
    "link": "https://techcrunch.com/2026/06/10/xai-fired-an-engineer-who-raised-alarms-about-grok-safety-new-lawsuit-claims/",
    "title": { "rendered": "xAI fired an engineer who raised alarms about Grok safety, new lawsuit claims" },
    "excerpt": { "rendered": "<p>A former xAI engineer is suing the company...</p>" },
    "jetpack_featured_media_url": "https://techcrunch.com/wp-content/uploads/2026/03/grok-getty.jpg?w=668"
  }
]
```

Key fields used:
- `id` — post ID
- `date` — publish date (site timezone)
- `link` — article URL
- `title.rendered` — article title (HTML-escaped)
- `excerpt.rendered` — excerpt (HTML)
- `jetpack_featured_media_url` — featured image URL

### Category Mapping (slug → ID)

Verified from `/wp-json/wp/v2/categories`:
```
artificial-intelligence: 577047203
startups: 20429
venture: 577030455
security: 21587494
apps: 577051039
climate: 576957003
biotech-health: 577030454
commerce: 577052802
cryptocurrency: 576601119
enterprise: 449557044
fintech: 577030453
fundraising: 577234943
gadgets: 577052803
gaming: 577052804
government-policy: 577065682
hardware: 449223024
media-entertainment: 577030456
privacy: 426637499
real-estate: 577303513
robotics: 577123751
social: 577055593
space: 174
transportation: 2401
```

### Fallback Data Source: RSS Feed

URL: `https://techcrunch.com/feed/`
Format: RSS 2.0 XML
Update frequency: hourly
Fields per item: title, link, pubDate, dc:creator, category[], description

### Author extraction

Author names are available via the WP REST API `_embed` parameter or by parsing the `dc:creator` field in RSS. For simplicity, the WP API `_embed` approach adds extra request weight. The author can be extracted from the RSS feed if needed, but is not included in the primary API response without `_embed`.

## Failure Signals

- **WP API rate limiting**: WordPress REST API may rate-limit excessive requests. Normal usage (1-2 requests per invocation) should not trigger this.
- **RSS feed drift**: The RSS feed structure follows the WordPress RSS 2.0 standard and is unlikely to change.
- **Category ID changes**: Category IDs could change if TechCrunch reorganizes their taxonomy. The command maps category slugs to IDs via a static lookup table; if new categories are added or IDs change, the mapping needs updating.
- **Empty results**: If a category has no recent posts, the API returns an empty array `[]` — this is normal and should not be treated as an error.
- **Network failures**: Standard HTTP failures (DNS, timeout, 5xx) should be caught and surfaced with appropriate error codes.

## Capture Assessment

This command should be captured. The exploration confirmed:

1. TechCrunch is a WordPress site with a stable, public WP REST API — no authentication, no browser, no anti-crawl barriers.
2. The RSS feed provides a reliable fallback.
3. The data structure is consistent and well-documented.
4. The command provides a reusable way to fetch recent TechCrunch articles.
5. The `node` runtime is appropriate — pure HTTP requests, no DOM interaction needed.
