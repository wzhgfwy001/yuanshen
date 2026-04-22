"""
INKOS 5-Agent 工作流单元测试
测试各个节点和工作流的正确性
"""

import asyncio
import json
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch
import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest

from inkos_5agent import (
    RadarNode,
    ArchitectNode,
    WriterNode,
    AuditNode,
    ReviserNode,
    LoopEngine,
    LoopConfig,
    INKOS5AgentWorkflow
)
from engine import Node, NodeResult, Workflow


# ============================================================================
# RadarNode 测试
# ============================================================================

@pytest.mark.asyncio
async def test_radar_node_basic():
    """测试 RadarNode 基本功能"""
    # 创建节点
    radar = RadarNode(
        node_id="radar_test",
        api_key="test-key",
        model="test-model",
        config={
            "genre": "玄幻",
            "platform": "起点",
            "trend_keywords": ["修仙", "重生"]
        }
    )

    # 验证输入输出端口
    assert "genre" in radar.inputs
    assert "platform" in radar.inputs
    assert "market_report" in radar.outputs
    assert "reader_preferences" in radar.outputs

    print("✅ RadarNode 基本功能测试通过")


@pytest.mark.asyncio
async def test_radar_node_mock_execution():
    """测试 RadarNode 模拟执行"""
    radar = RadarNode(
        node_id="radar_test",
        api_key="test-key",
        model="test-model",
        config={"genre": "玄幻"}
    )

    # Mock call_llm 方法
    mock_response = json.dumps({
        "market_trends": ["修仙", "重生"],
        "reader_preferences": {"age_group": "18-35"},
        "story_direction": "修仙重生流",
        "competitors": [],
        "innovation_points": []
    }, ensure_ascii=False)

    radar.call_llm = AsyncMock(return_value=mock_response)

    # 执行节点
    result = await radar.execute()

    # 验证结果
    assert result.success is True
    assert "market_report" in result.data
    assert "reader_preferences" in result.data
    assert "story_direction" in result.data

    print("✅ RadarNode 模拟执行测试通过")


# ============================================================================
# ArchitectNode 测试
# ============================================================================

@pytest.mark.asyncio
async def test_architect_node_basic():
    """测试 ArchitectNode 基本功能"""
    architect = ArchitectNode(
        node_id="architect_test",
        api_key="test-key",
        model="test-model",
        config={
            "chapter_number": 1,
            "target_words": 3000
        }
    )

    # 验证输入输出端口
    assert "market_context" in architect.inputs
    assert "chapter_number" in architect.inputs
    assert "target_words" in architect.inputs
    assert "chapter_outline" in architect.outputs
    assert "scene_breakdown" in architect.outputs

    print("✅ ArchitectNode 基本功能测试通过")


@pytest.mark.asyncio
async def test_architect_node_mock_execution():
    """测试 ArchitectNode 模拟执行"""
    architect = ArchitectNode(
        node_id="architect_test",
        api_key="test-key",
        model="test-model",
        config={"chapter_number": 1}
    )

    # Mock call_llm 方法
    mock_response = json.dumps({
        "chapter_title": "第一章：觉醒",
        "chapter_goal": "主角觉醒系统",
        "scene_breakdown": [
            {"scene": "主角日常", "mood": "平静"},
            {"scene": "系统觉醒", "mood": "震撼"}
        ],
        "pacing_plan": {"start": "slow", "middle": "medium", "end": "fast"},
        "emotional_curve": ["平静", "紧张", "震撼"],
        "key_conflicts": []
    }, ensure_ascii=False)

    architect.call_llm = AsyncMock(return_value=mock_response)

    # 设置输入
    architect.set_input("market_context", {"trend": "修仙"})
    architect.set_input("chapter_number", 1)
    architect.set_input("target_words", 3000)

    # 执行节点
    result = await architect.execute()

    # 验证结果
    assert result.success is True
    assert "chapter_outline" in result.data
    assert "scene_breakdown" in result.data

    print("✅ ArchitectNode 模拟执行测试通过")


# ============================================================================
# WriterNode 测试
# ============================================================================

@pytest.mark.asyncio
async def test_writer_node_basic():
    """测试 WriterNode 基本功能"""
    writer = WriterNode(
        node_id="writer_test",
        api_key="test-key",
        model="test-model",
        config={
            "style": "immersive",
            "pacing": "balanced"
        }
    )

    # 验证输入输出端口
    assert "chapter_outline" in writer.inputs
    assert "truth_context" in writer.inputs
    assert "chapter_draft" in writer.outputs
    assert "state_update" in writer.outputs
    assert "word_count" in writer.outputs

    print("✅ WriterNode 基本功能测试通过")


