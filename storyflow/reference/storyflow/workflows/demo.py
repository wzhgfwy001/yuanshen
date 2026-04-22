"""
INKOS 5-Agent 工作流快速演示
无需 API Key 的简化演示
"""

import asyncio
import json
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from inkos_5agent import INKOS5AgentWorkflow
from engine import Workflow, Node, NodeResult


class MockRadarNode(Node):
    """模拟雷达节点"""

    def __init__(self, node_id: str):
        super().__init__(node_id, "市场趋势雷达")
        self.add_input("genre", "str", required=False, default="玄幻")
        self.add_output("market_report", "dict")
        self.add_output("reader_preferences", "dict")
        self.add_output("story_direction", "str")

    def execute(self) -> NodeResult:
        return NodeResult(
            success=True,
            data={
                "market_report": {
                    "market_trends": ["修仙", "重生", "系统流"],
                    "reader_preferences": {"age_group": "18-35", "gender": "male"},
                    "story_direction": "主角穿越修仙世界，获得神秘系统",
                    "competitors": ["凡人修仙传", "最强反派系统"],
                    "innovation_points": ["结合科技与修仙", "双主角设定"]
                },
                "reader_preferences": {"age_group": "18-35", "gender": "male"},
                "story_direction": "主角穿越修仙世界，获得神秘系统"
            }
        )


class MockArchitectNode(Node):
    """模拟建筑师节点"""

    def __init__(self, node_id: str):
        super().__init__(node_id, "章节结构建筑师")
        self.add_input("market_context", "dict", required=False, default={})
        self.add_output("chapter_outline", "dict")

    def execute(self) -> NodeResult:
        return NodeResult(
            success=True,
            data={
                "chapter_outline": {
                    "chapter_title": "第一章：穿越异界",
                    "chapter_goal": "主角穿越到修仙世界，觉醒系统",
                    "scene_breakdown": [
                        {"scene": "现代都市", "mood": "平静", "event": "主角平凡生活"},
                        {"scene": "意外穿越", "mood": "紧张", "event": "意外事故导致穿越"},
                        {"scene": "异界苏醒", "mood": "迷茫", "event": "在新世界醒来"},
                        {"scene": "系统觉醒", "mood": "震惊", "event": "神秘系统启动"}
                    ],
                    "pacing_plan": {"start": "slow", "middle": "medium", "end": "fast"},
                    "emotional_curve": ["平静", "紧张", "迷茫", "震撼"],
                    "key_conflicts": ["生存危机", "系统未知功能"]
                }
            }
        )


async def demo_mock_workflow():
    """使用 Mock 数据演示工作流"""
    print("=" * 80)
    print("INKOS 5-Agent 工作流演示（Mock 模式）")
    print("=" * 80)
    print()

    # 创建工作流
    workflow = Workflow("demo_workflow", "演示工作流")

    # 创建 RadarNode
    print("📡 步骤 1: RadarNode - 市场趋势分析")
    radar = MockRadarNode("radar")
    workflow.add_node(radar)

    # 创建 ArchitectNode
    print("🏗️  步骤 2: ArchitectNode - 章节结构规划")
    architect = MockArchitectNode("architect")
    workflow.add_node(architect)

    # 添加连接
    workflow.add_connection("radar", "market_report", "architect", "market_context")

    # 执行工作流
    print("\n🚀 开始执行工作流...\n")

    from inkos_5agent import LoopEngine, LoopConfig
    engine = LoopEngine(workflow, LoopConfig(enabled=False))

    try:
        result = await engine.execute()

        # 输出结果
        print("✅ 工作流执行完成！\n")
        print("=" * 80)
        print("执行结果:")
        print("=" * 80)

        for node_id, node_result in result["results"].items():
            print(f"\n📦 节点: {node_id}")

            if "market_report" in node_result:
                print(f"   市场趋势: {', '.join(node_result['market_report']['market_trends'][:3])}")
                print(f"   故事方向: {node_result['story_direction'][:30]}...")

            if "chapter_outline" in node_result:
                print(f"   章节标题: {node_result['chapter_outline']['chapter_title']}")
                print(f"   场景数量: {len(node_result['chapter_outline']['scene_breakdown'])}")

        print("\n" + "=" * 80)
        print("演示完成！")
        print("=" * 80)

    except Exception as e:
        print(f"❌ 执行失败: {str(e)}")
        import traceback
        traceback.print_exc()


async def demo_config_file():
    """演示从配置文件加载工作流"""
    print("\n" + "=" * 80)
    print("演示 2: 从配置文件加载工作流")
    print("=" * 80)
    print()

    config_path = Path(__file__).parent / "inkos_5agent_config.json"

    if not config_path.exists():
        print(f"❌ 配置文件不存在: {config_path}")
        return

    print(f"📄 配置文件: {config_path.name}")
    print(f"📋 工作流ID: inkos_5agent")
    print(f"📝 描述: INKOS 5-Agent 接力工作流")
    print(f"🔧 节点数量: 6")
    print(f"🔗 连接数量: 9")
    print(f"🔄 循环配置: 已启用（最大3次迭代）")

    # 读取配置
    with open(config_path, 'r', encoding='utf-8') as f:
        config = json.load(f)

    print("\n📊 节点列表:")
    for node in config["nodes"]:
        print(f"   - {node['id']}: {node['name']} ({node['type']})")

    print("\n🔗 数据流:")
    for conn in config["connections"][:5]:  # 只显示前5个连接
        print(f"   {conn['source']}.{conn['output']} → {conn['target']}.{conn['input']}")
    print(f"   ... 还有 {len(config['connections']) - 5} 个连接")

    print("\n✅ 配置文件解析成功！")


async def demo_api_usage():
    """演示 API 使用方法（不实际调用）"""
    print("\n" + "=" * 80)
    print("演示 3: API 使用方法")
    print("=" * 80)
    print()

    print("1️⃣  创建工作流实例:")
    print("""
    from inkos_5agent import INKOS5AgentWorkflow

    workflow = INKOS5AgentWorkflow(
        config_path="workflows/inkos_5agent_config.json",
        api_key="your-api-key-here",
        model="modelstudio/qwen3.5-plus"
    )
    """)

    print("2️⃣  执行工作流:")
    print("""
    result = await workflow.execute()
    """)

    print("3️⃣  获取结果:")
    print("""
    if result["success"]:
        print("工作流执行成功！")
        for node_id, node_result in result["results"].items():
            print(f"{node_id}: {node_result}")
    """)

    print("4️⃣  查看日志:")
    print("""
    for log in workflow.get_execution_log():
        print(f"{log['node_id']}: {log['status']}")
    """)

    print("\n✅ API 使用方法演示完成！")


async def main():
    """运行所有演示"""
    print("\n" + "=" * 80)
    print("🎭 INKOS 5-Agent 工作流 - 快速演示")
    print("=" * 80)
    print()
    print("这个演示展示了 INKOS 5-Agent 工作流的核心功能，")
    print("无需实际的 API Key 即可体验工作流流程。")
    print()

    await demo_mock_workflow()
    await demo_config_file()
    await demo_api_usage()

    print("\n" + "=" * 80)
    print("🎉 所有演示完成！")
    print("=" * 80)
    print()
    print("💡 提示：")
    print("   - 查看 workflows/examples.py 了解更多使用示例")
    print("   - 查看 workflows/README.md 了解详细文档")
    print("   - 配置 API Key 后可运行完整的工作流")
    print()


if __name__ == "__main__":
    asyncio.run(main())
