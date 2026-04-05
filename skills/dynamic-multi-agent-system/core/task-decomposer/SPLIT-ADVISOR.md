# 任务拆分建议器 - 实现方案

**版本：** v1.0  
**实施时间：** 2026-04-04  
**优先级：** P1  
**状态：** 开发中

---

## 功能设计

### 1. 任务复杂度评估

```python
class TaskComplexityAnalyzer:
    """任务复杂度分析器"""
    
    def analyze(self, task_description: str) -> dict:
        """分析任务复杂度"""
        # 维度识别
        dimensions = self._identify_dimensions(task_description)
        
        # 复杂度计算
        complexity_score = len(dimensions) * self._calculate_dimension_complexity(dimensions)
        
        # 子 Agent 数量建议
        recommended_subagents = self._recommend_subagents(complexity_score)
        
        # 是否超限判断
        exceeds_limit = recommended_subagents > MAX_SUBAGENTS_PER_TASK
        
        return {
            "dimensions": dimensions,
            "complexity_score": complexity_score,
            "recommended_subagents": recommended_subagents,
            "exceeds_limit": exceeds_limit,
            "should_split": exceeds_limit
        }
    
    def _identify_dimensions(self, description: str) -> list:
        """识别任务维度"""
        dimension_keywords = {
            "创意写作": ["写", "创作", "小说", "文章"],
            "数据分析": ["分析", "数据", "报告", "统计"],
            "代码开发": ["开发", "代码", "程序", "应用"],
            "研究整理": ["研究", "整理", "收集", "信息"],
            "方案设计": ["设计", "方案", "规划", "计划"]
        }
        
        dimensions = []
        for dimension, keywords in dimension_keywords.items():
            if any(keyword in description for keyword in keywords):
                dimensions.append(dimension)
        
        return dimensions if dimensions else ["通用任务"]
    
    def _recommend_subagents(self, complexity_score: int) -> int:
        """推荐子 Agent 数量"""
        if complexity_score <= 2:
            return 1
        elif complexity_score <= 4:
            return 2
        elif complexity_score <= 6:
            return 3
        elif complexity_score <= 8:
            return 4
        elif complexity_score <= 10:
            return 5
        else:
            return 6  # 不超过上限
```

### 2. 任务拆分建议

```python
class TaskSplitAdvisor:
    """任务拆分建议器"""
    
    def generate_split_plan(self, task: dict) -> dict:
        """生成拆分计划"""
        if not task["exceeds_limit"]:
            return {"should_split": False}
        
        # 分析任务维度
        dimensions = task["dimensions"]
        
        # 生成拆分方案
        split_plan = {
            "should_split": True,
            "reason": f"任务复杂度较高，建议拆分为 {len(dimensions)} 个子任务",
            "subtasks": []
        }
        
        # 按维度拆分
        for i, dimension in enumerate(dimensions):
            subtask = {
                "id": i + 1,
                "name": f"{dimension}子任务",
                "description": f"负责{dimension}部分",
                "estimated_subagents": min(6, task["recommended_subagents"] // len(dimensions)),
                "dependencies": [] if i == 0 else [i]  # 简单串行依赖
            }
            split_plan["subtasks"].append(subtask)
        
        # 提供执行建议
        split_plan["execution_strategy"] = self._generate_execution_strategy(split_plan)
        
        return split_plan
    
    def _generate_execution_strategy(self, split_plan: dict) -> str:
        """生成执行策略"""
        num_subtasks = len(split_plan["subtasks"])
        
        if num_subtasks <= 2:
            return "建议串行执行，先完成任务 1，再完成任务 2"
        elif num_subtasks <= 4:
            return "建议分组并行执行：任务 1-2 并行，任务 3-4 并行"
        else:
            return "建议分批执行：第一批任务 1-3 并行，第二批任务 4-6 并行"
```

### 3. 用户提示界面