@pytest.mark.asyncio
async def test_writer_node_mock_execution():
    """测试 WriterNode 模拟执行"""
    writer = WriterNode(
        node_id="writer_test",
        api_key="test-key",
        model="test-model",
        config={"style": "immersive"}
    )

    # Mock call_llm 方法
    def mock_call_llm_side_effect(prompt):
        if "创意写作" in prompt:
            return "这是一个示例章节内容..." * 50
        else:
            return json.dumps({
                "character_updates": {"主角": {"location": "新地点"}},
                "plot_progress": ["剧情推进"],
                "world_changes": [],
                "new_hooks": [],
                "resolved_hooks": []
            }, ensure_ascii=False)

    writer.call_llm = AsyncMock(side_effect=mock_call_llm_side_effect)

    # 设置输入
    writer.set_input("chapter_outline", {
        "chapter_title": "第一章",
        "chapter_goal": "目标"
    })
    writer.set_input("truth_context", {})

    # 执行节点
    result = await writer.execute()

    # 验证结果
    assert result.success is True
    assert "chapter_draft" in result.data
    assert "state_update" in result.data
    assert "word_count" in result.data

    print("✅ WriterNode 模拟执行测试通过")


# ============================================================================
# AuditNode 测试
# ============================================================================

@pytest.mark.asyncio
async def test_audit_node_basic():
    """测试 AuditNode 基本功能"""
    audit = AuditNode(
        node_id="audit_test",
        api_key="test-key",
        model="test-model",
        config={
            "strict_mode": True
        }
    )

    # 验证输入输出端口
    assert "chapter_content" in audit.inputs
    assert "current_state" in audit.inputs
    assert "audit_report" in audit.outputs
    assert "issues" in audit.outputs
    assert "critical_issues_count" in audit.outputs
    assert "passed" in audit.outputs

    print("✅ AuditNode 基本功能测试通过")


@pytest.mark.asyncio
async def test_audit_node_mock_execution():
    """测试 AuditNode 模拟执行"""
    audit = AuditNode(
        node_id="audit_test",
        api_key="test-key",
        model="test-model",
        config={"strict_mode": True}
    )

    # Mock call_llm 方法
    mock_response = json.dumps({
        "overall_score": 85,
        "dimension_scores": {},
        "issues": [
            {"dimension": "逻辑一致性", "description": "问题", "severity": "medium"}
        ],
        "critical_issues": [],
        "passed": True,
        "suggestions": ["建议1"]
    }, ensure_ascii=False)

    audit.call_llm = AsyncMock(return_value=mock_response)

    # 设置输入
    audit.set_input("chapter_content", "测试内容" * 100)
    audit.set_input("current_state", {})

    # 执行节点
    result = await audit.execute()

    # 验证结果
    assert result.success is True
    assert "audit_report" in result.data
    assert "critical_issues_count" in result.data
    assert "passed" in result.data

    print("✅ AuditNode 模拟执行测试通过")


@pytest.mark.asyncio
async def test_audit_node_with_critical_issues():
    """测试 AuditNode 检测关键问题"""
    audit = AuditNode(
        node_id="audit_test",
        api_key="test-key",
        model="test-model",
        config={"strict_mode": True}
    )

    # Mock call_llm 方法（返回有关键问题）
    mock_response = json.dumps({
        "overall_score": 60,
        "dimension_scores": {},
        "issues": [
            {"dimension": "逻辑一致性", "description": "严重问题", "severity": "high"},
            {"dimension": "角色行为", "description": "严重问题", "severity": "high"}
        ],
        "critical_issues": [
            {"dimension": "逻辑一致性", "description": "严重问题"},
            {"dimension": "角色行为", "description": "严重问题"}
        ],
        "passed": False,
        "suggestions": ["建议修复"]
    }, ensure_ascii=False)

    audit.call_llm = AsyncMock(return_value=mock_response)

    # 设置输入
    audit.set_input("chapter_content", "测试内容" * 100)
    audit.set_input("current_state", {})

    # 执行节点
    result = await audit.execute()

    # 验证结果
    assert result.success is True
    assert result.data["critical_issues_count"] == 2
    assert result.data["passed"] is False

    print("✅ AuditNode 关键问题检测测试通过")


