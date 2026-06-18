# Maintenance Notes: huggingface/get-trending

## Overview

Browser-runtime command that extracts trending leaderboards from Hugging Face Hub for Models, Datasets, or Spaces. Public pages, no authentication required.

## Verified Entry Points

- Models: `https://huggingface.co/models`
- Datasets: `https://huggingface.co/datasets`
- Spaces: `https://huggingface.co/spaces?sort=trending`

## Sort Parameter Mapping

| Command sort | URL parameter |
|--------------|---------------|
| `trending`   | `trending`    |
| `likes`      | `likes`       |
| `downloads`  | `downloads`   |
| `created`    | `created`     |
| `modified`   | `modified`    |
| `params_desc`| `most_params` |
| `params_asc` | `least_params`|

## Structural Assumptions

- Listing pages render items as `<article>` elements.
- Each article contains the item name, detail-page link, optional type tag, optional parameter-size badge, update time, download count, and like count.
- Spaces use a slightly different card layout; extraction branches on `contentType`.

## Human-like Behavior

The command performs small randomized mouse movements, short pauses, and a smooth scroll before data extraction, plus a final random wait, to mimic casual browsing on Hugging Face Hub.

## Failure Signals

- `INVALID_PARAM`: unsupported `type` or `sort` value.
- `EMPTY_RESULT`: no `<article>` elements found after loading.
- `DRIFT_DETECTED`: selectors no longer match the current page structure.
- `COMMAND_TIMEOUT`: page load timed out (handled by the runner).

## Repair Hints

- If extraction breaks, verify the `<article>` selector and child text nodes first.
- The sort URL parameters have been stable; validate them if the dropdown labels change.
- Keep anti-crawl logic in place when adjusting timing or scroll behavior.