```python
def show_split_suggestion(task: dict):
    """显示拆分建议（用户界面）"""
    if not task["should_split"]:
        print("✅ 任务复杂度适中，无需拆分")
        return
    
    print(f"""
⚠️ 任务复杂度较高，建议拆分

📊 分析结果：
   - 任务维度：{', '.join(task['dimensions'])}
   - 复杂度评分：{task['complexity_score']}
   - 推荐子 Agent 数：{task['recommended_subagents']}（上限：6）

💡 拆分建议：
   建议拆分为 {len(task['dimensions'])} 个子任务：
""")
    
    for subtask in task["subtasks"]:
        print(f"   {subtask['id']}. {subtask['name']} - 需要{subtask['estimated_subagents']}个子 Agent")
    
    print(f"""
📋 执行策略：
   {task['execution_strategy']}

❓ 您希望：
   1. 自动拆分为多个任务
   2. 手动调整拆分方案
   3. 不拆分，继续执行（可能影响性能）
""")
```

---

## 使用示例

### 示例 1：简单任务（无需拆分）

**输入：**
```
"写一篇 800 字的科幻小说"
```

**分析结果：**
```json
{
  "dimensions": ["创意写作"],
  "complexity_score": 2,
  "recommended_subagents": 2,
  "exceeds_limit": false,
  "should_split": false
}
```

**提示：** ✅ 任务复杂度适中，无需拆分

---

### 示例 2：复杂任务（需要拆分）

**输入：**
```
"为一家 50 人的科技公司设计完整的管理体系，包括组织架构、决策流程、激励机制、远程办公政策、弹性工作制、实施路线图、风险评估"
```

**分析结果：**
```json
{
  "dimensions": ["方案设计", "研究整理"],
  "complexity_score": 10,
  "recommended_subagents": 6,
  "exceeds_limit": false,
  "should_split": false
}
```

**提示：** ✅ 任务复杂度适中，可以执行

---

### 示例 3：超限任务（建议拆分）

**输入：**
```
"开发一个完整的电商平台，包括前端 UI 设计、后端 API 开发、数据库设计、支付系统集成、物流系统集成、用户认证系统、订单管理系统、库存管理系统、数据分析系统、客服系统"
```

**分析结果：**
```json
{
  "dimensions": ["代码开发", "方案设计", "数据分析"],
  "complexity_score": 15,
  "recommended_subagents": 10,
  "exceeds_limit": true,
  "should_split": true,
  "subtasks": [
    {"id": 1, "name": "代码开发子任务", "estimated_subagents": 3},
    {"id": 2, "name": "方案设计子任务", "estimated_subagents": 3},
    {"id": 3, "name": "数据分析子任务", "estimated_subagents": 3}
  ]
}
```

**提示：**
```
⚠️ 任务复杂度较高，建议拆分

建议拆分为 3 个子任务：
   1. 代码开发子任务 - 需要 3 个子 Agent
   2. 方案设计子任务 - 需要 3 个子 Agent
   3. 数据分析子任务 - 需要 3 个子 Agent

执行策略：
   建议分批执行：第一批任务 1-3 并行，第二批任务 4-6 并行
```

---

## 实施计划

### 阶段 1：核心算法（1 天）
- [ ] 实现复杂度分析器
- [ ] 实现维度识别
- [ ] 实现子 Agent 推荐算法

### 阶段 2：拆分建议（1 天）
- [ ] 实现拆分计划生成
- [ ] 实现执行策略生成
- [ ] 实现用户提示界面

### 阶段 3：集成测试（1 天）
- [ ] 单元测试
- [ ] 集成测试
- [ ] 用户测试

---

## 配置文件

```json
{
  "task_split": {
    "enabled": true,
    "max_subagents_per_task": 6,
    "complexity_thresholds": {
      "low": 2,
      "medium": 4,
      "high": 6,
      "very_high": 8,
      "extreme": 10
    },
    "auto_split": false,
    "show_suggestion": true
  }
}
```

---

*任务拆分建议器实现方案 v1.0*  
*创建时间：2026-04-04 23:15*
