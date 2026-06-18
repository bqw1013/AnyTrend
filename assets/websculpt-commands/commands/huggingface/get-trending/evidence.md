# Evidence: huggingface/get-trending

This document records the research and validation evidence for the `huggingface/get-trending` command.

## Exploration Path

- Checked command library (`websculpt command list` and `websculpt command list --all`): no existing Hugging Face trending command.
- Read `playwright-cli-guide.md` before browser automation.
- Used `playwright-cli` for browser automation and navigated to huggingface.co.
- Inspected homepage: no standalone "Trending" navigation link.
- Navigated to `/models`, found default sort is "Sort: Trending".
- Clicked sort dropdown on Models page: options are Trending, Most likes, Most downloads, Recently created, Recently updated, Most parameters, Least parameters.
- Selected "Most likes" to verify URL parameter mechanism: URL changed to `/models?sort=likes`.
- Navigated to `/datasets`: default sort is also "Sort: Trending".
- Navigated to `/spaces`: default sort is "Sort: Relevance", but dropdown contains "Trending".
- Verified `https://huggingface.co/spaces?sort=trending` loads correctly and shows "Sort: Trending".

## Verified URLs

- https://huggingface.co/models (default Trending)
- https://huggingface.co/models?sort=likes (verified parameter mechanism)
- https://huggingface.co/datasets (default Trending)
- https://huggingface.co/spaces (default Relevance)
- https://huggingface.co/spaces?sort=trending (verified Trending parameter)

## Structural Evidence

- Each listing page renders a grid/list of `<article>` elements.
- Each article contains:
  - Heading with model/dataset/space name (e.g., `<h4>` inside a link)
  - Link to detail page (`/user/repo`)
  - Type tag (e.g., "Text Generation", "Image-Text-to-Text")
  - Parameter size badge (optional, e.g., "4B", "8B")
  - Update time (e.g., "Updated 7 days ago")
  - Download count (numeric with icon)
  - Like count (numeric with icon)
- Sort is controlled by URL query parameter `sort`:
  - `trending` — default for Models/Datasets, explicit for Spaces
  - `likes` — most likes
  - `downloads` — most downloads
  - `created` — recently created
  - `modified` — recently updated
  - `params` — most parameters (Models only)
  - `params_asc` — least parameters (Models only)
- Data is rendered server-side or hydrated; no login required.

## Failure Signals

- Page structure change causing selector mismatch → `DRIFT_DETECTED`
- Network timeout during page load → `COMMAND_TIMEOUT` (handled by runner)
- Empty result list after loading → `EMPTY_RESULT`
- Invalid `type` parameter → throw `INVALID_PARAM`
- Invalid `sort` parameter → page may still load with default sort; command should validate allowed values

## Capture Assessment

This command should be captured. The Hugging Face Models/Datasets/Spaces trending pages are publicly accessible, stable, and provide structured metadata (name, type, params, downloads, likes, updated time). The sort parameter mechanism is URL-based and reliable. No authentication required.
