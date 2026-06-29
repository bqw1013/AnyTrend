---
name: anytrend-daily-site
description: 端到端生成 AnyTrend 日报静态站点，覆盖热点采集、AI 标注、代码聚合、首页精选、Feed 精选、渲染全流程。当用户需要生成今日日报、全球日报摘要，或针对指定日期重跑/更新日报时使用。
---

# AnyTrend Daily Site

端到端生成 AnyTrend 日报静态站点。按以下阶段顺序执行，除非用户明确要求跳过或重跑某个阶段。

## 前置准备

1. 确定目标日期：默认今天（`YYYY-MM-DD` 格式），或用户指定的日期，后续以 `<DATE>` 指代。
2. 读取 `config/site.yaml`，获取以下配置：
   - `homepage.recommendation_count`：首页推荐数量
   - `homepage.criteria`：首页推荐打分标准（五个维度：时效性、重要性、影响力、持续性、实用性）
   - `categories`：10 个分类的 `id` / `name` / `order` / `definition`
   - `feeds`：各 feed 的 `id` / `title` / `criteria` / `recommendation_count`
   - `translation.target_language`：目标语言（`zh`）

## 阶段 1：采集数据

执行：

```bash
anytrend build --archive-date <DATE>
```

输出（后续阶段仅依赖 `daily/<DATE>/` 下的文件）：
- `anytrend-data/daily/<DATE>/merged.jsonl`：合并后的全量条目
- `anytrend-data/daily/<DATE>/meta.json`：合并元数据
- `anytrend-data/daily/<DATE>/collection-report.json`：调用统计与失败详情

失败处理：
- 如果所有平台均失败（`merged.jsonl` 不存在或为空）：停止并报告用户。
- 如果部分平台失败但核心数据已采集（中文综合热榜和英文综合热榜各有至少数个平台成功）：记录失败平台，继续执行。如果失败面过大，询问用户是否继续。

## 阶段 2：AI 标注

将 `merged.jsonl` 逐条进行 AI 标注，生成 `annotated.jsonl`。标注内容：分类（`category_id`）、翻译后的标题/摘要（`title` / `summary`）、首页推荐分（`homepage_score` / `homepage_reason`）、各 feed 评分（`feed_scores`）。

### 2.1 分 Batch

1. 用命令获取 `merged.jsonl` 总行数 N（如 `wc -l` 或 Node.js 单行脚本），不要直接读取文件。
2. 按每批**最多 50 行**拆分：batch 数 = ceil(N / 50)。
3. 在 `anytrend-data/daily/<DATE>/` 下创建 `tmp/` 目录。

### 2.2 并发调度

最多 **10 个 subagent 并发**。每个 subagent 分配一个 batch，传入以下参数替换提示词模板中的占位符：

- `<INPUT_FILE_PATH>` → `anytrend-data/daily/<DATE>/merged.jsonl`
- `<START_LINE>` → batch 起始行号（从 1 开始）
- `<END_LINE>` → batch 结束行号（包含，不超过文件总行数）
- `<OUTPUT_FILE_PATH>` → `anytrend-data/daily/<DATE>/tmp/annotated-<START>-<END>.jsonl`
- `<CATEGORIES>` → `config/site.yaml` 中 `categories` 的完整内容（每个分类的 `id`/`name`/`definition`），格式化为易读列表
- `<HOMEPAGE_CRITERIA>` → `config/site.yaml` 中 `homepage.criteria` 的原文
- `<AI_FEED_CRITERIA>` → `config/site.yaml` 中 `feeds[0].criteria`（`id: ai`）的原文
- `<POLITICS_ECONOMY_FEED_CRITERIA>` → `config/site.yaml` 中 `feeds[1].criteria`（`id: politics-economy`）的原文

如果 batch 总数超过 10，分轮执行：每轮最多 10 个并发，等当前轮全部完成后再启动下一轮。

### 2.3 Subagent 提示词模板

以下为传给每个 subagent 的提示词模板。`<INPUT_FILE_PATH>`、`<START_LINE>`、`<END_LINE>`、`<OUTPUT_FILE_PATH>`、`<CATEGORIES>`、`<HOMEPAGE_CRITERIA>`、`<AI_FEED_CRITERIA>`、`<POLITICS_ECONOMY_FEED_CRITERIA>` 需替换为实际值。

## 输入

处理文件 `<INPUT_FILE_PATH>` 的第 `<START_LINE>` 行到第 `<END_LINE>` 行（包含两端）。
该文件是 JSONL 格式，每行一个 JSON 对象，结构与原始 `merged.jsonl` 一致。

如果实际文件行数少于 `<END_LINE>`，处理到文件末尾即可。

## 输出

将结果写入文件 `<OUTPUT_FILE_PATH>`。

输出文件也是 JSONL，每行对应输入的一行，顺序必须一致。每行输出格式如下：

