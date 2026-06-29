# AnyTrend

[![npm version](https://img.shields.io/npm/v/anytrend)](https://www.npmjs.com/package/anytrend)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node Version](https://img.shields.io/node/v/anytrend)](package.json)

> 一键采集 25 个中英文平台的热榜数据，由 AI 精选后生成多视图日报站点。

AnyTrend 每天自动采集 25 个中英文平台的热榜，由 AI 筛选、翻译、分类后，输出一个可浏览、可归档、可部署的静态日报站点。底层采集基于 [WebSculpt](https://github.com/bqw1013/WebSculpt)。

---

## 安装

**环境要求**：Node.js >= 22

```bash
# 1. 安装 WebSculpt 运行时
npm install -g @playwright/cli@0.1.13 websculpt
websculpt skill install --lang zh

# 2. 安装 AnyTrend
npm install -g anytrend

# 3. 初始化：导入 WebSculpt 命令 + 生成默认配置
anytrend setup

# 4. 检查环境
anytrend doctor

# 5. 安装 AnyTrend Agent Skill，让 AI 自动调用 anytrend 命令
npx skills add bqw1013/AnyTrend --skill anytrend-daily-site

# 跳过 agent 选择交互，直接安装到检测到的 agent
npx skills add bqw1013/AnyTrend --skill anytrend-daily-site --yes
```

## 生成日报

```bash
anytrend build
```

采集完成后，由 AI 完成标注、精选和站点渲染。端到端流程见 [`skills/anytrend-daily-site/SKILL.md`](skills/anytrend-daily-site/SKILL.md)。

---

## 命令速览

| 命令 | 用途 |
|---|---|
| `anytrend doctor` | 检查 Node.js、WebSculpt CLI 和命令安装状态 |
| `anytrend setup` | 导入 WebSculpt 命令 + 生成默认配置文件 |
| `anytrend build` | 完整日报流水线（采集 + Normalize + 合并） |
| `anytrend sources list` | 列出所有采集源 |
| `anytrend daily-site aggregate` | 生成站点中间数据文件 |
| `anytrend daily-site render` | 渲染静态 HTML 站点 |

> 分步执行命令（`collect`、`normalize`、`normalize-batch`、`merge`）详见 [`docs/cli.md`](docs/cli.md)。

---

## 平台覆盖

**25 个平台，27 条命令，55 个采集角度。** 部分命令需要浏览器和登录态。

| 分类 | 平台 | 命令 | 浏览器 | 登录 |
|---|---|---|---|---|
| 中文综合 | 百度热搜 | `baidu get-hot` | — | — |
| | Bilibili | `bilibili get-hot` | — | — |
| | 抖音 | `douyin get-hot` | ✅ | ✅ |
| | 今日头条 | `toutiao get-hot` | ✅ | — |
| | 微博热搜 | `weibo get-hot-search` | — | — |
| | 小红书 | `xiaohongshu get-feed` | ✅ | ✅ |
| | 知乎 | `zhihu get-hot` | ✅ | ✅ |
| 英文综合 | Reddit | `reddit get-hot` | ✅ | — |
| | HackerNews | `hackernews get-top` | — | — |
| | Product Hunt | `producthunt get-trending` | ✅ | — |
| | Google Trends | `google get-trending` | ✅ | — |
| | X (Twitter) | `x get-trending` | ✅ | ✅ |
| | YouTube | `youtube get-feed` | ✅ | — |
| | Substack | `substack get-trending` | ✅ | — |
| | TechCrunch | `techcrunch get-latest` | — | — |
| 中文 AI | 即刻 | `jike get-hot` | ✅ | ✅ |
| | 稀土掘金 | `juejin get-hot` | — | — |
| | 机器之心 | `jiqizhixin get-latest` | ✅ | — |
| | 量子位 | `qbitai get-latest` | ✅ | — |
| | 脉脉 | `maimai get-hot` | ✅ | ✅ |
| 英文 AI | GitHub Trending | `github get-trending` | — | — |
| | Hugging Face | `huggingface get-trending` / `get-papers` | ✅ | — |
| | Replicate | `replicate get-trending` | ✅ | — |
| | Lobsters | `lobsters get-hot` | ✅ | — |
| | Medium | `medium get-staff-picks` / `get-tag-trending` | ✅ | — |

---

## 配置

`anytrend setup` 会在当前目录生成 `config/site.yaml`，可按需修改：

- `homepage.recommendation_count` — 首页推荐数量（默认 15）
- `homepage.criteria` — 首页选稿打分标准
- `categories` — 10 个内容分类
- `feeds` — AI 动态和政经观察两个精选 feed

---

## License

MIT
