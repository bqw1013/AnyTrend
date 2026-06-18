# Context

## Purpose

This command retrieves trending papers from the public Hugging Face Papers page. It supports selecting a time period and limiting the number of returned items. No authentication is required.

## Inputs and Outputs

- `period`: optional time period (`daily`, `weekly`, `monthly`). Defaults to `daily` via the manifest.
- `limit`: optional maximum number of papers. Defaults to `20` via the manifest.
- Returns a JSON object with `papers`, `count`, and `period`.

## Runtime

Browser runtime. The command runs against a public web page and relies on DOM selectors. Keep `command.js` aligned with `manifest.json`: every `params.xxx` access must have a matching parameter declaration.

## Common Maintenance Items

- If the page layout changes, verify that the article cards and period tabs are still reachable with the current selectors.
- If extraction returns empty results on a normally populated page, check whether the tab switch still updates the DOM as expected.
- Keep error messages prefixed with `[CODE]` and set the matching `err.code`.
- Avoid adding third-party dependencies; only Node.js built-in modules are permitted.
