# AnyTrend

> 让 AI 每天自动帮你收集全网热点，并写成一份可直接阅读、归档或发布的日报。

AnyTrend 是一个面向 AI 工作流的热榜数据命令库。它将中文与英文主流平台的热榜、资讯流和 AI 垂类榜单沉淀为可复用的 [WebSculpt](https://github.com/websculpt) 命令，并提供一套清晰的日报生成流程：定时采集 → 数据聚合 → 格式统一 → AI 筛选/去重/摘要 → 输出 Markdown 日报。

本项目目前处于 **采集 + Normalize + 合并阶段已完成**：已接入 **25 个平台、27 条命令**，基于命令参数空间扩展为 **55 个调用角度**，并配套完成了 27 个 TypeScript adapter。`npm run collect:daily` 可一键完成批量采集、Normalize 与合并。AI 筛选/去重/摘要和 Markdown 日报渲染器将作为下一阶段目标逐步落地。

> **关于当前实现语言**：Normalize 层与 adapter 使用 TypeScript 实现，可直接嵌入 Node/TypeScript 工作流，也便于与 LLM Agent、前端或调度服务集成。每个 adapter 都是纯函数 `raw JSON → normalized JSON`。

---

## ✨ 核心能力

- **平台覆盖广**：25 个中英文热榜与 AI 垂类平台（27 条命令），无需逐个写爬虫。
- **命令即服务**：每条命令都经过实际运行验证，返回结构化 JSON，可直接喂给 LLM。
- **格式统一**：通过外部 adapter 层，把 27 条命令千差万别的字段统一为 `{ id, title, url, heat, heat_raw, summary, tags }`，不修改命令本身。
- **AI 友好**：统一的返回结构 `{ command, platform, category, board_type, items[] }`，便于 Agent 解析、分板块渲染和错误处理。
- **日报就绪**：采集结果天然适合作为 LLM 的上下文，用于生成摘要、分类、趋势解读。
- **可扩展**：新增平台只需遵循相同的命令沉淀规范和 adapter 接口，即可接入现有工作流。

---

## 📊 平台覆盖矩阵

已接入平台按语言与领域分类如下：

### 中文综合热榜

| 平台 | 命令 | 浏览器 | 登录 |
|---|---|:---:|:---:|
| 百度热搜 | `websculpt baidu get-hot` | ❌ | ❌ |
| Bilibili | `websculpt bilibili get-hot` | ❌ | ❌ |
| 抖音热榜 | `websculpt douyin get-hot` | ✅ | ✅ |
| 今日头条 | `websculpt toutiao get-hot` | ✅ | ❌ |
| 微博热搜 | `websculpt weibo get-hot-search` | ❌ | ❌ |
| 小红书 | `websculpt xiaohongshu get-feed` | ✅ | ✅ |
| 知乎热榜 | `websculpt zhihu get-hot` | ✅ | ✅ |

### 英文综合热榜

| 平台 | 命令 | 浏览器 | 登录 |
|---|---|:---:|:---:|
| GitHub Trending | `websculpt github get-trending` | ❌ | ❌ |
| HackerNews | `websculpt hackernews get-top` | ❌ | ❌ |
| Lobsters | `websculpt lobsters get-hot` | ✅ | ❌ |
| Reddit | `websculpt reddit get-hot` | ✅ | ❌ |
| Product Hunt | `websculpt producthunt get-trending` | ✅ | ❌ |
| Google Trends | `websculpt google get-trending` | ✅ | ❌ |
| X (Twitter) | `websculpt x get-trending` | ✅ | ✅ |
| YouTube | `websculpt youtube get-feed` | ✅ | ❌ |
| Substack | `websculpt substack get-trending` | ✅ | ❌ |
| TechCrunch | `websculpt techcrunch get-latest` | ❌ | ❌ |

### 中文 AI 垂类

| 平台 | 命令 | 浏览器 | 登录 |
|---|---|:---:|:---:|
| 即刻 AI 圈子 | `websculpt jike get-hot` | ✅ | ✅ |
| 稀土掘金 | `websculpt juejin get-hot` | ❌ | ❌ |
| 机器之心 | `websculpt jiqizhixin get-latest` | ✅ | ❌ |
| 量子位 | `websculpt qbitai get-latest` | ✅ | ❌ |
| 脉脉 AI 热帖 | `websculpt maimai get-hot` | ✅ | ✅ |

### 英文 AI 垂类

| 平台 | 命令 | 浏览器 | 登录 |
|---|---|:---:|:---:|
| Hugging Face Trending | `websculpt huggingface get-trending` | ✅ | ❌ |
| Hugging Face Papers | `websculpt huggingface get-papers` | ✅ | ❌ |
| Replicate | `websculpt replicate get-trending` | ✅ | ❌ |
| Medium Staff Picks | `websculpt medium get-staff-picks` | ✅ | ❌ |
| Medium Tag 热门 | `websculpt medium get-tag-trending` | ✅ | ❌ |

> 完整命令参数、返回值结构与运行示例，请参阅 [`docs/命令参考索引.md`](docs/命令参考索引.md)。

---

## 🚀 快速开始

### 1. 环境要求

- Node.js >= 22
- 已安装 WebSculpt CLI 及其运行时（见下一步）

### 2. 安装 WebSculpt 运行时

AnyTrend 的所有数据采集都基于 [WebSculpt](https://github.com/websculpt) 运行，请先安装：

```bash
npm install -g @playwright/cli@0.1.13 websculpt
websculpt skill install --lang zh
```

### 3. 安装 AnyTrend CLI

```bash
npm install -g anytrend

# 验证安装
anytrend --version
anytrend --help
```

### 4. 导入 AnyTrend 命令资产

AnyTrend 内置了 27 条 WebSculpt 命令。运行 setup 一键导入到本地命令库：

```bash
anytrend setup

# 预览导入结果（不实际写入）
anytrend setup --dry-run
```

`anytrend setup` 只是 `websculpt command import --from <anytrend 安装目录>/assets/websculpt-commands` 的快捷包装。

### 5. 环境检查

运行 `anytrend doctor` 验证环境是否就绪：

```bash
anytrend doctor
```

预期输出示例：

```
  ✓ Node.js: v22.11.0 (requires >=22)
  ✓ websculpt CLI: 1.2.3
  ✓ WebSculpt commands: All 27 required commands installed (55 collection angles covered)

Environment is ready.
```

### 6. 一键采集并生成日报

```bash
# 采集今天的全量热点数据
anytrend build

# 指定日期与并发参数
anytrend build --archive-date 2026-06-16 --concurrency 4 --delay 2000

# 静默模式（仅输出最终报告）
anytrend build --quiet
```

执行后会生成：

- `anytrend-data/raw/YYYY-MM-DD/` — websculpt 原始 JSON
- `anytrend-data/normalized/YYYY-MM-DD/` — 符合 schema-v1 的标准 JSON
- `anytrend-data/daily/YYYY-MM-DD/daily-merged.json` — 合并后的单一文件（含 `_source` 来源元数据）
- `anytrend-data/daily/YYYY-MM-DD/collection-report.json` — 调用统计与失败详情

### 7. 查看采集计划

```bash
# 列出所有采集源及其依赖
anytrend sources list
```

如需分步执行，可单独使用 `collect`、`normalize-batch` 和 `merge`：

```bash
# 只采集，不 Normalize / 合并
anytrend collect --archive-date 2026-06-17

# 只 Normalize 已有原始数据
anytrend normalize-batch \
  --input anytrend-data/raw/2026-06-17 \
  --output anytrend-data/normalized/2026-06-17

# 只合并已 Normalize 的数据
anytrend merge \
  --input anytrend-data/normalized/2026-06-17 \
  --output anytrend-data/daily/2026-06-17
```

> 注意：部分命令（抖音、知乎、小红书、即刻、脉脉、X 等）需要你在本地浏览器已登录的状态下运行。

---

## 📋 CLI 命令参考

### 全局选项

以下选项可用于所有命令：

| 选项 | 说明 |
|---|---|
| `--quiet` | 静默模式 — 抑制每行调用进度，仅输出最终摘要（`doctor` 和 `sources list` 不受影响，始终输出） |
| `--no-color` | 禁用彩色输出（等同于设置 `NO_COLOR=1`） |
| `--version` | 显示 AnyTrend 版本号 |
| `--help` | 显示全局帮助或指定命令的帮助 |

### 典型工作流

```bash
# 第一步：检查环境是否就绪
anytrend doctor

# 第二步：查看有哪些采集源
anytrend sources list

# 第三步：运行完整日报流水线
anytrend build

# 或者：指定日期 + 静默模式
anytrend build --archive-date 2026-06-16 --quiet
```

### `anytrend setup` — 导入 WebSculpt 命令资产

将 AnyTrend 内置的 WebSculpt 命令导入到本地命令库。首次安装或更新 AnyTrend 后需要执行一次。

```bash
anytrend setup [--dry-run]
```

| 选项 | 默认值 | 说明 |
|---|---|---|
| `--dry-run` | false | 预览要执行的 `websculpt command import` 命令，不实际写入 |

**示例：**

```bash
# 导入全部 27 条命令
anytrend setup

# 预览导入结果
anytrend setup --dry-run
```

> **前置条件**：`websculpt` CLI 必须已安装，否则 `setup` 会提示安装命令。

---

### `anytrend build` — 运行完整日报流水线

采集 + Normalize + 合并，一步完成（等价于 `collect` + `normalize-batch` + `merge` 的顺序执行）。

默认以**今天日期**作为归档目录名，输出到 `anytrend-data/raw/YYYY-MM-DD/`、`anytrend-data/normalized/YYYY-MM-DD/` 和 `anytrend-data/daily/YYYY-MM-DD/`。

```bash
anytrend build [--archive-date <YYYY-MM-DD>] [--concurrency <n>] [--delay <ms>]
               [--skip-collect] [--skip-normalize] [--quiet] [--no-color]
```

| 选项 | 默认值 | 说明 |
|---|---|---|
| `--archive-date` | 今天 | 输出目录和报告使用的归档日期 |
| `--concurrency` | 8 | 最大并发调用数 |
| `--delay` | 1500 | 同平台调用间隔（毫秒） |
| `--skip-collect` | false | 跳过采集，仅执行 Normalize + Merge |
| `--skip-normalize` | false | 跳过 Normalize + Merge，仅采集 |

> **关于 `--archive-date` 的注意事项：**
> `--archive-date` 只决定输出目录名（`anytrend-data/raw/YYYY-MM-DD/` 等）和报告中的日期字段，**不会传给 WebSculpt 命令作为历史日期参数**。
> 因此大多数平台采集的是你运行命令那一刻的实时数据（如当前热榜），而不是指定日期的历史数据。
> 少数命令有独立日期逻辑（如 `producthunt/get-trending` 使用太平洋时间昨日），与 `--archive-date` 无关。

**示例：**

```bash
# 默认：采集今天、并发 8、延迟 1500ms
anytrend build

# 指定日期，降低并发和延迟以适配弱网环境
anytrend build --archive-date 2026-06-16 --concurrency 4 --delay 2000

# 只采集原始数据，不 Normalize / 合并
anytrend build --skip-normalize

# 已有原始数据，只执行 Normalize + 合并
anytrend build --skip-collect

# 静默模式：不打印每条命令进度，只输出最终摘要
anytrend build --quiet
```

**预期输出文件：**

```
anytrend-data/
├── raw/2026-06-17/              # WebSculpt 原始 JSON
├── normalized/2026-06-17/       # 符合 schema-v1 的标准 JSON
└── daily/2026-06-17/
    ├── daily-merged.json        # 合并后的单一文件
    └── collection-report.json   # 调用统计与失败详情
```

---

### `anytrend collect` — 仅采集

只运行 WebSculpt 采集步骤，不执行 Normalize 和 Merge。适用于只需要原始数据、后续手动 Normalize 的场景。

```bash
anytrend collect [--archive-date <YYYY-MM-DD>] [--concurrency <n>] [--delay <ms>] [--quiet] [--no-color]
```

| 选项 | 默认值 | 说明 |
|---|---|---|
| `--archive-date` | 今天 | 输出目录和报告使用的归档日期 |
| `--concurrency` | 8 | 最大并发调用数 |
| `--delay` | 1500 | 同平台调用间隔（毫秒） |

> **关于 `--archive-date` 的注意事项：** 同 `anytrend build`，`--archive-date` 只决定文件归档目录，不控制 WebSculpt 命令返回哪一天的实时数据。

**示例：**

```bash
# 采集今天的原始数据
anytrend collect

# 指定归档日期和更低的并发数
anytrend collect --archive-date 2026-06-17 --concurrency 4
```

**预期输出：**

```
anytrend-data/raw/2026-06-17/
├── baidu-get-hot.json
├── github-get-trending.json
├── zhihu-get-hot.json
└── ...
```

---

### `anytrend normalize` — 单文件 Normalize

将单个 raw JSON 文件转换为统一格式的 normalized 输出。

```bash
anytrend normalize --input <file> --output <file> [--quiet] [--no-color]
```

**示例：**

```bash
anytrend normalize \
  --input anytrend-data/raw/2026-06-17/baidu-get-hot.json \
  --output anytrend-data/normalized/2026-06-17/baidu-get-hot.json
```

**输入文件格式（raw）：**

```json
{
  "command": "baidu/get-hot",
  "success": true,
  "meta": { "duration": 177 },
  "data": {
    "tab": "realtime",
    "total": 50,
    "items": [
      {
        "rank": 1,
        "title": "3亿北斗工程现「脆皮底座」",
        "heatIndex": "7808179",
        "description": "山东济潍高速沿线，有人用手掰开了一个国家重点工程的底座。",
        "tag": "热",
        "url": "https://www.baidu.com/s?wd=...",
        "trend": "same"
      }
    ]
  }
}
```

**输出文件格式（normalized）：**

```json
{
  "version": "1.0",
  "generated_at": "2026-06-17T08:46:32Z",
  "command": "baidu/get-hot",
  "platform": "baidu",
  "language": "zh",
  "category": "zh-general",
  "board_type": "hot-search",
  "response_meta": {
    "success": true,
    "duration": 177,
    "raw_total": 50,
    "error": null
  },
  "items": [
    {
      "id": "baidu:realtime:1:3亿北斗工程现「脆皮底座」",
      "rank": 1,
      "title": "3亿北斗工程现「脆皮底座」",
      "url": "https://www.baidu.com/s?wd=...",
      "heat": "781万",
      "heat_raw": 7808179,
      "summary": "山东济潍高速沿线，有人用手掰开了一个国家重点工程的底座。",
      "tags": ["热"]
    }
  ]
}
```

---

### `anytrend normalize-batch` — 批量 Normalize

将目录中的所有 raw JSON 文件批量 Normalize。`--input` 和 `--output` 均为目录路径。

```bash
anytrend normalize-batch --input <dir> --output <dir> [--quiet] [--no-color]
```

**示例：**

```bash
anytrend normalize-batch \
  --input anytrend-data/raw/2026-06-17 \
  --output anytrend-data/normalized/2026-06-17
```

**预期输出：**

```
anytrend-data/normalized/2026-06-17/
├── baidu-get-hot.json
├── github-get-trending.json
├── zhihu-get-hot.json
└── ...
```

**注意：** 如果某个文件 Normalize 失败，会打印错误但继续处理其他文件；如果目录中所有文件都失败，CLI 退出码为 `1`。

---

### `anytrend merge` — 合并 Normalized 输出

将 normalized 目录下的所有文件合并为 `daily-merged.json` 和 `collection-report.json`。`--input` 和 `--output` 均为目录路径。

```bash
anytrend merge --input <dir> --output <dir> [--quiet] [--no-color]
```

**示例：**

```bash
anytrend merge \
  --input anytrend-data/normalized/2026-06-17 \
  --output anytrend-data/daily/2026-06-17
```

**预期输出：**

```
anytrend-data/daily/2026-06-17/
├── daily-merged.json        # 所有 normalized 文件聚合后的数据
└── collection-report.json   # 统计：成功/失败条数、平台覆盖、错误明细
```

`daily-merged.json` 的简化结构示例：

```json
{
  "date": "2026-06-17",
  "generated_at": "2026-06-17T09:00:00Z",
  "sources": [
    {
      "command": "baidu/get-hot",
      "platform": "baidu",
      "category": "zh-general",
      "board_type": "hot-search",
      "items": [...]
    },
    {
      "command": "github/get-trending",
      "platform": "github",
      "category": "en-ai",
      "board_type": "trending",
      "items": [...]
    }
  ]
}
```

---

### `anytrend doctor` — 环境诊断

```bash
anytrend doctor [--no-color]
```

检查项目：
- Node.js 版本是否符合 `package.json` engines 要求
- WebSculpt CLI 是否安装及版本
- `COLLECT_PLAN` 中的所有命令是否已在 WebSculpt 注册

退出码：全部检查通过时返回 `0`，任一检查失败时返回 `1`（不中止，会跑完所有检查再返回聚合结果）。可在脚本中用 `anytrend doctor && anytrend build` 做前置条件判断。

**示例：**

```bash
anytrend doctor
```

**预期输出（正常）：**

```
Running environment diagnostics...

  ✓ Node.js: v22.20.0 (requires >=22)
  ✓ websculpt CLI: 0.3.1
  ✓ WebSculpt commands: All 27 required commands installed

Environment is ready.
```

**典型用法：**

```bash
anytrend doctor && anytrend build
```

---

### `anytrend sources list` — 查看采集计划

```bash
anytrend sources list [--no-color]
```

以表格形式展示所有采集源，包含命令名、采集角度、是否需要浏览器、是否需要登录。

**示例：**

```bash
anytrend sources list
```

**预期输出（节选）：**

```
Command                   Angle                           Browser  Login
--------------------------------------------------------------------------
baidu/get-hot             百度实时热搜                          no       no
bilibili/get-hot          Bilibili 热搜                     no       no
douyin/get-hot            抖音综合热门视频                        yes      yes
weibo/get-hot-search      微博热搜                            no       no
zhihu/get-hot             知乎热榜                            yes      yes
github/get-trending       GitHub Weekly Trending          no       no
hackernews/get-top        HackerNews Top by Points        no       no
producthunt/get-trending  Product Hunt 昨日榜单               yes      no
...

Total: 55 sources
Browser required: 43
Login required: 15
```

---

## 🧪 测试

```bash
# 默认运行单元 + 集成 + 非 live E2E（live E2E 被跳过）
npm test

# 单独运行各层
npm run test:unit
npm run test:integration
npm run test:e2e

# 运行 live E2E：真实调用 27 个 WebSculpt 命令并验证完整链路
npm run test:e2e:live
# 或
RUN_E2E_LIVE=1 npm run test:e2e
```

> **注意**：live E2E 默认不跑。它会真实调用 WebSculpt 命令，部分命令需要浏览器登录态（抖音、知乎、小红书、即刻、脉脉、X 等），并依赖本地网络环境访问外网。

---

## 📰 日报生成流程

当前已实现前三步；AI 筛选/去重/摘要和 Markdown 渲染器为下一阶段目标。

```
┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────────┐   ┌──────────────┐
│ 定时触发     │ → │ 批量采集     │ → │ Normalize    │ → │ AI 筛选/去重/摘要 │ → │ Markdown 日报 │
│ (cron/Actions)│   │ 55 个调用    │   │ 统一格式      │   │   LLM 流水线     │   │  本地归档     │
└─────────────┘   └─────────────┘   └─────────────┘   └─────────────────┘   └──────────────┘
   待接入            ✅ 已实现         ✅ 已实现          待实现               待实现
```

### 规划中的日报结构

```markdown
# 热点日报 — 2026-06-15

## 一、今日必读（Top 5）
- 综合中文热榜交叉验证出的高热度事件
- 综合英文科技/创业社区的高讨论话题

## 二、中文热点
- 社会/科技/娱乐摘要

## 三、英文热点
- Tech / Startup / AI 摘要

## 四、AI 垂类动态
- 模型发布、论文、开源项目、产品更新

## 五、数据溯源
- 每个结论都附带来源平台与原始链接
```

### 推荐调度方式

- **本地开发/个人使用**：`cron` 或 `systemd timer` 每天固定时间执行 `npm run collect:daily`。
- **团队协作**：GitHub Actions 每日定时运行，将 `anytrend-data/daily/YYYY-MM-DD/daily-merged.json` 喂给 LLM 生成 Markdown 日报。
- **高频监控**：可配置多时段采集，对比榜单变化生成趋势图。

> LLM 提示词模板和 Markdown 日报渲染器将在后续版本中补充。欢迎提交 Issue 或 PR 一起设计。

---

## 📁 目录结构

```
AnyTrend/
├── src/
│   ├── cli.ts                   # CLI 入口（commander 子命令路由）
│   ├── adapters/                # 27 个命令的 normalize adapter（TypeScript）
│   │   ├── index.ts             # adapter 自动发现与分发
│   │   ├── factory.ts           # defineAdapter 工厂函数
│   │   ├── utils.ts             # 公共工具函数
│   │   ├── baidu-get-hot.ts
│   │   ├── github-get-trending.ts
│   │   └── ...
│   ├── config/                  # 采集配置
│   │   └── collect-plan.ts      # 55 个调用角度定义
│   ├── lib/                     # 库与运行时
│   │   ├── runner.ts            # websculpt 执行与并发调度
│   │   ├── logger.ts            # 日志抽象（--quiet 支持）
│   │   ├── doctor.ts            # 环境诊断（anytrend doctor）
│   │   ├── sources.ts           # 采集计划表格（anytrend sources list）
│   │   ├── normalize.ts         # 单文件与批量 normalize
│   │   ├── merge-normalized.ts  # 合并 normalized 为单一文件
│   │   └── collect-daily.ts     # 每日采集 orchestrator
│   └── types/                   # TypeScript 类型与 zod schema
│       ├── index.ts
│       └── schema.ts
├── tests/                       # 测试脚本
│   ├── unit/
│   │   └── adapters/
│   │       ├── factory.test.ts
│   │       └── structure.test.ts
│   ├── fixtures/
│   │   ├── adapters/            # 27 个 adapter 自测样本
│   │   └── e2e/                 # E2E 测试专用 fixture
│   ├── integration/
│   │   ├── adapters/
│   │   │   └── selftest.test.ts
│   │   └── normalized-schema.test.ts
│   └── e2e/
│       ├── utils.ts             # E2E 公共工具
│       ├── normalize-pipeline.test.ts
│       ├── normalize-batch-pipeline.test.ts
│       └── live/
│           └── websculpt-commands.test.ts
├── anytrend-data/                        # 运行数据
│   ├── raw/YYYY-MM-DD/
│   ├── normalized/YYYY-MM-DD/
│   └── daily/YYYY-MM-DD/        # 合并后的日报与采集报告
├── docs/
│   ├── normalize/               # Normalize 层文档
│   │   ├── README.md
│   │   ├── schema-v1.md
│   │   └── research/            # 27 个命令的调查报告
│   ├── 平台覆盖规划.md           # 平台选型与实施路线图
│   ├── 命令参考索引.md           # 全部 27 条命令的索引
│   ├── commands/                # 每条命令的独立详细文档
│   └── 小红书探索复盘.md          # 典型平台探索复盘（示例）
├── .websculpt/
│   └── scope.json               # 项目级命令可见范围白名单
├── README.md
└── .gitignore
```

---

## 🛠️ 开发

### 本地开发安装

```bash
# 克隆仓库
git clone <repo-url> && cd AnyTrend

# 安装依赖
npm install
```

### 可用 NPM Scripts

| 命令 | 说明 |
|---|---|
| `npm run collect:daily` | 批量采集 + Normalize + 合并（等同于 `anytrend build`） |
| `npm run normalize` | 单文件 Normalize（`tsx src/cli.ts normalize`） |
| `npm run normalize:batch` | 批量 Normalize（`tsx src/cli.ts normalize-batch`） |
| `npm run merge:daily` | 合并 Normalized 文件（`tsx src/cli.ts merge`） |
| `npm run build` | 编译 TypeScript → `dist/` |
| `npm run typecheck` | 类型检查 |
| `npm run check` | Lint + Format 检查 |
| `npm run check:fix` | 自动修复 Lint + Format |
| `npm run test` | 运行全部测试 |
| `npm run test:unit` | 仅单元测试 |
| `npm run test:integration` | 仅集成测试 |
| `npm run test:e2e` | 仅 E2E 测试（非 live） |
| `npm run test:e2e:live` | 运行 live E2E（真实调用 WebSculpt 命令） |

### 本地运行 CLI（开发模式）

```bash
# 使用 tsx 直接运行 TypeScript
npx tsx src/cli.ts build --archive-date 2026-06-16
npx tsx src/cli.ts doctor
npx tsx src/cli.ts sources list
```

---

## 🛠️ 扩展新平台

如果你想为 AnyTrend 增加新的热榜平台，可以参考以下流程：

1. **探索**：使用 `websculpt-explore` 验证目标网站的数据来源与提取路径。
2. **沉淀**：将验证通过的提取逻辑固化为 `docs/commands/<platform>-<action>.md` 命令文档。
3. **测试**：实际运行命令，确保返回值符合 `{ success, command, data, meta }` 结构。
4. **写 Adapter**：在 `src/adapters/` 下新增 `{platform}-{action}.ts`（如 `baidu-get-hot.ts`），实现 `normalize(raw: RawInput): AdapterOutput`，参考 `docs/normalize/schema-v1.md` 和现有 adapter。
5. **记录**：更新 `docs/命令参考索引.md`、`docs/平台覆盖规划.md` 和 `docs/normalize/research/`。
6. **加入白名单**：在 `.websculpt/scope.json` 中追加新命令路径。
7. **跑测试**：运行 `npm test`。

详细规范请参考现有命令文档和 adapter 代码。

---

## ⚠️ 使用须知

1. **部分命令需要登录态**：抖音、知乎、小红书、即刻、脉脉、X 需要在本地浏览器已登录的状态下运行。
2. **部分命令依赖浏览器渲染**：这些命令执行耗时通常在 3–20 秒之间，请合理控制调用频率。
3. **数据归各平台所有**：本项目仅提供数据获取方式，请遵守各平台的服务条款与 robots 协议。
4. **已知问题**：详见 [`docs/命令参考索引.md`](docs/命令参考索引.md) 中的"已知问题与注意事项"章节。

---

## 🤝 贡献

欢迎通过 Issue 或 Pull Request 参与：

- 报告某个命令失效或返回异常
- 补充新的平台命令
- 完善日报模板与自动化脚本
- 改进文档或翻译

---

## 📜 License

MIT

---

*AnyTrend 相信：信息获取应该被沉淀为可复用的命令资产，而不是每次都从零开始爬取。*
