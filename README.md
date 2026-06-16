# AnyTrend

> 让 AI 每天自动帮你收集全网热点，并写成一份可直接阅读、归档或发布的日报。

AnyTrend 是一个面向 AI 工作流的热榜数据命令库。它将中文与英文主流平台的热榜、资讯流和 AI 垂类榜单沉淀为可复用的 [WebSculpt](https://github.com/websculpt) 命令，并提供一套清晰的日报生成流程：定时采集 → 数据聚合 → 格式统一 → AI 筛选/去重/摘要 → 输出 Markdown 日报。

本项目目前处于 **采集 + Normalize + 合并阶段已完成**：已接入 **27 个平台、27 条命令**，基于命令参数空间扩展为 **55 个调用角度**，并配套完成了 27 个 TypeScript adapter。`npm run collect:daily` 可一键完成批量采集、Normalize 与合并。AI 筛选/去重/摘要和 Markdown 日报渲染器将作为下一阶段目标逐步落地。

> **关于当前实现语言**：Normalize 层与 adapter 使用 TypeScript 实现，可直接嵌入 Node/TypeScript 工作流，也便于与 LLM Agent、前端或调度服务集成。每个 adapter 都是纯函数 `raw JSON → normalized JSON`。

---

## ✨ 核心能力

- **平台覆盖广**：27 个中英文热榜与 AI 垂类平台（27 条命令），无需逐个写爬虫。
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

### 1. 安装依赖

AnyTrend 的所有命令都基于 WebSculpt 运行，Normalize 层基于 TypeScript/Node。请先安装 Node 依赖并登录 WebSculpt（部分命令需要浏览器登录态）：

```bash
# 安装项目 Node 依赖
npm install

# 安装 websculpt（具体安装方式以官方文档为准）
websculpt --version

# 安装本项目命令到本地作用域
websculpt command install ./docs/commands
```

### 2. 查看全部命令

```bash
websculpt command list
```

### 3. 运行一条命令

```bash
# 获取百度实时热搜前 5 条
websculpt baidu get-hot --limit 5

# 获取 GitHub 今日 Python 热门仓库
websculpt github get-trending --period daily --language python --limit 5

# 获取 HackerNews 首页热门
websculpt hackernews get-top --limit 10
```

### 4. 一键采集并生成日报合并文件

```bash
# 默认采集今天，并发 8，同平台间隔 1.5s
npm run collect:daily

# 指定日期与并发参数
npm run collect:daily -- --date 2026-06-16 --concurrency 4 --delay 2000
```

执行后会生成：

- `data/raw/YYYY-MM-DD/` — websculpt 原始 JSON
- `data/normalized/YYYY-MM-DD/` — 符合 schema-v1 的标准 JSON
- `data/daily/YYYY-MM-DD/daily-merged.json` — 合并后的单一文件（含 `_source` 来源元数据）
- `data/daily/YYYY-MM-DD/collection-report.json` — 调用统计与失败详情

如需只 Normalize 已有原始数据：

```bash
npm run normalize:batch -- \
  --raw-dir data/raw/$(date +%Y-%m-%d) \
  --out-dir data/normalized/$(date +%Y-%m-%d)
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
- **团队协作**：GitHub Actions 每日定时运行，将 `data/daily/YYYY-MM-DD/daily-merged.json` 喂给 LLM 生成 Markdown 日报。
- **高频监控**：可配置多时段采集，对比榜单变化生成趋势图。

> LLM 提示词模板和 Markdown 日报渲染器将在后续版本中补充。欢迎提交 Issue 或 PR 一起设计。

---

## 📁 目录结构

```
AnyTrend/
├── src/
│   ├── adapters/                # 27 个命令的 normalize adapter（TypeScript）
│   │   ├── index.ts             # adapter 自动发现与分发
│   │   ├── factory.ts           # defineAdapter 工厂函数
│   │   ├── utils.ts             # 公共工具函数
│   │   ├── baidu-get-hot.ts
│   │   ├── github-get-trending.ts
│   │   └── ...
│   ├── config/                  # 采集配置
│   │   └── collect-plan.ts      # 55 个调用角度定义
│   ├── lib/                     # 采集运行时库
│   │   └── runner.ts            # websculpt 执行与并发调度
│   ├── scripts/                 # 执行脚本
│   │   ├── collect-daily.ts     # 每日采集 orchestrator
│   │   ├── merge-normalized.ts  # 合并 normalized 为单一文件
│   │   ├── normalize.ts         # 单文件 raw → normalized
│   │   └── normalize-batch.ts   # 批量 normalize
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
├── data/                        # 运行数据
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
