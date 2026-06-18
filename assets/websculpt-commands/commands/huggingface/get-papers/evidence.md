# Evidence: huggingface/get-papers

This document records the research and validation evidence for the `huggingface/get-papers` command.

## Exploration Path

- Checked `websculpt command list`: existing `huggingface/get-trending` only covers Models/Datasets/Spaces. No command covers Hugging Face Papers.
- Read `playwright-cli-guide.md` before browser automation.
- Used `curl` to `https://paperswithcode.com` — static fetch blocked (302/timeout).
- Switched to browser automation via `playwright-cli`. Confirmed `paperswithcode.com` redirects to `https://huggingface.co/papers/trending`.
- Captured snapshot of `huggingface.co/papers/trending` to verify page structure.

## Verified URLs

- `https://paperswithcode.com` → redirects to `https://huggingface.co/papers/trending`
- `https://huggingface.co/papers/trending` (Daily tab, default)
- `https://huggingface.co/papers` (alias for trending; always use this base URL)
- NOTE: `?period=weekly` and `?period=monthly` URL query params do NOT trigger tab switching. Must click the "Daily"/"Weekly"/"Monthly" buttons instead.

## Structural Evidence

Page URL: `https://huggingface.co/papers` (daily default). Period tabs switched via button click ("Daily"/"Weekly"/"Monthly"), NOT URL query params.

### Daily layout (full detail cards)
Each paper is an `<article>` with:
- Title: `h3 > a`
- Abstract: `article p`
- Authors: `article ul > li`
- Publication date: "Published on Mon DD, YYYY" text
- Upvote count: "Upvote N" text pattern
- GitHub link: `a[href*="github.com"]` with star count
- arXiv link: `a[href*="arxiv.org"]`

### Weekly/Monthly layout (compact cards)
Same `<article>` wrapper but different internal structure:
- Title: `h3 > a` (same as daily)
- Abstract: NOT rendered (no `<p>` element)
- Authors: `<a>` link to org/user page (pill/badge style, e.g., `<a href="/Berkeley">UC Berkeley</a>`)
- Upvote count: `<label> div.leading-none` (e.g., `<div class="leading-none">321</div>`)
- Published date: NOT rendered
- GitHub/arXiv links: NOT rendered
- Submitted by badge: `div.shadow-xs` showing submitter username

## Failure Signals

- `DRIFT_DETECTED`: If `article` selector returns empty or title/abstract fields missing.
- `EMPTY_RESULT`: If no papers found after page load.
- `COMMAND_TIMEOUT`: Page load exceeds daemon timeout (use `domcontentloaded` + `waitForSelector`).
- No login wall or CAPTCHA observed. No auth required.

## Capture Assessment

Worth capturing. PapersWithCode (the original target) redirects to Hugging Face Papers, making this the canonical source for trending AI research papers. The page is public, stable, and provides structured data (title, abstract, authors, upvotes, GitHub stars, arXiv links). Time period filtering (Daily/Weekly/Monthly) adds useful parameterization. No existing command covers this data.
