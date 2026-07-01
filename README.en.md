# AnyTrend

[中文](./README.md)

[![npm version](https://img.shields.io/npm/v/anytrend)](https://www.npmjs.com/package/anytrend)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node Version](https://img.shields.io/node/v/anytrend)](package.json)

> AnyTrend empowers your AI Agent to scan 25 Chinese and English platforms, automatically collecting, translating, filtering, and categorizing trending content, then generating a browsable global daily report site.

AnyTrend provides a set of CLI tools and an Agent Skill: the CLI handles data collection and site rendering, while the Skill drives the Agent through annotation, curation, and summarization. The data collection capability across 25 platforms is powered by [WebSculpt](https://github.com/bqw1013/WebSculpt).

Demo video: [TODO: video link]

---

## Prerequisites

| Requirement | Details |
|---|---|
| Node.js | >= 22 |
| Network access | Your local network must be able to reach all target platforms. Access to sites outside your region (YouTube, X, Reddit, etc.) must be resolved on your side — AnyTrend does not provide a proxy |
| Chrome browser | Enable remote debugging: open `chrome://inspect/#remote-debugging` in Chrome and check the box to allow remote debugging |
| Browser login state | Some platforms (Douyin, Xiaohongshu, Zhihu, X, Jike, Maimai, etc.) require being logged in within Chrome beforehand, otherwise collection will fail |
| AI Agent | Annotation, curation, and summarization stages are driven by a Skill executed by an Agent. An Agent environment with Skill support is required |

---

## Installation

```bash
# 1. Install WebSculpt runtime
npm install -g @playwright/cli@0.1.13 websculpt
websculpt skill install --lang zh

# 2. Install AnyTrend CLI
npm install -g anytrend

# 3. Import 27 built-in collection commands + generate config/site.yaml in the current directory
anytrend setup

# 4. Verify the environment is ready
anytrend doctor

# 5. Install the AnyTrend Skill so the Agent can automatically execute annotation, curation, and rendering
npx skills add bqw1013/AnyTrend --skill anytrend-daily-site --yes
```

---

## Usage

Open your Agent and say "Give me today's global trending report." The Agent will load the Skill and automatically complete the full pipeline: collection → annotation → aggregation → curation → rendering.

All outputs are under your current working directory:

- Collected data: `anytrend-data/daily/<DATE>/` (raw collection results, AI annotations, intermediate data)
- Report site: `anytrend-data/site/<DATE>/` — open `index.html` in a browser to browse

CLI commands can also be run individually; see [Command Overview](#command-overview).

---

## Configuration

`anytrend setup` generates `config/site.yaml` in the current directory. Modify the following sections as needed:

| Section | Controls |
|---|---|
| `translation` | Target translation language (default: Chinese) |
| `homepage` | Number of homepage recommendations (`recommendation_count`) and AI scoring criteria (`criteria`) |
| `categories` | 10 content categories and their definitions |
| `feeds` | Curated feed list; each feed defines selection criteria (`criteria`) and recommendation count (`recommendation_count`) |
| `pipeline` | Pipeline parameters |

### Customizing Selection Criteria

Modify `homepage.criteria` and `feeds[].criteria` to adjust the Agent's selection preferences. The 1–5 scoring system must be retained — the Agent relies on these scores for filtering and ranking.

### Adding a Feed

Follow the structure of the two existing feeds (`ai` and `politics-economy`) to add a new entry in the `feeds` array:

```yaml
- id: your-feed-id
  title: Your Feed Title
  recommendation_count: 10
  criteria: >-
    Describe the selection criteria for this feed, specifying what content corresponds to each score from 1 to 5.
```

### Pipeline Parameters

The annotation stage uses a multi-agent concurrency model: each Agent independently processes one data batch. After annotation, the code filters items by score into a candidate pool, from which the Agent then performs final curation. The following parameters control concurrency and candidate pool filtering:

| Parameter | Default | Description |
|---|---|---|
| `annotation.batch_size` | 50 | Number of items each Agent processes at once. Larger values reduce scheduling overhead but increase per-agent context length |
| `annotation.max_concurrency` | 10 | Maximum number of annotation Agents running concurrently |
| `annotation.model` | haiku | AI model used for annotation |
| `aggregation.candidate_ratio` | 0.2 | Fraction of items entering the candidate pool (top N%), i.e. the highest-scoring 20% of all items |
| `aggregation.max_candidates` | 50 | Hard cap on candidate pool size; the pool is truncated even if the ratio-based count exceeds this value |
| `aggregation.initial_score_threshold` | 4 | Minimum score (1–5 scale) to enter the candidate pool. If insufficient candidates qualify, the threshold auto-degrades (4→3→2→1) to fill the pool |

> The platform list, collection angles, and frontend templates are built into the code and cannot be modified via `site.yaml`.

---

## Command Overview

| Command | Purpose |
|---|---|
| `anytrend doctor` | Check Node.js, WebSculpt CLI, and command installation status |
| `anytrend setup` | Import WebSculpt commands + generate default config file |
| `anytrend build` | Full collection pipeline (Collect + Normalize + Merge) |
| `anytrend sources list` | List all collection sources |
| `anytrend daily-site aggregate` | Generate intermediate site data files |
| `anytrend daily-site render` | Render static HTML site |

> For step-by-step commands (`collect`, `normalize`, `normalize-batch`, `merge`), see [`docs/cli.md`](docs/cli.md).

---

## Platform Coverage

**25 platforms, 27 commands, 55 collection angles.** Some commands require a browser and login session.

| Category | Platform | Command | Browser | Login |
|---|---|---|---|---|
| Chinese General | Baidu Hot Search | `baidu get-hot` | — | — |
| | Bilibili | `bilibili get-hot` | — | — |
| | Douyin | `douyin get-hot` | ✅ | ✅ |
| | Toutiao | `toutiao get-hot` | ✅ | — |
| | Weibo Hot Search | `weibo get-hot-search` | — | — |
| | Xiaohongshu | `xiaohongshu get-feed` | ✅ | ✅ |
| | Zhihu | `zhihu get-hot` | ✅ | ✅ |
| English General | Reddit | `reddit get-hot` | ✅ | — |
| | HackerNews | `hackernews get-top` | — | — |
| | Product Hunt | `producthunt get-trending` | ✅ | — |
| | Google Trends | `google get-trending` | ✅ | — |
| | X (Twitter) | `x get-trending` | ✅ | ✅ |
| | YouTube | `youtube get-feed` | ✅ | — |
| | Substack | `substack get-trending` | ✅ | — |
| | TechCrunch | `techcrunch get-latest` | — | — |
| Chinese AI | Jike | `jike get-hot` | ✅ | ✅ |
| | Juejin | `juejin get-hot` | — | — |
| | Jiqizhixin | `jiqizhixin get-latest` | ✅ | — |
| | QbitAI | `qbitai get-latest` | ✅ | — |
| | Maimai | `maimai get-hot` | ✅ | ✅ |
| English AI | GitHub Trending | `github get-trending` | — | — |
| | Hugging Face | `huggingface get-trending` / `get-papers` | ✅ | — |
| | Replicate | `replicate get-trending` | ✅ | — |
| | Lobsters | `lobsters get-hot` | ✅ | — |
| | Medium | `medium get-staff-picks` / `get-tag-trending` | ✅ | — |

---

## License

MIT
