# Daily Site 中间数据格式规范

> 本文档定义 AnyTrend 多视图日报网站在"代码聚合阶段"产出的中间数据文件格式、数据关系，以及与前端页面展示的映射规则。
>
> 当前阶段目标：由代码基于 `merged.jsonl` 和 `annotated.jsonl` 聚合出 `items.jsonl`、`sources.json`、`homepage.json`、`feeds.json`、`themes.json`，为后续 AI 处理（撰写首页总结、精选 feeds 等）提供完整素材。

---

## 1. 数据文件总览

| 文件 | 格式 | 生成方式 | 作用 |
|---|---|---|---|
| `merged.jsonl` | JSONL | `anytrend build` 产出 | 全量原始 normalized 条目 |
| `annotated.jsonl` | JSONL | AI 标注产出 | AI 处理后的标题/摘要/分类/评分 |
| `items.jsonl` | JSONL | `anytrend daily-site aggregate` | 全量展示条目，合并原始字段与 AI 标注 |
| `sources.json` | JSON | `anytrend daily-site aggregate` | 按平台/视角分组索引 |
| `homepage.json` | JSON | `anytrend daily-site aggregate` | 首页候选池，供后续 AI 写总结与精选 |
| `feeds.json` | JSON | `anytrend daily-site aggregate` | 各 feed 候选池，供后续 AI 精选 |
| `themes.json` | JSON | `anytrend daily-site aggregate` | 按分类分组的 item 索引，用于 `themes.html` |

---

## 2. 数据流关系

```
merged.jsonl ──┐
               ├──► items.jsonl ──┬──► sources.json
annotated.jsonl┘                 ├──► homepage.json
                                 ├──► feeds.json
                                 └──► themes.json
```

### 2.1 阶段说明

1. **输入阶段**：`merged.jsonl` 提供原始榜单字段；`annotated.jsonl` 提供 AI 处理后的内容字段与评分。
2. **聚合阶段**：代码将两者 join 为 `items.jsonl`，再派生出 `sources.json`、`homepage.json`、`feeds.json`、`themes.json`。
3. **后续 AI 阶段**：基于 `homepage.json` / `feeds.json` 候选池撰写总结、精选推荐。

---

## 3. `items.jsonl`

全量条目文件，每行一个 JSON 对象。是其他所有数据文件的数据源。

### 3.1 字段

```json
{
  "id": "baidu:realtime:1:河南高考600分及以上37544人",
  "rank": 1,
  "title": "河南高考600分及以上37544人",
  "summary": "6月25日公布的2026年河南省高考……",
  "url": "https://www.baidu.com/s?wd=...",
  "heat": "780.9万",
  "heat_raw": 7808927,
  "tags": ["热"],
  "platform": "baidu",
  "angle": "百度实时热搜",
  "category_id": "society",
  "category_reason": "高考分数发布属于固定社会教育议题",
  "homepage_score": 3,
  "homepage_reason": "高考放榜社会关注度高，但持续性和突破性有限",
  "feed_scores": {
    "ai": {"score": 1, "reason": "与 AI 无关"},
    "politics-economy": {"score": 2, "reason": "教育政策背景弱，主要是社会情绪话题"}
  }
}
```

| 字段 | 来源 | 类型 | 说明 |
|---|---|---|---|
| `id` | `merged.jsonl` | string | 唯一标识 |
| `rank` | `merged.jsonl` | number | 榜单排名 |
| `title` | `annotated.jsonl` | string | AI 处理后的标题（目标语言） |
| `summary` | `annotated.jsonl` | string \| null | AI 处理后的摘要 |
| `url` | `merged.jsonl` | string | 原始链接 |
| `heat` | `merged.jsonl` | string | 热度文本 |
| `heat_raw` | `merged.jsonl` | number \| null | 热度数值 |
| `tags` | `merged.jsonl` | string[] | 平台原始标签 |
| `platform` | `merged.jsonl._source` | string | 平台标识 |
| `angle` | `merged.jsonl._source` | string | 榜单视角中文名 |
| `category_id` | `annotated.jsonl` | string | 分类 ID |
| `category_reason` | `annotated.jsonl` | string | 分类理由 |
| `homepage_score` | `annotated.jsonl` | number | 首页推荐分（1–5） |
| `homepage_reason` | `annotated.jsonl` | string | 首页打分理由 |
| `feed_scores` | `annotated.jsonl` | object | 各 feed 评分与理由 |

### 3.2 生成规则

- 以 `annotated.jsonl` 为主表，按 `id` 从 `merged.jsonl` 补充展示字段。
- 只保留 `annotated.jsonl` 中存在的条目（即已被 AI 成功标注的条目）。
- `platform` 与 `angle` 从 `merged.jsonl._source` 拉平到顶层。

---

## 4. `sources.json`

