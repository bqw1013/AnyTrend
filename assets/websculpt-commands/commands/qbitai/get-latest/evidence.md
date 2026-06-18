# Evidence: qbitai/get-latest

This document records the research and validation evidence for the `qbitai/get-latest` command.

## Exploration Path

1. Checked the local command library — no existing qbitai command found.
2. Consulted the browser automation guide before exploration.
3. Attached to a local Chrome CDP session and opened `https://www.qbitai.com/` in a new tab.
4. Probed DOM structure with `eval` to locate article containers and fields.
5. Verified `/hot` page does not exist (returns 404).
6. Checked for embedded API data (`window.__INITIAL_STATE__`) — none found.
7. Checked for pagination / "load more" — none found; homepage contains ~20 articles statically.

## Verified URLs

- `https://www.qbitai.com/` — Qbitai homepage. Source of the latest article list. DOM structure verified stable; successfully extracted 20 articles with complete fields.
- `https://www.qbitai.com/hot` — Hot ranking page. Returns 404, confirming no dedicated hot list exists.

## Structural Evidence

### Article List (`div.text_box`)
Each article card is wrapped in `div.text_box`. The verified structure:

```html
<div class="text_box">
  <h4><a href="https://www.qbitai.com/2026/06/433798.html" target="_blank">Title</a></h4>
  <p></p><p>Summary text</p><p></p>
  <div class="info">
    <span class="author"><a href="/?author=19">Author Name</a></span>
    <span class="time">2小时前 </span>
    <div class="tags_s">
      <a href="https://www.qbitai.com/tag/gpu" rel="tag">GPU</a>
      <a href="https://www.qbitai.com/tag/..." rel="tag">Tag2</a>
    </div>
  </div>
</div>
```

Field mapping:
- `title`: `div.text_box h4 a` innerText
- `url`: `div.text_box h4 a` href
- `summary`: first non-empty `div.text_box p` innerText (may be empty)
- `author`: `div.text_box .info .author a` innerText
- `authorUrl`: `div.text_box .info .author a` href
- `time`: `div.text_box .info .time` innerText (e.g., "2小时前", "昨天 15:11")
- `tags`: `div.text_box .info .tags_s a` array of `{name, url}`

### Featured Carousel (`.swiper-slide`)
Top featured articles are in `.swiper-slide` containers:
- `title`: `a[title]` attribute or `a.innerText`
- `url`: `a.href`
- `coverImage`: `img.src`

There are typically 4 unique featured articles (6 slides including duplicates for loop animation).

### Count
Homepage consistently returns ~20 `div.text_box` articles. No pagination or "load more" mechanism.

## Failure Signals

- **Structure drift**: If `document.querySelectorAll('.text_box')` returns empty or `h4 a` is missing, the page layout may have changed. Throw `DRIFT_DETECTED`.
- **Empty result**: If no articles are found after successful page load, throw `EMPTY_RESULT`.
- **Page load failure**: If `page.goto()` times out or `page.waitForSelector('.text_box')` fails, the site may be down or blocking. Runner will surface `BROWSER_ATTACH_REQUIRED` or timeout errors.
- **No anti-crawl observed**: No CAPTCHA, 403, or 429 encountered during exploration. The site appears to serve content without aggressive bot detection.

## Capture Assessment

This path should be captured because:
1. Qbitai is a major Chinese AI media outlet with no equivalent command in the library.
2. The DOM structure is stable, server-rendered, and cleanly extractable.
3. There is no dedicated hot/ranking page; the homepage chronological list is the primary signal.
4. The path is fully parameterized (limit, includeFeatured) and reproducible.