# ============================================================================
# ReviserNode 测试
# ============================================================================

@pytest.mark.asyncio
async def test_revise_node_basic():
    """测试 ReviserNode 基本功能"""
    revise = ReviserNode(
        node_id="revise_test",
        api_key="test-key",
        model="test-model",
        config={
            "remove_ai_traces": True,
            "enhance_readability": True
        }
    )

    # 验证输入输出端口
    assert "audit_issues" in revise.inputs
    assert "original_content" in revise.inputs
    assert "final_chapter" in revise.outputs
    assert "revision_log" in revise.outputs

    print("✅ ReviserNode 基本功能测试通过")


@pytest.mark.asyncio
async def test_revise_node_mock_execution():
    """测试 ReviserNode 模拟执行"""
    revise = ReviserNode(
        node_id="revise_test",
        api_key="test-key",
        model="test-model",
        config={"remove_ai_traces": True}
    )

    # Mock call_llm 方法
    mock_response = json.dumps({
        "final_content": "修订后的内容..." * 50,
        "revision_log": ["修复问题1", "增强描写"],
        "changes_count": 2
    }, ensure_ascii=False)

    revise.call_llm = AsyncMock(return_value=mock_response)

    # 设置输入
    revise.set_input("audit_issues", {"issues": []})
    revise.set_input("original_content", "原始内容..." * 50)

    # 执行节点
    result = await revise.execute()

    # 验证结果
    assert result.success is True
    assert "final_chapter" in result.data
    assert "revision_log" in result.data
    assert "word_count" in result.data

    print("✅ ReviserNode 模拟执行测试通过")


# ============================================================================
# LoopEngine 测试
# ============================================================================

@pytest.mark.asyncio
async def test_loop_engine_basic():
    """测试 LoopEngine 基本功能"""
    # 创建工作流
    workflow = Workflow("test", "测试工作流")

    # 添加简单节点
    node1 = MagicMock()
    node1.node_id = "node1"
    node1.inputs = {}
    node1.outputs = {}
    node1.validate_inputs.return_value = True
    node1.execute.return_value = NodeResult(success=True, data={"value": 1})

    node2 = MagicMock()
    node2.node_id = "node2"
    node2.inputs = {}
    node2.outputs = {}
    node2.validate_inputs.return_value = True
    node2.execute.return_value = NodeResult(success=True, data={"value": 2})

    workflow.add_node(node1)
    workflow.add_node(node2)
    workflow.add_connection("node1", "output", "node2", "input")

    # 创建 LoopEngine
    loop_config = LoopConfig(
        enabled=True,
        loop_nodes=["node2"],
        max_iterations=2,
        exit_condition="value == 2"
    )

    engine = LoopEngine(workflow, loop_config)

    # 执行工作流
    result = await engine.execute()

    # 验证结果
    assert result["success"] is True

    print("✅ LoopEngine 基本功能测试通过")


# ============================================================================
# INKOS5AgentWorkflow 测试
# ============================================================================

def test_inkos_5agent_workflow_config_loading():
    """测试工作流配置加载"""
    # 创建测试配置文件
    test_config = {
        "workflow_id": "test_workflow",
        "name": "测试工作流",
        "nodes": [],
        "connections": []
    }

    config_path = Path(__file__).parent / "test_config.json"
    with open(config_path, 'w', encoding='utf-8') as f:
        json.dump(test_config, f, ensure_ascii=False)

    # 创建工作流实例
    workflow = INKOS5AgentWorkflow(
        config_path=str(config_path),
        api_key="test-key",
        model="test-model"
    )

    # 验证配置加载
    assert workflow.config["workflow_id"] == "test_workflow"
    assert workflow.config["name"] == "测试工作流"

    # 清理测试文件
    config_path.unlink()

    print("✅ INKOS5AgentWorkflow 配置加载测试通过")