按平台与视角分组的索引文件，用于 `sources.html` 页面导航与展示。

### 4.1 格式

```json
{
  "platforms": [
    {
      "platform": "baidu",
      "angles": [
        {
          "angle": "百度实时热搜",
          "item_ids": [
            "baidu:realtime:1:河南高考600分及以上37544人",
            "baidu:realtime:2:不是日本相机坏了 是中国航母太快了"
          ]
        }
      ]
    }
  ]
}
```

### 4.2 生成规则

1. **platform 排序**：按 `src/config/collect-plan.ts` 中定义的平台顺序。
2. **angle 排序**：同一 platform 下，按 `collect-plan.ts` 中 angle 的定义顺序。
3. **item 排序**：按 `rank` 升序。
4. 若 `collect-plan.ts` 没有明确顺序，回退到 `merged.jsonl` 中首次出现的顺序。

---

## 5. `homepage.json`

首页候选池，供后续 AI 撰写今日总结并精选重点推荐。

### 5.1 格式

```json
{
  "summary": "",
  "candidates": [
    {
      "item_id": "baidu:realtime:8:阿里巴巴对美国国防部提起诉讼",
      "title": "阿里巴巴对美国国防部提起诉讼",
      "summary": "23日，阿里巴巴已正式对美国国防部提起诉讼……",
      "url": "https://www.baidu.com/s?wd=...",
      "heat": "713.6万",
      "platform": "baidu",
      "angle": "百度实时热搜",
      "category_id": "geopolitics",
      "score": 4,
      "reason": "中美科技与监管冲突的重要企业诉讼，影响跨境投资预期",
      "order": 1
    }
  ]
}
```

### 5.2 字段说明

| 字段 | 说明 |
|---|---|
| `summary` | 今日总结，当前留空，由后续 AI 填充 |
| `candidates` | 首页候选条目列表 |
| `candidates[].item_id` | 回查 `items.jsonl` 的 ID |
| `candidates[].title` / `summary` / `url` / `heat` | 展示所需字段 |
| `candidates[].platform` / `angle` / `category_id` | 来源与分类上下文 |
| `candidates[].score` | `homepage_score`，候选排序依据 |
| `candidates[].reason` | `homepage_reason`，AI 后续改写推荐理由的参考 |
| `candidates[].order` | 按分数排序后的展示顺序 |

### 5.3 生成规则

1. 从 `items.jsonl` 中按 `homepage_score` 降序排列。
2. 采用**自适应分数门槛**：
   - 目标数量 = `min(ceil(总数 × 20%), 50)`。
   - 先只取 `homepage_score >= 4` 的条目；若数量不足目标数，则逐步降到 `>=3`、`>=2`、`>=1`，直到满足目标数或已无更低门槛。
3. 在通过门槛的池子里按 `homepage_score` 降序、同分按 `heat_raw` 降序 → `rank` 升序 → `id` 字典序排列，取前 `目标数量` 条。
4. 每个候选冗余必要字段，使后续 AI 无需回头查 `items.jsonl`。
5. `config/site.yaml` 中的 `homepage.recommendation_count` 不在本阶段使用，留作后续 AI 精选时参考。

---

## 6. `feeds.json`

各 feed 视角的候选池，供后续 AI 基于 `config/site.yaml` 中定义的 feed 标准做进一步精选。

### 6.1 格式

```json
{
  "feeds": [
    {
      "id": "ai",
      "title": "AI 动态",
      "criteria": "聚焦人工智能领域的最新模型发布……",
      "candidates": [
        {
          "item_id": "hackernews:top:1:Unlimited OCR...",
          "title": "百度开源 Unlimited OCR，可一次性解析整本扫描书",
          "summary": "百度在 Hugging Face 发布 Unlimited OCR……",
          "url": "https://github.com/baidu/Unlimited-OCR",
          "heat": "445 points",
          "platform": "hackernews",
          "angle": "HackerNews Top by Points",
          "category_id": "ai",
          "score": 5,
          "reason": "核心 AI 开源模型发布",
          "order": 1
        }
      ]
    }
  ]
}
```

### 6.2 字段说明

| 字段 | 说明 |
|---|---|
| `feeds[].id` | feed 标识，来自 `config/site.yaml` |
| `feeds[].title` | feed 展示标题 |
| `feeds[].criteria` | feed 选稿标准，来自 `config/site.yaml` |
| `feeds[].candidates` | 该 feed 的候选条目列表 |
| `candidates[].score` | 该 item 在对应 feed 下的评分 |
| `candidates[].reason` | 该 item 在对应 feed 下的评分理由 |

### 6.3 生成规则

