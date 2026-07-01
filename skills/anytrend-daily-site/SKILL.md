---
name: anytrend-daily-site
description: 端到端生成 AnyTrend 日报静态站点，覆盖热点采集、AI 标注、代码聚合、首页精选、Feed 精选、渲染全流程。当用户需要生成今日日报、全球日报摘要，或针对指定日期重跑/更新日报时使用。
---

# AnyTrend Daily Site

端到端生成 AnyTrend 日报静态站点。按以下阶段顺序执行，除非用户明确要求跳过或重跑某个阶段。

## 约定与规范

以下规则适用于全文。

### 变量引用

- `{site.<path>}` — 引用 `config/site.yaml` 中的值。路径用点号分隔，数组用 `[index]` 索引。读到它就去 site.yaml 查找，路径不存在则报错。
- `{var_name}` — 运行时变量，由你根据上下文计算后填入。
- 传给 subagent 之前，确保提示词中所有 `{ }` 已完成替换，subagent 收到的不应包含任何变量标记。

### 结构化文件读写

所有 JSON / JSONL 文件的读写必须通过 Node.js 脚本完成。

**读取：**

- 获取 JSONL 总行数：用 `wc -l` 或 Node.js 逐行计数脚本。禁止用 Read 工具肉眼计数。
- 读取 JSONL 指定行范围：编写 Node.js 脚本逐行读入、按行号过滤。
- 读取 JSON 提取字段：编写 Node.js 脚本读取并解析。

**写入（固定步骤）：**

1. `readFileSync` 读取目标文件
2. `JSON.parse` 解析为对象/数组
3. 仅修改需要变动的字段（过滤、排序、赋值），其余字段原样保留
4. `JSON.stringify` 序列化（JSON 用 `null, 2` 格式化，JSONL 每行紧凑）
5. `writeFileSync` 写入
6. 删除脚本文件

**禁止：**

- 在脚本中逐字段硬编码重建完整的对象/数组
- 手动拼接 JSON 字符串
- 用 Edit 工具修改 JSON / JSONL 文件

### Subagent 任务块

`~~~subagent` 围栏代码块是传给 subagent 的提示词模板。你替换其中的变量后原样传递，不修改块内结构。

---

## 前置准备

### 确定日期

默认今天（`YYYY-MM-DD` 格式），或用户指定的日期，后续以 `<DATE>` 指代。

### 读取配置

读取 `config/site.yaml`。文档中所有 `{site.xxx}` 引用均从该文件取值。

---

## 阶段 1：采集数据

执行：

```bash
anytrend build --archive-date <DATE>
```

输出（后续阶段仅依赖 `anytrend-data/daily/<DATE>/` 下的文件）：

- `anytrend-data/daily/<DATE>/merged.jsonl`：合并后的全量条目
- `anytrend-data/daily/<DATE>/meta.json`：合并元数据
- `anytrend-data/daily/<DATE>/collection-report.json`：调用统计与失败详情

**失败处理：**

- 如果所有平台均失败（`merged.jsonl` 不存在或为空）：停止并报告用户。
- 如果部分平台失败但核心数据已采集（中文综合热榜和英文综合热榜各有至少数个平台成功）：记录失败平台，继续执行。如果失败面过大，询问用户是否继续。

---

## 阶段 2：AI 标注

将 `merged.jsonl` 逐条进行 AI 标注，生成 `annotated.jsonl`。

每条需要完成的任务：

| # | 任务 | 说明 |
|---|---|---|
| 2a | 复制 id | 原样保留，不可修改 |
| 2b | 分类 | 从 `{site.categories}` 中选择最贴切的 `category_id`，并给出 `category_reason` |
| 2c | 翻译 | 原文不是 {site.translation.target_language} 则翻译为 {site.translation.target_language}；已是目标语言则原样保留；summary 为 null 时输出 null |
| 2d | 首页评分 | 1–5 分的 `homepage_score` 及具体 `homepage_reason` |
| 2e | Feed 评分 | 对 `{site.feeds}` 中每个 feed 独立给出 `score` 和 `reason` |

### 2.1 分 Batch