def test_inkos_5agent_workflow_building():
    """测试工作流构建"""
    # 创建测试配置文件
    test_config = {
        "workflow_id": "test_workflow",
        "name": "测试工作流",
        "nodes": [
            {
                "id": "radar",
                "type": "RadarNode",
                "name": "雷达",
                "config": {}
            }
        ],
        "connections": [],
        "loop_config": {}
    }

    config_path = Path(__file__).parent / "test_config_build.json"
    with open(config_path, 'w', encoding='utf-8') as f:
        json.dump(test_config, f, ensure_ascii=False)

    # 创建工作流实例
    workflow = INKOS5AgentWorkflow(
        config_path=str(config_path),
        api_key="test-key",
        model="test-model"
    )

    # 验证工作流构建
    assert workflow.workflow is not None
    assert "radar" in workflow.workflow.nodes

    # 清理测试文件
    config_path.unlink()

    print("✅ INKOS5AgentWorkflow 工作流构建测试通过")


# ============================================================================
# 集成测试
# ============================================================================

@pytest.mark.asyncio
async def test_integration_full_workflow():
    """测试完整工作流集成（使用 Mock）"""
    # 创建工作流
    workflow = Workflow("integration_test", "集成测试工作流")

    # 创建 RadarNode
    radar = RadarNode(
        node_id="radar",
        api_key="test-key",
        model="test-model",
        config={"genre": "玄幻"}
    )

    async def mock_radar_llm(prompt):
        return json.dumps({
            "market_trends": ["修仙"],
            "reader_preferences": {"age_group": "18-35"},
            "story_direction": "修仙重生",
            "competitors": [],
            "innovation_points": []
        }, ensure_ascii=False)

    radar.call_llm = AsyncMock(side_effect=mock_radar_llm)

    # 创建 ArchitectNode
    architect = ArchitectNode(
        node_id="architect",
        api_key="test-key",
        model="test-model",
        config={"chapter_number": 1}
    )

    async def mock_architect_llm(prompt):
        return json.dumps({
            "chapter_title": "第一章",
            "chapter_goal": "目标",
            "scene_breakdown": [],
            "pacing_plan": {},
            "emotional_curve": [],
            "key_conflicts": []
        }, ensure_ascii=False)

    architect.call_llm = AsyncMock(side_effect=mock_architect_llm)

    # 添加节点和连接
    workflow.add_node(radar)
    workflow.add_node(architect)
    workflow.add_connection("radar", "market_report", "architect", "market_context")

    # 创建引擎并执行
    engine = LoopEngine(workflow, LoopConfig(enabled=False))
    result = await engine.execute()

    # 验证结果
    assert result["success"] is True
    assert "radar" in result["results"]
    assert "architect" in result["results"]

    print("✅ 集成测试通过")


# ============================================================================
# 运行所有测试
# ============================================================================

async def run_all_tests():
    """运行所有测试"""
    print("=" * 80)
    print("INKOS 5-Agent 工作流单元测试")
    print("=" * 80)
    print()

    # 运行测试
    tests = [
        ("RadarNode 基本功能", test_radar_node_basic),
        ("RadarNode 模拟执行", test_radar_node_mock_execution),
        ("ArchitectNode 基本功能", test_architect_node_basic),
        ("ArchitectNode 模拟执行", test_architect_node_mock_execution),
        ("WriterNode 基本功能", test_writer_node_basic),
        ("WriterNode 模拟执行", test_writer_node_mock_execution),
        ("AuditNode 基本功能", test_audit_node_basic),
        ("AuditNode 模拟执行", test_audit_node_mock_execution),
        ("AuditNode 关键问题检测", test_audit_node_with_critical_issues),
        ("ReviserNode 基本功能", test_revise_node_basic),
        ("ReviserNode 模拟执行", test_revise_node_mock_execution),
        ("LoopEngine 基本功能", test_loop_engine_basic),
        ("INKOS5AgentWorkflow 配置加载", test_inkos_5agent_workflow_config_loading),
        ("INKOS5AgentWorkflow 工作流构建", test_inkos_5agent_workflow_building),
        ("集成测试", test_integration_full_workflow)
    ]

    passed = 0
    failed = 0

    for test_name, test_func in tests:
        try:
            if asyncio.iscoroutinefunction(test_func):
                await test_func()
            else:
                test_func()
            passed += 1
        except Exception as e:
            print(f"❌ {test_name} 测试失败: {str(e)}")
            failed += 1

    print()
    print("=" * 80)
    print(f"测试结果: {passed} 通过, {failed} 失败")
    print("=" * 80)

    if failed == 0:
        print("✅ 所有测试通过！")
    else:
        print(f"⚠️  有 {failed} 个测试失败")


if __name__ == "__main__":
    asyncio.run(run_all_tests())