1. 遍历 `config/site.yaml` 中定义的每个 feed。
2. 对每个 feed，从 `items.jsonl` 的 `feed_scores.{feed_id}` 中按 `score` 降序排列。
3. 采用与 homepage 相同的**自适应分数门槛**：
   - 目标数量 = `min(ceil(该 feed 条目总数 × 20%), 50)`。
   - 先只取 `score >= 4` 的条目；不足则逐步降到 `>=3`、`>=2`、`>=1`。
4. 在通过门槛的池子里按 `score` 降序、同分按 `heat_raw` 降序 → `rank` 升序 → `id` 字典序排列，取前 `目标数量` 条。
5. 每个候选冗余必要字段，其中 `score` 和 `reason` 使用该 feed 对应的分数与理由。

---

## 7. `themes.json`

按分类分组的 item 索引文件，用于 `themes.html` 按分类浏览。

> 当前阶段不做跨平台事件聚类。同一分类下的 items 直接罗列，同一事件在多个平台出现时会分别展示。

### 7.1 格式

```json
{
  "categories": [
    {
      "category_id": "ai",
      "name": "AI",
      "order": 1,
      "item_ids": [
        "jiqizhixin:latest:1:豆包大模型2.1发布",
        "hackernews:top:1:Unlimited OCR..."
      ]
    },
    {
      "category_id": "tech",
      "name": "科技",
      "order": 2,
      "item_ids": [
        "juejin:hot:1:Android 17正式发布"
      ]
    }
  ]
}
```

### 7.2 字段说明

| 字段 | 说明 |
|---|---|
| `categories[].category_id` | 分类 ID，来自 `config/site.yaml` |
| `categories[].name` | 分类展示名称 |
| `categories[].order` | 分类排序，来自 `config/site.yaml` |
| `categories[].item_ids` | 该分类下的 item ID 列表 |

### 7.3 生成规则

1. 从 `items.jsonl` 中按 `category_id` 分组。
2. 每个分类下的 `item_ids` 按 `homepage_score` 降序 → `heat_raw` 降序 → `rank` 升序 → `id` 字典序排列。
3. 分类顺序、`name`、`order` 均来自 `config/site.yaml`。
4. 空分类（该日期下无 item）是否保留：建议保留，便于前端渲染稳定的分类导航。

---

## 8. 前端页面与数据映射

| 页面 | 主要数据 | 辅助数据 | 说明 |
|---|---|---|---|
| `index.html` | `homepage.json` | `items.jsonl` | 展示今日总结与重点候选，点击跳转详情 |
| `themes.html` | `themes.json` | `items.jsonl` | 按分类展示条目 |
| `sources.html` | `sources.json` | `items.jsonl` | 按平台/视角展示原始榜单条目 |
| `feeds.html` | `feeds.json` | `items.jsonl` | 按 feed 视角展示候选条目 |

---

## 9. 排序规则汇总

| 场景 | 规则 |
|---|---|
| `sources.json` 中 platform 顺序 | `collect-plan.ts` 定义顺序 |
| `sources.json` 中 angle 顺序 | 同 platform 下 `collect-plan.ts` 定义顺序 |
| `sources.json` 中 item 顺序 | 按 `rank` 升序 |
| `homepage.json` 候选排序 | `homepage_score` 降序；同分按 `heat_raw` 降序 → `rank` 升序 → `id` 升序；数量 = `min(ceil(总数 × 20%), 50)`，并优先取 `score >= 4` |
| `feeds.json` 候选排序 | `feed_scores.{feed_id}.score` 降序；同分按 `heat_raw` 降序 → `rank` 升序 → `id` 升序；数量规则同 homepage |
| `themes.json` 中 item 排序 | `homepage_score` 降序；同分按 `heat_raw` 降序 → `rank` 升序 → `id` 升序 |

---

## 10. 与后续 AI 处理的边界

| 文件 | 当前代码聚合产出 | 后续 AI 处理 |
|---|---|---|
| `items.jsonl` | 完整条目 | 无需进一步 AI 处理 |
| `sources.json` | 分组索引 | 无需 AI 处理 |
| `homepage.json` | `summary` 为空，`candidates` 按分数排序 | AI 填充 `summary`，并精选最终推荐 |
| `feeds.json` | 各 feed 候选池 | AI 基于 `criteria` 做最终精选与排序 |
| `themes.json` | 按分类分组的 item 索引 | 无需 AI 处理 |

---

> CLI 命令（`aggregate`、`render`）的完整参数与用法见 [`docs/cli.md`](cli.md)。

## 11. 相关文件

- `docs/site.md`：Daily Site 项目总览与当前状态。
- `config/site.yaml`：分类体系、feed 定义、首页推荐数量配置。
- `src/config/collect-plan.ts`：平台与视角的定义顺序。
- `src/lib/daily-site-aggregator.ts`：聚合命令的核心实现。
- `src/types/daily-site.ts`：中间数据 Zod schema 与 TypeScript 类型。
- `tests/integration/daily-site-aggregator.test.ts`：聚合器集成测试。