1. 用 `wc -l` 获取 `anytrend-data/daily/<DATE>/merged.jsonl` 总行数 N。
2. batch 数 = ceil(N / `{site.pipeline.annotation.batch_size}`)。
3. 在 `anytrend-data/daily/<DATE>/` 下创建 `tmp/` 目录。

按以下规则拆分为 M 个 batch（每批起始行号零填充到 3 位，确保文件名字典序与行号顺序一致）：

| batch | 行范围 | 输出文件 |
|---|---|---|
| 1 | 第 1 行 ～ 第 batch_size 行 | `tmp/annotated-001-{batch_size}.jsonl` |
| 2 | 第 batch_size+1 行 ～ 第 batch_size×2 行 | `tmp/annotated-{batch_size+1}-{batch_size×2}.jsonl` |
| ... | ... | ... |
| M | 第 (M-1)×batch_size+1 行 ～ 第 N 行 | `tmp/annotated-{start}-{N}.jsonl` |

### 2.2 汇报执行计划

在启动 subagent 之前，向用户汇报以下内容。汇报后直接继续，无需等待确认。

| 项目 | 值 |
|---|---|
| 总条目数 | `merged.jsonl` 行数 N |
| 标注模型 | `{site.pipeline.annotation.model}` |
| Batch 配置 | 每批 `{site.pipeline.annotation.batch_size}` 条 |
| Batch 总数 | M = ceil(N / batch_size) |
| 最大并发 | `{site.pipeline.annotation.max_concurrency}` |
| 执行轮数 | ceil(M / max_concurrency)，列出每轮 batch 分布 |
| 单 Batch 预估 token | 提示词字符数 + 输入数据行字符数 + 输出经验值（~800 字符/条 × batch_size） |
| 总预估 token | 单 Batch 预估 × M |
| 标注任务 | 分类（{site.categories} 共 X 类）+ 翻译目标语言 {site.translation.target_language} + 首页评分 + Feed 评分（{site.feeds} 共 X 个 feed） |

**Token 上限：** 标注阶段涉及大量 subagent 并发调用，每个 subagent 处理多条数据并输出结构化结果，单 batch 消耗可能很高。加上 subagent 可能在边缘 case 上反复推敲，存在 token 浪费和死循环风险。需设定上限兜底。

实现方式：检查当前 Agent 环境是否提供 token 预算机制（如 session 级上限、budget 参数等）。如有，将上限值与预估总消耗对比，超出则提示用户调整 `batch_size` 或 `max_concurrency`。如无内置机制，设定硬上限：单 batch 不超过 150K tokens。在构造 subagent 提示词时注入 `{token_limit}` 变量告知该上限。

### 2.3 并发调度

最多 `{site.pipeline.annotation.max_concurrency}` 个 subagent 并发。每个 subagent 分配一个 batch，传入以下参数替换提示词模板中的变量：

| 变量 | 来源 | 说明 |
|---|---|---|
| `{input_file_path}` | 运行时 | `anytrend-data/daily/<DATE>/merged.jsonl` |
| `{start_line}` | 运行时 | batch 起始行号（从 1 开始） |
| `{end_line}` | 运行时 | batch 结束行号（包含，不超过 N） |
| `{output_file_path}` | 运行时 | `anytrend-data/daily/<DATE>/tmp/annotated-{start}-{end}.jsonl` |
| `{site.categories}` | site.yaml | 全部分类（id / name / definition） |
| `{site.homepage.criteria}` | site.yaml | 首页打分标准 |
| `{site.feeds}` | site.yaml | 全部 feed 定义（id / title / criteria） |
| `{token_limit}` | 2.2 确定的预算上限 | 单 batch token 上限值 |

所有 subagent 通过 Agent 工具的 `model` 参数显式传入 `{site.pipeline.annotation.model}`。

如果 batch 总数超过 `{site.pipeline.annotation.max_concurrency}`，分轮执行：每轮最多 max_concurrency 个并发，等当前轮全部完成后再启动下一轮。

### 2.4 Subagent 提示词模板

以下为传给每个 subagent 的完整提示词。用 `~~~subagent` 围栏标记，你替换所有变量后原样传递。

~~~subagent
## 输入

