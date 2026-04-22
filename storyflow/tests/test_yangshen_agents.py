#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""元神专业Agent协作测试 - 使用阳神系统"""

import sys
import io
import os

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

os.chdir(r'C:\Users\DELL\.openclaw\workspace\storyflow')
os.environ['STORYFLOW_API_KEY'] = 'sk-cp-3n-fXwqj0y26NQku29UDhAEXGVMxkY2DxcX7qxyaBpJOg5WPazgON6D2yaOE0-Q5bTuvyYzSpD6E8CbG2vm7orX-LuMxJGm_WKtZ5EBo6ws3kMS6VPrg8-o'

import asyncio

print("=" * 70)
print("元神专业Agent协作测试 - 阳神系统")
print("=" * 70)
print("\n测试目标：验证阳神系统能够协调多个专业Agent协作完成任务")
print("参与Agent：前端专家 | 后端专家 | 架构师 | 代码审查")

# Test 1: 模拟阳神系统协调多个专业Agent
print("\n" + "=" * 70)
print("[测试1] 阳神系统 - 任务规划")
print("=" * 70)

from engine import MiniMaxProvider

provider = MiniMaxProvider(os.environ['STORYFLOW_API_KEY'])

async def frontend_expert():
    """前端专家Agent - 生成前端架构"""
    system = "你是一位资深前端架构师，擅长React/Vue技术栈，设计高性能UI组件。"
    prompt = """为一个高考志愿填报系统设计前端架构：

要求：
1. 技术选型（React/Vue + 状态管理）
2. 组件结构
3. API对接方案
4. 性能优化策略

输出格式：JSON
"""
    return await provider.call(prompt, system)

async def backend_expert():
    """后端专家Agent - 生成后端架构"""
    system = "你是一位资深后端架构师，擅长Python/Django、数据库设计、API设计。"
    prompt = """为一个高考志愿填报系统设计后端架构：

要求：
1. 技术选型（Python/Django + MySQL）
2. 数据库设计
3. API设计（RESTful）
4. 安全策略

输出格式：JSON
"""
    return await provider.call(prompt, system)

async def architect_expert():
    """架构师Agent - 生成整体架构"""
    system = "你是一位系统架构师，擅长微服务架构、云原生设计。"
    prompt = """为一个高考志愿填报系统设计系统架构：

要求：
1. 系统架构图（文字描述）
2. 技术栈选型
3. 部署方案
4. 扩展性设计

输出格式：JSON
"""
    return await provider.call(prompt, system)

async def code_reviewer():
    """代码审查Agent - 审查代码质量"""
    system = "你是一位代码审查专家，擅长发现代码问题、提供改进建议。"
    code = """
def calculate_recommendation(score, ranking, preferences):
    # 简单推荐算法
    if score > 600:
        return ["清华", "北大", "复旦"]
    elif score > 500:
        return ["985高校", "211高校"]
    else:
        return ["普通本科"]
    """
    prompt = f"""审查以下Python代码，给出改进建议：

```{code}```

请检查：
1. 代码逻辑问题
2. 潜在bug
3. 性能问题
4. 安全漏洞
5. 代码风格

输出格式：JSON
"""
    return await provider.call(prompt, system)

async def test_professional_agents():
    """测试多个专业Agent并行协作"""
    
    print("\n启动阳神系统 - 召唤4个专业Agent...")
    
    # 并行执行4个专业Agent任务
    results = await asyncio.gather(
        frontend_expert(),
        backend_expert(),
        architect_expert(),
        code_reviewer(),
        return_exceptions=True
    )
    
    agent_names = ["前端专家", "后端专家", "架构师", "代码审查"]
    
    print("\n" + "=" * 70)
    print("[测试结果] 阳神系统Agent协作完成")
    print("=" * 70)
    
    for i, (name, result) in enumerate(zip(agent_names, results)):
        print(f"\n【{name}】")
        if isinstance(result, Exception):
            print(f"  状态: ❌ 失败")
            print(f"  错误: {type(result).__name__}: {str(result)[:100]}")
        else:
            print(f"  状态: ✅ 成功")
            content = result[:200] if len(result) > 200 else result
            print(f"  输出长度: {len(result)} 字符")
            print(f"  内容预览:\n{content[:150]}...")

    return results

# Test 2: 测试阳神系统任务分解
print("\n" + "=" * 70)
print("[测试2] 阳神系统 - 任务分解")
print("=" * 70)

async def yangshen_task_decomposer():
    """测试阳神系统的任务分解能力"""
    system = """你是一个任务分解专家（阳神系统核心模块）。
当收到复杂任务时，你负责将其分解为多个子任务，并分配给专业Agent。

输出格式：
{
    "main_task": "主任务描述",
    "sub_tasks": [
        {"agent": "Agent类型", "task": "子任务描述", "priority": 1-5}
    ],
    "dependencies": ["依赖关系"]
}
"""
    prompt = """分解以下任务：

任务：为一个高考志愿填报系统，完成从设计到开发的完整流程

需要考虑：
1. 前端界面设计
2. 后端API开发
3. 数据库设计
4. 算法推荐
5. 代码审查
6. 部署上线

请输出任务分解结果：
"""
    result = await provider.call(prompt, system)
    return result

# Run tests
async def main():
    # 测试1: 专业Agent并行协作
    await test_professional_agents()
    
    # 测试2: 阳神任务分解
    print("\n" + "=" * 70)
    result = await yangshen_task_decomposer()
    print("[任务分解结果]")
    print(result[:500] if len(result) > 500 else result)

asyncio.run(main())

print("\n" + "=" * 70)
print("✅ 元神专业Agent协作测试完成")
print("=" * 70)