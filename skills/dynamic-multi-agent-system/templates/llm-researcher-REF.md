# llm-researcher

**来源：** ClawHub - runshengdu/llm-researcher v1.0.5  
**说明：** 整理分析LLM相关论文与GitHub项目，追踪领域最新研究动态  
**许可证：** MIT-0

---

## 执行前置确认（必须）

1. 在按本skill开始任何步骤前，必须先询问用户：
   - 是否已在当前环境安装 Python，并说明用途：运行 `scripts/pdf_to_md.py` 将论文 PDF 转为 Markdown
   - 明确告知没有 Python 则无法按规范执行论文 PDF 解析
   - 可请用户安装 Python 后再继续，或在做降级处理

2. 询问用户对于每个数据源获取的条目数量

3. 询问用户调用脚本从PDF链接提取markdown是用哪个参数
   - `introduction`：仅返回严格匹配"# Introduction"一级标题的 Markdown 内容
   - `all`：返回整篇论文转换后的完整 Markdown 内容

4. 输出报告的语言

在未完成上述确认前，不要开始执行本 skill 的核心流程。

---

## 默认数据源

- **alphaxiv**
  - https://www.alphaxiv.org/?sort=Hot&interval=7+Days
  - https://www.alphaxiv.org/?source=GitHub&interval=7+Days&sort=Hot
- **GitHub Trending**
  - https://github.com/trending?since=weekly

如果用户没有指定数量，默认每个数据源最多提取10个条目。

---

## 工具使用优先级

1. **浏览器工具优先**：动态网页优先使用浏览器打开、滚动、点击和观察页面内容
2. **网页抓取工具次之**：如果浏览器无法稳定拿到内容
3. **网页转 Markdown 兜底**：使用 `https://r.jina.ai/example.com` 读取页面 Markdown
4. **以上都不可用**：跳过，在最终报告里写明原因

---

## 总体流程

### 阶段 1：发现条目并建立任务队列

- 对论文页面，优先从网页内容中拿到 `arXiv ID`
- 对GitHub项目，记录项目标题和仓库 URL
- 去重规则：
  - 论文优先按 `arXiv ID` 去重
  - GitHub 项目优先按仓库 URL 去重
  - 如果缺少唯一标识，再按标题去重
- 将待分析条目整理为任务队列

### 阶段 2：逐条执行任务

- 维护任务队列，顺序处理
- 每开始处理一个条目，先执行 `attempt += 1`
- 处理完成后，将结果写入成功或失败集合

---

## 分析结果格式

```json
{
  "id": "{序号}",
  "title": "{标题}",
  "url": "{URL}",
  "source": "{arxiv|github}",
  "arxivId": "{arXiv ID，如果是 GitHub 则为 null}",
  "category": "{类目名称}",
  "authors": "{作者或机构，未知可写 Unknown}",
  "analysis": "{用简单易懂的语言解释内容，越详细越好}",
  "status": "{done或failed，如果是failed需要列上原因}",
  "attempt": "{当前尝试次数}",
  "completedAt": "{ISO 时间戳}"
}
```

---

## 最终报告

输出最终 Markdown 报告到 `output` 文件夹，文件名格式为 `YYYYMMDDHHmm.md`。

最终报告必须包含：
- `# Report Summary`：至少包含 Total、Success、Failed、Retried Success
- `# Details`：必须按 category 聚合，每个分类下的条目至少包含 title、url、source、authors、analysis
- `# Trending`：总结本批论文和项目体现出的共同趋势、热门方向和潜在变化

---

## 注意事项

1. 单个任务失败不影响其他任务，继续推进剩余任务
2. 所有原始链接必须保留，便于最终报告追溯
3. 只有在最终 Markdown 报告成功写入后，才可以清理临时文件