处理 `{input_file_path}` 的第 `{start_line}` 行到第 `{end_line}` 行（包含两端）。该文件是 JSONL 格式，每行一个 JSON 对象。如果实际文件行数少于 `{end_line}`，处理到文件末尾即可。

## 输出

将结果写入 `{output_file_path}`。输出文件为 JSONL，每行对应输入的一行，顺序必须一致。每行格式：

```json
{
  "id": "baidu:realtime:1:某省高考分数线公布",
  "category_id": "society",
  "category_reason": "高考分数发布属于固定社会教育议题",
  "title": "某省高考分数线公布",
  "summary": "某省教育考试院公布今年高考一分一段表……",
  "homepage_score": 3,
  "homepage_reason": "高考放榜社会关注度高，但持续性和突破性有限",
  "feed_scores": {
    "ai": {"score": 1, "reason": "与 AI 无关"},
    "politics-economy": {"score": 2, "reason": "教育政策背景弱，主要是社会情绪话题"}
  }
}
```

> 示例中的 feed ID（ai、politics-economy）仅为示意。实际 feed 列表来自 site.yaml 配置，你需要为每个已配置的 feed 给出评分。

字段说明：

- `id`：从输入行原样复制，不可修改。
- `category_id`：从分类标准中选择唯一最贴切的一个。
- `category_reason`：一句话说明为什么选这个分类，不可写空话。
- `title` / `summary`：目标语言为 {site.translation.target_language}。原文已是目标语言则原样保留，否则翻译为自然流畅的目标语言。`summary` 为 null 时输出 null。
- `homepage_score`：1–5 整数。
- `homepage_reason`：一句话打分理由。
- `feed_scores`：对下面列出的每个 feed 分别给出 `score`（1–5 整数）和 `reason`。

## 分类标准

可选的 `category_id` 及对应定义如下。以内容主题为唯一依据，不要根据平台、情绪或标题党词汇分类。内容涉及多个领域时以核心议题为准，跨界的在 `category_reason` 中说明理由。

{site.categories}

## 打分标准

### 首页推荐潜力（homepage_score）

{site.homepage.criteria}

### 各 Feed 评分标准

{site.feeds}

## 重要约束

1. 只能处理 `{input_file_path}` 的第 `{start_line}` 行到第 `{end_line}` 行，不要处理整个文件。
2. `id` 必须原样保留，不能修改、不能省略。
3. 输出顺序必须和输入顺序完全一致。
4. 每个条目只能有一个 `category_id`。
5. 所有 `score` 必须是 1–5 的整数。
6. 所有 `reason` 必须具体，不能写"符合标准""内容相关"等空话。
7. 不要编造 `title` 或 `summary` 中没有的信息。
8. 输出文件必须是合法 JSONL，每行一个紧凑 JSON，不要加 Markdown 代码块或其他说明文字。
9. 使用 1–5 分绝对尺度，不要因为当前 batch 内部的好坏而刻意拔高或压低分数。
10. 控制输出长度：`category_reason` 和 `feed_scores.*.reason` 限制在 50 字以内；`homepage_reason` 限制在 60 字以内；`summary` 限制在 150 字以内。简要说明理由即可，下游只消费分数和分类，不消费大段文字。
11. 一次性读入全部条目后，在单次分析中完成所有标注判断，不要在对话中逐条输出每个条目的分析过程。直接产出最终的 JSONL 结果。
12. 有不确定的分类或评分时做出最优判断即可，不反复推敲。整个 batch 在 3 轮交互内完成（读入 → 分析标注 → 写入自检）。

## 代码要求

禁止手动逐行拼接 JSONL 字符串。

按以下方式生成输出文件：

1. 用代码读取 `{input_file_path}` 的指定行范围，解析为对象数组。
2. 在单次分析中对所有条目逐一判断标注字段：`category_id`、`category_reason`、翻译后的 `title`/`summary`、`homepage_score`、`homepage_reason`、`feed_scores`。禁止在对话中逐条展开分析，直接产出最终结果。
3. 将输入行的 `id` 与你的判断结果组合为一个输出对象。所有输出对象按输入顺序放入数组。
4. 执行下面的自检步骤。
5. 自检通过后，用 `JSON.stringify` 把数组序列化为合法 JSONL（每行一个紧凑 JSON）。
6. 用代码把 JSONL 内容一次性写入 `{output_file_path}`。如果文件已存在，直接覆盖。