```json
{
  "id": "baidu:realtime:1:河南高考600分及以上37544人",
  "category_id": "society",
  "category_reason": "高考分数发布属于固定社会教育议题",
  "title": "河南高考600分及以上37544人",
  "summary": "6月25日公布的2026年河南省高考"一分一段表"显示，全省600分及以上考生37544人……",
  "homepage_score": 3,
  "homepage_reason": "高考放榜社会关注度高，但持续性和突破性有限",
  "feed_scores": {
    "ai": {"score": 1, "reason": "与 AI 无关"},
    "politics-economy": {"score": 2, "reason": "教育政策背景弱，主要是社会情绪话题"}
  }
}
```

字段说明：

- `id`：从输入行原样复制。
- `category_id`：从下面 10 个分类中选择唯一最贴切的一个。
- `category_reason`：一句话说明为什么选这个分类，不能写空话。
- `title` / `summary`：如果原始内容主要是中文，直接复制原文；如果是英文，翻译成自然流畅的中文。`summary` 为 `null` 时输出 `null`。
- `homepage_score`：1–5 的整数。
- `homepage_reason`：一句话打分理由。
- `feed_scores`：对 `ai` 和 `politics-economy` 两个 feed 分别给出 `score`（1–5 整数）和 `reason`。

## 分类标准

可选的 `category_id`（及对应定义）如下。以内容主题为唯一依据，不要根据平台、情绪或标题党词汇分类。内容涉及多个领域时以核心议题为准，跨界的在 `category_reason` 中说明理由。

<CATEGORIES>

## 打分标准

### 首页推荐潜力（homepage_score）

<HOMEPAGE_CRITERIA>

### AI 动态（feed_scores.ai）

<AI_FEED_CRITERIA>

### 政经观察（feed_scores.politics-economy）

<POLITICS_ECONOMY_FEED_CRITERIA>

## 重要约束

1. 只能处理 `<INPUT_FILE_PATH>` 的第 `<START_LINE>` 行到第 `<END_LINE>` 行，不要处理整个文件。
2. `id` 必须原样保留，不能修改、不能省略。
3. 输出顺序必须和输入顺序完全一致。
4. 每个条目只能有一个 `category_id`。
5. 所有 `score` 必须是 1–5 的整数。
6. 所有 `reason` 必须具体，不能写"符合标准""内容相关"等空话。
7. 不要编造 `title` 或 `summary` 中没有的信息。
8. 输出文件必须是合法 JSONL，每行一个紧凑 JSON，不要加 Markdown 代码块或其他说明文字。
9. 使用 1–5 分绝对尺度，不要因为当前 batch 内部的好坏而刻意拔高或压低分数。

## 代码要求

禁止手动逐行拼接 JSONL 字符串。

你应该按以下方式生成输出文件：

1. 用代码读取 `<INPUT_FILE_PATH>` 的指定行范围。
2. 在代码中构造一个输出对象数组，每个对象对应一条输入，字段包括：
   `id`、`category_id`、`category_reason`、`title`、`summary`、
   `homepage_score`、`homepage_reason`、`feed_scores`。
3. 根据你的判断，通过代码把每个字段的值赋给对应对象（即"用代码补全字段"）。
4. 全部字段补完后，用 `JSON.stringify`、`json.dumps` 或等价代码把对象数组序列化为合法 JSONL（每行一个紧凑 JSON）。
5. 用代码把 JSONL 内容一次性写入 `<OUTPUT_FILE_PATH>`。如果文件已存在，直接覆盖。

如果需要检查输出文件，也用代码读取，不要手动打开修改。

## 返回要求

- 如果全部成功：返回"已完成"，并简要说明处理过程中遇到的特殊情况（如某些条目 summary 为空、语言难以判断、分类边界模糊等）。
- 如果失败：返回"失败"，说明原因以及你已经尝试过的解决办法。

请现在处理指定行范围，用代码写入输出文件，然后按上述要求返回。

---

### 2.4 合并

所有 batch 完成后，主 agent 编写并执行一个 Node.js 脚本完成合并（以下为伪代码描述，实际脚本由主 agent 编写）：

1. 扫描 `anytrend-data/daily/<DATE>/tmp/` 目录下所有 `annotated-*.jsonl` 文件。
2. 从文件名解析起始行号（如 `annotated-001-050.jsonl` → `001`），按行号升序排序。
3. 逐文件读取，逐行解析 JSON。
4. **过滤**：丢弃 `homepage_score === 1` 的条目。
5. 将保留的条目按顺序写入 `anytrend-data/daily/<DATE>/annotated.jsonl`（合法 JSONL，每行一个紧凑 JSON，无多余空行）。

### 2.5 清理

- 删除 `anytrend-data/daily/<DATE>/tmp/` 目录及其所有内容。
- 删除合并脚本文件。

如果 `annotated.jsonl` 不存在或为空：停止并报告用户。

## 阶段 3：代码聚合

执行：

```bash
anytrend daily-site aggregate --archive-date <DATE>
```

