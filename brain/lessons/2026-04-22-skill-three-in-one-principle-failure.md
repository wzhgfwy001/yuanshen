# 失败教训 - Skill开发三合一原则缺失

**时间：** 2026-04-22T13:00:00.000Z
**任务：** 借鉴DeerFlow优化元神系统核心模块
**任务类型：** skill_development

## 失败模式

skill_code_without_trigger + incomplete_integration + reminder_dependency

## 发生场景

skill_development DeerFlow 元神系统 模块优化 windows

## 根因

1. **只创建代码文件** - 为DeerFlow增强模块创建了deerflow_enhanced.js代码文件，但没有创建对应的触发机制文件
2. **忘记触发机制** - 创建完代码后，没有主动思考"对应的触发机制是什么"，需要用户提醒
3. **过度依赖用户提醒** - 用户提醒后才想起来要创建SKILL.md

## 影响范围 10/10 - 需要用户反复提醒才能完成基本任务

## 避免方式

每次创建新代码模块时，必须同时思考三个问题：
1. **代码在哪里** - .js文件路径
2. **功能是什么** - 具体能做什么
3. **怎么触发** - SKILL.md中的trigger条件

如果不确定触发条件是什么，说明这个模块可能不需要。

## 改进建议

创建新Skill的标准流程：
1. 确定功能目标和范围
2. 编写实际代码（5KB+）
3. 创建SKILL.md定义触发条件
4. 验证代码和触发条件都存在
5. 不要在trigger条件不明确时就创建代码

---
*手动记录 by 元神 - 2026-04-25*