你只需要构造新增的标注字段。`id` 从输入行原样复制，不需要重新构造 `merged.jsonl` 中的其他字段。

## 自检

在写入 `{output_file_path}` 之前，必须在同一脚本中对输出数组执行以下检查。所有检查通过后才可写入。

| # | 检查项 | 校验逻辑 |
|---|---|---|
| 1 | 行数一致 | `output.length === inputLines.length` |
| 2 | id 一致 | 逐行比对 `output[i].id === inputLines[i].id` |
| 3 | 顺序一致 | 输出数组顺序即输入顺序，禁止排序或打乱 |

任何检查失败，修复数据后重新检查，直到全部通过。三次迭代仍无法通过，返回失败。

格式校验（category_id 合法性、score 范围、feed 覆盖、reason 类型等）由后续 `anytrend daily-site aggregate` 命令完成，你不需要自己做。

## Token 限制

为防止标注过程消耗失控或陷入死循环，本次任务设 token 上限：{token_limit}。处理数据时控制分析粒度，不要逐条在对话中展开讨论。达到上限仍未完成时，输出当前已完成部分并说明未完成条目，标记为失败，不要无限重试。

## 返回要求

- 如果全部成功：返回"已完成"，简要说明处理过程中遇到的特殊情况（如某些条目 summary 为空、语言难以判断、分类边界模糊等）。
- 如果失败：返回"失败"，说明原因以及你已经尝试过的解决办法。
~~~

### 2.5 合并与过滤

所有 batch 完成后，你编写并执行一个 Node.js 脚本：

1. 扫描 `anytrend-data/daily/<DATE>/tmp/` 下所有 `annotated-*.jsonl` 文件。
2. 从文件名解析起始行号，按行号升序排序。
3. 逐文件读取，逐行解析 JSON。
4. 过滤：丢弃 `homepage_score === 1` 的条目。
5. 将保留的条目按顺序写入 `anytrend-data/daily/<DATE>/annotated.jsonl`（合法 JSONL，每行一个紧凑 JSON，无多余空行）。

### 2.6 合并检查

合并脚本中额外执行以下检查：

| # | 检查项 | 校验逻辑 |
|---|---|---|
| 1 | 总行数一致 | 合并后行数 == 各 batch 过滤前行数之和减去被过滤条目数 |
| 2 | 无重复 id | 所有 id 唯一，`new Set(ids).size === ids.length` |

任何检查失败，先排查对应 batch 文件是否出错，必要时重做该 batch。

id 合法性、JSON 格式等校验由后续 `anytrend daily-site aggregate` 命令完成。

### 2.7 抽样审查

合并检查通过后，你编写 Node.js 脚本从 `annotated.jsonl` 中随机抽取 5–10 条，逐条审查：

| 审查维度 | 看什么 |
|---|---|
| 分类合理性 | `category_id` 是否与内容主题匹配，`category_reason` 是否具体而非敷衍 |
| 翻译质量 | 英文源的 title/summary 中文翻译是否自然流畅、意思准确 |
| 打分一致性 | 相似条目是否给出相近分数；有无明显偏高/偏低 |
| 边界处理 | summary 为 null 是否正确处理；低分条目 reason 是否敷衍 |

审查结论：

- **偶发个例**：直接改动对应条目的字段，写回 `annotated.jsonl`。
- **系统性偏差**（如某个 batch 整体打分偏高/偏低 1 分以上）：标记该 batch，要求对应 subagent 全部重做。

### 2.8 清理

- 删除 `anytrend-data/daily/<DATE>/tmp/` 目录及其所有内容。
- 删除合并脚本和抽样脚本文件。

如果 `annotated.jsonl` 不存在或为空：停止并报告用户。

---

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

---

## 阶段 4：首页精选

你直接完成，不使用 subagent。

### 4.1 读取

编写 Node.js 脚本读取并解析 `anytrend-data/daily/<DATE>/homepage.json`，输出 `candidates` 数组长度和每个 candidate 的关键字段（item_id / title / category_id / score / reason），供你阅读判断。

