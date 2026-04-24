# 自动技能创建器

**版本：** v1.0.0  
**功能：** 监控任务执行，自动创建可复用技能

---

## 工作原理

```
任务执行 → 类型识别 → 次数统计 → 达标时建议创建技能
```

---

## 内置任务类型

| 类型 | 触发关键词 | 创建阈值 |
|------|-----------|----------|
| writing-blog | 写博客、写文章、blog、article | 5次 |
| code-review | 代码审查、code review | 3次 |
| data-analysis | 数据分析、data analysis | 5次 |
| writing-report | 写报告、report | 5次 |
| market-research | 市场调研、市场分析 | 5次 |
| novel-creation | 写小说、小说创作 | 3次 |

---

## 接口使用

### 1. 记录任务执行

```javascript
const autoSkill = require('./auto-skill-creator.js');

// 识别任务类型
const taskType = autoSkill.analyzeTaskType('帮我写一篇技术博客');
if (taskType) {
  // 记录执行
  const result = autoSkill.recordTask(taskType);
  if (result.readyToCreate) {
    console.log('可以创建技能了！');
  }
}
```

### 2. 查看统计

```javascript
const stats = autoSkill.getTaskStats();
console.log(stats);
// 输出: { 'writing-blog': { count: 3, threshold: 5, progress: 60, created: false }, ... }
```

### 3. 获取待创建技能

```javascript
const pending = autoSkill.getPendingSkills();
if (pending.length > 0) {
  console.log('待创建技能:', pending);
}
```

### 4. 生成技能建议

```javascript
const suggestion = autoSkill.generateSkillSuggestion('writing-blog');
console.log(suggestion);
// 输出技能模板建议
```

---

## 自动化流程

### 完整循环

```
1. 用户执行任务
2. 阳神分析任务类型并记录
3. 达到阈值时提示可以创建技能
4. 调用 skill-creator 创建技能
5. 标记为已创建
```

### 配置存储

- 路径：`core/auto-skill-creator/config/auto-skill-creator.json`
- 内容：任务计数、已创建技能列表

---

## 与阳神的集成

阳神执行完任务后，自动调用：

```javascript
// 任务完成后
const taskType = autoSkill.analyzeTaskType(userInput);
if (taskType) {
  const result = autoSkill.recordTask(taskType);
  
  // 检查是否达到创建阈值
  if (result.readyToCreate) {
    // 询问用户是否创建技能
    // 或自动创建
  }
}
```

---

*v1.0.0 - 2026-04-11*
