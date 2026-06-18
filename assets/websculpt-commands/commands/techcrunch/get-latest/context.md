# Context

## Precipitation Background

This command fetches recent TechCrunch articles through the public WordPress REST API. It provides a lightweight, no-authentication source for technology news.

## Value Assessment

- **Generality**: Useful for tracking general technology news, startup updates, and venture capital trends.
- **Reuse frequency**: High for users monitoring the technology landscape.
- **Time saved**: Eliminates manual browsing or RSS reader setup.

## Page Structure

### Primary: WordPress REST API

- **Endpoint**: `https://techcrunch.com/wp-json/wp/v2/posts`
- **Key params**: `categories` (int ID), `per_page` (1-100), `page`, `_fields` (field whitelist)
- **Response**: JSON array of post objects with `id`, `date`, `link`, `title.rendered`, `excerpt.rendered`, `jetpack_featured_media_url`
- **Categories endpoint**: `https://techcrunch.com/wp-json/wp/v2/categories` — maps slugs to IDs

### Fallback: RSS Feed

- **URL**: `https://techcrunch.com/feed/`
- **Format**: RSS 2.0 XML
- **Update frequency**: Hourly
- **Fields**: `title`, `link`, `pubDate`, `dc:creator`, `category[]`, `description`

## Environment Dependencies

- **No browser required**: Pure HTTP requests to public WordPress API.
- **No authentication**: WP REST API and RSS feed are publicly accessible.
- **Request cadence**: The command pauses briefly before the network request.

## Failure Signals

- **DRIFT_DETECTED**: API response is not an array — the endpoint structure may have changed.
- **API_ERROR**: Non-2xx response — could indicate rate limiting, server issues, or endpoint deprecation.
- **INVALID_CATEGORY**: Category slug not in the static mapping — update `CATEGORY_MAP` in `command.js` using data from `/wp-json/wp/v2/categories`.
- **PARSE_ERROR**: Response body is not valid JSON — possible CDN/WAF interference or API format change.

## Repair Clues

- If the WP REST API changes or becomes unavailable, fall back to the RSS feed (`https://techcrunch.com/feed/`) which follows the stable RSS 2.0 standard.
- If category IDs change, fetch the current mapping from `https://techcrunch.com/wp-json/wp/v2/categories` and update `CATEGORY_MAP`.
- The `_fields` parameter is a performance optimization. If specific fields disappear, remove them from `_fields` to get the full response and extract what is available.