### 4.2 精选

从 candidates 中精选 `{site.homepage.recommendation_count}` 条，按以下维度综合判断：

- **里程碑性**：今天有没有绕不开的重大事件（政策转向、重大产品发布、国际冲突升级等）。这类事件无论分类直接入选。
- **覆盖度**：日报读者期待全景视图，需横跨至少 3–4 个大类，避免首页全是单一分类。
- **中英平衡**：中文和英文来源大致均衡，不严重偏向单一语言。
- **信息密度**：优先选有具体事实、数据或明确行动的条目，不选泛泛的情绪化标题或纯观点输出。
- **时效性**：今天新热 > 昨天余温，优先选择今天新发生或今天才被广泛关注的事件。

排序规则：按推荐优先级排列，`order` 从 1 开始。候选不足 `{site.homepage.recommendation_count}` 条时保留全部，不编造。

### 4.3 撰写总结

用中文撰写 `summary`，200–400 字，冷静客观的新闻摘要风格，不加主观评论。结构：

- 先概括当日整体特征（1–2 句）。
- 再列出 3–5 个关键方向，每个方向用 1–2 句说明，严格基于精选的 N 条内容。
- 不编造任何精选条目中不存在的信息。

### 4.4 写回

编写 Node.js 脚本，按以下步骤修改 `homepage.json`：

1. `readFileSync` + `JSON.parse` 读取
2. 将 `data.candidates` 过滤为仅保留精选的 N 条（按 `item_id` 匹配）
3. 对保留的条目重新编号 `order`（从 1 开始）
4. 更新 `data.summary` 为撰写的总结文本
5. `JSON.stringify(data, null, 2)` 写回
6. 删除脚本

**禁止**：在脚本中逐字段硬编码 candidate 对象；手动拼接 JSON 字符串；用 Edit 工具修改。

---

## 阶段 5：Feed 精选

你直接完成，不使用 subagent。与首页精选串行执行。

### 5.1 读取

编写 Node.js 脚本读取并解析 `anytrend-data/daily/<DATE>/feeds.json`，输出每个 feed 的 `id`、`title`、`candidates` 数组长度及每个 candidate 的关键字段，供你阅读判断。

### 5.2 逐 Feed 精选

对 `feeds.json` 中的每个 feed（数量与顺序来自 `{site.feeds}`），从其 `candidates` 中精选最多该 feed 配置的 `recommendation_count` 条。

选稿标准参考该 feed 的 `criteria`。**不得依赖标注阶段的 `feed_scores` 分数**——用该 feed 自身的选稿眼光和 criteria 独立重新判断每条候选是否应该入选。

排序规则：按推荐优先级排列，`order` 从 1 开始。候选不足 recommendation_count 条时保留全部，不编造。

### 5.3 写回

编写 Node.js 脚本，按以下步骤修改 `feeds.json`：

1. `readFileSync` + `JSON.parse` 读取
2. 遍历 `data.feeds`，对每个 feed 将其 `candidates` 过滤为仅保留精选的条目（按 `item_id` 匹配）
3. 对每个 feed 保留的条目重新编号 `order`（从 1 开始）
4. `JSON.stringify(data, null, 2)` 写回
5. 删除脚本

**禁止**：在脚本中逐字段硬编码 candidate 对象；手动拼接 JSON 字符串；用 Edit 工具修改。

---

## 阶段 6：渲染站点

执行：

```bash
anytrend daily-site render --archive-date <DATE>
```

读取中间数据文件（`homepage.json`、`feeds.json`、`themes.json`、`sources.json`、`items.jsonl`），生成静态站点到 `anytrend-data/site/<DATE>/`。

如果渲染失败，检查 `homepage.json` 和 `feeds.json` 结构是否正确，修正后重试一次。若仍失败，报告用户。

---

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

---

## 完成汇报

成功后向用户汇报：

- 日期
- 采集概况（成功平台数 / 总平台数，列出失败平台）
- 标注条目数（`annotated.jsonl` 行数）
- 首页精选数量
- 各 feed 精选数量
- 站点输出路径（`anytrend-data/site/<DATE>/`）
