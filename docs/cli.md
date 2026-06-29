# CLI 命令参考

## 全局选项

以下选项可用于所有命令：

| 选项 | 说明 |
|---|---|
| `--quiet` | 静默模式，抑制每行调用进度（`doctor` 和 `sources list` 不受影响） |
| `--no-color` | 禁用彩色输出 |
| `--version` | 显示版本号 |
| `--help` | 显示全局帮助或指定命令的帮助 |

---

## `anytrend build` — 完整日报流水线

采集 + Normalize + 合并，等价于 `collect` + `normalize-batch` + `merge` 的顺序执行。

```bash
anytrend build [--archive-date <YYYY-MM-DD>] [--concurrency <n>] [--delay <ms>]
               [--skip-collect] [--skip-normalize] [--quiet] [--no-color]
```

| 选项 | 默认值 | 说明 |
|---|---|---|
| `--archive-date` | 今天 | 归档目录名和报告日期 |
| `--concurrency` | 8 | 最大并发调用数 |
| `--delay` | 1500 | 同平台调用间隔（毫秒） |
| `--skip-collect` | false | 跳过采集，仅执行 Normalize + Merge |
| `--skip-normalize` | false | 跳过 Normalize + Merge，仅采集 |

> `--archive-date` 只决定输出目录名，不会传给 WebSculpt 命令。

**输出文件：**

```
anytrend-data/daily/<DATE>/
├── merged.jsonl
├── meta.json
└── collection-report.json
```

---

## `anytrend collect` — 仅采集

只运行 WebSculpt 采集步骤，不执行 Normalize 和 Merge。

```bash
anytrend collect [--archive-date <YYYY-MM-DD>] [--concurrency <n>] [--delay <ms>] [--quiet]
```

| 选项 | 默认值 | 说明 |
|---|---|---|
| `--archive-date` | 今天 | 归档目录名 |
| `--concurrency` | 8 | 最大并发调用数 |
| `--delay` | 1500 | 同平台调用间隔（毫秒） |

---

## `anytrend normalize` — 单文件 Normalize

```bash
anytrend normalize --input <file> --output <file> [--quiet]
```

将单个 raw JSON 文件转换为 normalized 格式。输入输出均为文件路径。

---

## `anytrend normalize-batch` — 批量 Normalize

```bash
anytrend normalize-batch --input <dir> --output <dir> [--quiet]
```

将目录中所有 raw JSON 文件批量转换为 normalized 格式。`--input` 和 `--output` 均为目录路径。

如果某个文件失败，打印错误但继续处理其他文件。目录中所有文件都失败时退出码为 `1`。

---

## `anytrend merge` — 合并 Normalized 输出

```bash
anytrend merge --input <dir> --output <dir> [--quiet]
```

将 normalized 目录下所有文件合并，输出 `merged.jsonl`、`meta.json` 和 `collection-report.json`。

---

## `anytrend doctor` — 环境诊断

```bash
anytrend doctor [--no-color]
```

检查项目：
- Node.js 版本是否符合 `package.json` engines 要求
- WebSculpt CLI 是否安装及版本
- `COLLECT_PLAN` 中的全部命令是否已在 WebSculpt 注册
- `config/site.yaml` 是否存在于当前目录

全部通过时退出码为 `0`，任一失败为 `1`。

**典型用法：**

```bash
anytrend doctor && anytrend build
```

---

## `anytrend setup` — 初始化

```bash
anytrend setup [--dry-run] [--force]
```

| 选项 | 默认值 | 说明 |
|---|---|---|
| `--dry-run` | false | 预览要执行的操作，不实际写入 |
| `--force` | false | 覆盖已存在的 `config/site.yaml` |

执行两个操作：
1. 将 AnyTrend 内置的 27 条 WebSculpt 命令导入到本地命令库
2. 将默认 `config/site.yaml` 复制到当前目录

---

## `anytrend sources list` — 查看采集计划

```bash
anytrend sources list [--no-color]
```

以表格形式展示所有 55 个采集源，包含命令名、采集角度、是否需要浏览器/登录。

---

## `anytrend daily-site aggregate` — 生成站点中间数据

```bash
anytrend daily-site aggregate --archive-date <DATE> [--skip-validation]
```

| 选项 | 默认值 | 说明 |
|---|---|---|
| `--archive-date` | 今天 | 归档日期 |
| `--skip-validation` | false | 跳过 `annotated.jsonl` 格式校验 |

读取 `merged.jsonl` 与 `annotated.jsonl`，生成 5 个中间文件：

- `items.jsonl` — 合并标注后的全量条目
- `sources.json` — 按平台/视角分组索引
- `homepage.json` — 首页候选池
- `feeds.json` — 各 feed 候选池
- `themes.json` — 按分类分组

---

## `anytrend daily-site render` — 渲染静态站点

```bash
anytrend daily-site render --archive-date <DATE> [--output <dir>]
```

| 选项 | 默认值 | 说明 |
|---|---|---|
| `--archive-date` | 今天 | 归档日期 |
| `--output` | `anytrend-data/site` | 站点输出根目录 |

输出到 `anytrend-data/site/<DATE>/`：

- `index.html` — 今日日报首页
- `themes.html` — 分类浏览页
- `sources.html` — 平台榜单页
- `feeds.html` — AI 精选页