读取 `merged.jsonl` 与 `annotated.jsonl`，生成以下中间文件：
- `anytrend-data/daily/<DATE>/items.jsonl`
- `anytrend-data/daily/<DATE>/sources.json`
- `anytrend-data/daily/<DATE>/homepage.json`
- `anytrend-data/daily/<DATE>/feeds.json`
- `anytrend-data/daily/<DATE>/themes.json`

## 阶段 4：首页精选

主 agent 直接完成，不使用 subagent。

### 4.1 读取

读取 `anytrend-data/daily/<DATE>/homepage.json`，获取 `candidates` 数组（代码聚合器已按分数门槛预筛选的候选池）。

### 4.2 精选

从 candidates 中精选 N 条（N = `homepage.recommendation_count`，从 `config/site.yaml` 读取），按以下维度综合判断：

- **里程碑性**：今天有没有绕不开的重大事件（政策转向、重大产品发布、国际冲突升级等）。这类事件无论分类直接入选。
- **覆盖度**：日报读者期待全景视图，需横跨至少 3–4 个大类，避免首页全是单一分类。
- **中英平衡**：中文和英文来源大致均衡，不严重偏向单一语言。
- **信息密度**：优先选有具体事实、数据或明确行动的条目，不选泛泛的情绪化标题或纯观点输出。
- **时效性**：今天新热 > 昨天余温，优先选择今天新发生或今天才被广泛关注的事件。

排序规则：按推荐优先级排列，`order` 从 1 开始。候选不足 N 条时保留全部，不编造。

### 4.3 撰写总结

用中文撰写 `summary`，200–400 字，冷静客观的新闻摘要风格，不加主观评论。结构：
- 先概括当日整体特征（1–2 句）。
- 再列出 3–5 个关键方向，每个方向用 1–2 句说明，严格基于精选的 N 条内容。
- 不编造任何精选条目中不存在的信息。

### 4.4 写回

用代码将精选后的 `candidates`（仅保留选中的 N 条，`order` 重新从 1 开始编号）和 `summary` 写回 `homepage.json`，保持原有 JSON 结构不变（`{ summary, candidates }`）。

**注意**：必须通过代码（Node.js 脚本）完成写回，编写脚本 → 执行 → 删除脚本。不得手动编辑 JSON 文件。

## 阶段 5：Feed 精选

主 agent 直接完成，不使用 subagent。与首页精选**串行**执行。

### 5.1 读取

读取 `anytrend-data/daily/<DATE>/feeds.json`，获取 `feeds` 数组。每个 feed 包含 `id`、`title`、`candidates`（代码聚合器已按分数门槛预筛选的候选池）。

### 5.2 逐 Feed 精选

对每个 feed，从其 `candidates` 中精选最多 M 条（M = 该 feed 的 `recommendation_count`，从 `config/site.yaml` 读取）。

选稿标准参考 `config/site.yaml` 中该 feed 的 `criteria`。**不得依赖标注阶段的 `feed_scores` 分数**——用该 feed 自身的选稿眼光和 criteria 独立重新判断每条候选是否应该入选。

排序规则：按推荐优先级排列，`order` 从 1 开始。候选不足 M 条时保留全部，不编造。

### 5.3 写回

用代码将精选后的 `feeds`（每个 feed 的 `candidates` 仅保留选中的条目，`order` 重新从 1 开始编号）写回 `feeds.json`，保持原有 JSON 结构不变（`{ feeds: [...] }`）。

**注意**：必须通过代码（Node.js 脚本）完成写回，编写脚本 → 执行 → 删除脚本。

## 阶段 6：渲染站点

执行：

```bash
anytrend daily-site render --archive-date <DATE>
```

读取中间数据文件（`homepage.json`、`feeds.json`、`themes.json`、`sources.json`、`items.jsonl`），生成静态站点到 `anytrend-data/site/<DATE>/`。

如果渲染失败，检查 `homepage.json` 和 `feeds.json` 结构是否正确，修正后重试一次。若仍失败，报告用户。

## 阶段 7：验证输出

确认以下文件存在且内容非空：

| 文件 | 说明 |
|---|---|
| `anytrend-data/daily/<DATE>/homepage.json` | 精选后的 candidates + summary |
| `anytrend-data/daily/<DATE>/feeds.json` | 精选后的各 feed candidates |
| `anytrend-data/site/<DATE>/index.html` | 今日日报首页 |
| `anytrend-data/site/<DATE>/themes.html` | 分类浏览页 |
| `anytrend-data/site/<DATE>/sources.html` | 平台榜单页 |
| `anytrend-data/site/<DATE>/feeds.html` | AI 精选页 |

## 完成汇报

成功后向用户汇报：
- 日期
- 采集概况（成功平台数 / 总平台数，列出失败平台）
- 标注条目数（`annotated.jsonl` 行数）
- 首页精选数量
- 各 feed 精选数量
- 站点输出路径（`anytrend-data/site/<DATE>/`）
