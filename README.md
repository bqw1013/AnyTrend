# AnyTrend

[English](./README.en.md)

[![npm version](https://img.shields.io/npm/v/anytrend)](https://www.npmjs.com/package/anytrend)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node Version](https://img.shields.io/node/v/anytrend)](package.json)

> AnyTrend 让你的 AI Agent 跑遍全网 25 个中英文平台，自动采集、翻译、筛选、归类，最终生成一份可直接浏览的全球热点日报站点。

AnyTrend 提供一套 CLI 工具和一个 Agent Skill：CLI 负责数据采集和站点渲染，Skill 驱动 Agent 按既定流程完成标注、精选和总结。25 个平台的数据采集能力来自 [WebSculpt](https://github.com/bqw1013/WebSculpt)。

演示视频：[TODO: 视频链接]

---

## 前置条件

| 条件 | 说明 |
|---|---|
| Node.js | >= 22 |
| 网络连通性 | 本地网络需能正常访问目标平台。部分境外站点（YouTube、X、Reddit 等）需自行确保网络可达，AnyTrend 不做代理 |
| Chrome 浏览器 | 开启远程调试模式：在 Chrome 地址栏进入 `chrome://inspect/#remote-debugging` 并勾选允许远程调试 |
| 浏览器登录态 | 部分平台（抖音、小红书、知乎、X、即刻、脉脉等）需在 Chrome 中提前登录对应账号，否则采集失败 |
| AI Agent | 标注、精选、总结等阶段由 Skill 驱动 Agent 执行，需支持 Skill 机制的 Agent 环境 |

---

## 安装

```bash
# 1. 安装 WebSculpt 运行时
npm install -g @playwright/cli@0.1.13 websculpt
websculpt skill install --lang zh

# 2. 安装 AnyTrend CLI
npm install -g anytrend

# 3. 导入 27 条内置采集命令，并在当前目录生成 config/site.yaml
anytrend setup

# 4. 检查环境是否就绪
anytrend doctor

# 5. 安装 AnyTrend Skill，让 Agent 按流程自动执行标注、精选和渲染
npx skills add bqw1013/AnyTrend --skill anytrend-daily-site --yes
```

---

## 使用

打开 Agent，输入"我要今天的全球热点日报"，Agent 会加载 Skill 自动完成采集 → 标注 → 聚合 → 精选 → 渲染全流程。

采集数据和日报站点都在当前工作目录下：

- 采集数据：`anytrend-data/daily/<DATE>/`（含原始采集结果、AI 标注、站点中间数据）
- 日报站点：`anytrend-data/site/<DATE>/`，浏览器打开 `index.html` 即可浏览

也可以单独运行 CLI 命令，详见[命令速览](#命令速览)。

---

## 配置

`anytrend setup` 在当前目录生成 `config/site.yaml`，按需修改以下配置块：

| 配置块 | 控制什么 |
|---|---|
| `translation` | 目标翻译语言（默认中文） |
| `homepage` | 首页推荐数量（`recommendation_count`）和 AI 打分标准（`criteria`） |
| `categories` | 10 个内容分类及其定义 |
| `feeds` | 精选 Feed 列表，每个 feed 包含选稿标准（`criteria`）和推荐数量（`recommendation_count`） |
| `pipeline` | 流水线参数 |

### 自定义筛选标准

修改 `homepage.criteria` 和 `feeds[].criteria` 可以调整 Agent 的选稿偏好。但必须保留 1–5 分制，Agent 依赖该分值做筛选和排序。

### 新增 Feed

参照现有两个 feed（`ai` 和 `politics-economy`）的结构，在 `feeds` 数组中新增一个条目：

```yaml
- id: your-feed-id
  title: 你的 Feed 名称
  recommendation_count: 10
  criteria: >-
    描述该 Feed 的选稿标准，写明 1–5 分各自对应什么内容。
```

### Pipeline 参数

标注阶段采用多 Agent 并发模型：每个 Agent 独立处理一个数据批次。标注完成后，代码按评分筛选出候选池（candidates），后续 Agent 再从候选池中做最终精选。以下参数控制并发规模和候选池筛选逻辑：

| 参数 | 默认值 | 说明 |
|---|---|---|
| `annotation.batch_size` | 50 | 每个 Agent 一次处理的条目数。增大可减少 Agent 调度次数，但单个 Agent 的上下文变长 |
| `annotation.max_concurrency` | 10 | 同时运行的标注 Agent 数量上限 |
| `annotation.model` | haiku | 标注使用的 AI 模型 |
| `aggregation.candidate_ratio` | 0.2 | 进入候选池的比例（前 N%），即全量条目中取评分最高的前 20% |
| `aggregation.max_candidates` | 50 | 候选池硬上限，即使按比例计算超过该值也会截断 |
| `aggregation.initial_score_threshold` | 4 | 候选池最低分数门槛（1–5 分制），不足时自动降级（4→3→2→1）以补足候选数量 |

> 采集平台列表、采集角度、前端模板为代码内置，不可通过 `site.yaml` 修改。

---

## 命令速览

| 命令 | 用途 |
|---|---|
| `anytrend doctor` | 检查 Node.js、WebSculpt CLI 和命令安装状态 |
| `anytrend setup` | 导入 WebSculpt 命令 + 生成默认配置文件 |
| `anytrend build` | 完整采集流水线（Collect + Normalize + Merge） |
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

## License

MIT
