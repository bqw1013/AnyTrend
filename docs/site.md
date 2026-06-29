# Daily Site 项目总览

> 面向后续 AI 和开发者的项目上下文。涵盖目标、数据流、关键决策、文件索引。

## 1. 目标

把 AnyTrend 的日报输出升级为多视图静态日报网站：

| 页面 | 数据 | 视角 |
|---|---|---|
| `index.html` | `homepage.json` | AI 总结 + 重点推荐 |
| `themes.html` | `themes.json` | 按分类浏览 |
| `sources.html` | `sources.json` | 按平台/视角溯源 |
| `feeds.html` | `feeds.json` | AI 动态 + 政经观察 |

## 2. 当前状态

| 阶段 | 状态 |
|---|---|
| 数据采集 / Normalize / Merge | ✅ `anytrend build` |
| AI 标注 | ✅ `skills/anytrend-daily-site/SKILL.md` 阶段 2（subagent 并行） |
| 代码聚合 | ✅ `anytrend daily-site aggregate` |
| AI 精选（首页 + Feed） | ✅ `skills/anytrend-daily-site/SKILL.md` 阶段 4–5（主 agent） |
| 静态站点渲染 | ✅ `anytrend daily-site render` |

## 3. 数据流

```
merged.jsonl ──┐
               ├──► items.jsonl ──┬──► sources.json ──┐
annotated.jsonl┘                 ├──► homepage.json  │
                                  ├──► feeds.json    ├──► site/<date>/*.html
                                  └──► themes.json ──┘
```

| 文件 | 生成方 | 说明 |
|---|---|---|
| `merged.jsonl` | `anytrend build` | 全量原始条目 |
| `annotated.jsonl` | AI 标注 | 分类、翻译、评分 |
| `items.jsonl` | `anytrend daily-site aggregate` | 合并后的全量条目 |
| `sources.json` | 同上 | 按平台/视角分组索引 |
| `homepage.json` | 同上 | 首页候选池 + summary |
| `feeds.json` | 同上 | 各 feed 候选池 |
| `themes.json` | 同上 | 按分类分组索引 |

## 4. 关键决策

1. **不做跨平台事件聚类**：同一事件在多个平台出现时分别展示。
2. **候选池 + AI 精选**：代码生成候选池（自适应分数门槛），AI 做最终裁减和排序。
3. **不保留语言标记**：`title` / `summary` 已是 AI 处理后的目标语言版本。
4. **中间文件只存 `item_ids`**（`sources.json`、`themes.json`），详情去 `items.jsonl` 查。
5. **排序规则**：`sources.json` 按 `collect-plan.ts` 顺序 + rank 升序；其余按 score → heat_raw → rank → id。

## 5. 相关文件

| 文件 | 说明 |
|---|---|
| `config/site.yaml` | 分类体系、feed 定义、首页偏好 |
| `docs/site-schema.md` | 中间数据文件详细格式规范 |
| `docs/cli.md` | CLI 命令参考 |
| `skills/anytrend-daily-site/SKILL.md` | 端到端日报生成 Skill |
| `src/config/collect-plan.ts` | 采集源定义与顺序 |
| `src/lib/daily-site-aggregator.ts` | 聚合命令实现 |
| `src/lib/daily-site-renderer.ts` | 渲染命令实现 |
| `src/site-template/` | EJS 模板、CSS、客户端脚本 |
