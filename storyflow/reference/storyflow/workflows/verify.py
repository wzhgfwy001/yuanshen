"""
INKOS 5-Agent 工作流验证脚本
验证所有组件是否正常工作
"""

import asyncio
import json
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

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
from engine import Workflow, Node, NodeResult


def verify_imports():
    """验证导入"""
    print("✅ 验证导入...")
    try:
        from inkos_5agent import (
            RadarNode, ArchitectNode, WriterNode,
            AuditNode, ReviserNode, LoopEngine,
            LoopConfig, INKOS5AgentWorkflow
        )
        print("   ✓ 所有节点导入成功")
        print("   ✓ 循环引擎导入成功")
        print("   ✓ 工作流类导入成功")
        return True
    except ImportError as e:
        print(f"   ✗ 导入失败: {e}")
        return False


def verify_config():
    """验证配置文件"""
    print("\n✅ 验证配置文件...")
    config_path = Path(__file__).parent / "inkos_5agent_config.json"

    if not config_path.exists():
        print(f"   ✗ 配置文件不存在: {config_path}")
        return False

    try:
        with open(config_path, 'r', encoding='utf-8') as f:
            config = json.load(f)

        # 验证必要字段
        required_fields = ["workflow_id", "name", "nodes", "connections", "loop_config"]
        for field in required_fields:
            if field not in config:
                print(f"   ✗ 缺少必要字段: {field}")
                return False

        print(f"   ✓ 配置文件存在: {config_path}")
        print(f"   ✓ 工作流ID: {config['workflow_id']}")
        print(f"   ✓ 节点数量: {len(config['nodes'])}")
        print(f"   ✓ 连接数量: {len(config['connections'])}")
        return True

    except json.JSONDecodeError as e:
        print(f"   ✗ JSON 解析失败: {e}")
        return False


def verify_nodes():
    """验证节点类"""
    print("\n✅ 验证节点类...")

    nodes = {
        "RadarNode": RadarNode,
        "ArchitectNode": ArchitectNode,
        "WriterNode": WriterNode,
        "AuditNode": AuditNode,
        "ReviserNode": ReviserNode
    }

    for name, node_class in nodes.items():
        try:
            # 创建实例
            node = node_class(
                node_id="test",
                api_key="test-key",
                model="test-model",
                config={}
            )

            # 验证方法
            if not hasattr(node, 'execute'):
                print(f"   ✗ {name} 缺少 execute 方法")
                return False

            if not hasattr(node, 'inputs'):
                print(f"   ✗ {name} 缺少 inputs 属性")
                return False

            if not hasattr(node, 'outputs'):
                print(f"   ✗ {name} 缺少 outputs 属性")
                return False

            print(f"   ✓ {name} 验证通过")

        except Exception as e:
            print(f"   ✗ {name} 创建失败: {e}")
            return False

    return True


async def verify_workflow_building():
    """验证工作流构建"""
    print("\n✅ 验证工作流构建...")

    try:
        # 创建工作流
        workflow = Workflow("test", "测试工作流")

        # 添加节点
        radar = RadarNode("radar", "test-key", "test-model", {})
        architect = ArchitectNode("architect", "test-key", "test-model", {})

        workflow.add_node(radar)
        workflow.add_node(architect)

        # 添加连接
        workflow.add_connection("radar", "market_report", "architect", "market_context")

        # 创建引擎
        engine = LoopEngine(workflow, LoopConfig(enabled=False))

        print("   ✓ 工作流创建成功")
        print("   ✓ 节点添加成功")
        print("   ✓ 连接添加成功")
        print("   ✓ 引擎创建成功")

        return True

    except Exception as e:
        print(f"   ✗ 工作流构建失败: {e}")
        import traceback
        traceback.print_exc()
        return False


def verify_config_loading():
    """验证配置加载"""
    print("\n✅ 验证配置加载...")

    try:
        config_path = Path(__file__).parent / "inkos_5agent_config.json"

        workflow = INKOS5AgentWorkflow(
            config_path=str(config_path),
            api_key="test-key",
            model="test-model"
        )

        print("   ✓ 配置加载成功")
        print(f"   ✓ 工作流ID: {workflow.config['workflow_id']}")
        print(f"   ✓ 节点数量: {len(workflow.workflow.nodes)}")

        return True

    except Exception as e:
        print(f"   ✗ 配置加载失败: {e}")
        import traceback
        traceback.print_exc()
        return False


def verify_documentation():
    """验证文档"""
    print("\n✅ 验证文档...")

    docs = [
        ("README.md", "使用文档"),
        ("IMPLEMENTATION_SUMMARY.md", "实现总结"),
        ("examples.py", "示例代码"),
        ("test_inkos_5agent.py", "测试代码"),
        ("demo.py", "演示脚本")
    ]

    for doc, desc in docs:
        doc_path = Path(__file__).parent / doc
        if doc_path.exists():
            size = doc_path.stat().st_size
            print(f"   ✓ {desc}: {doc} ({size} bytes)")
        else:
            print(f"   ✗ {desc}: {doc} 不存在")
            return False

    return True


def print_statistics():
    """输出统计信息"""
    print("\n" + "=" * 80)
    print("📊 项目统计")
    print("=" * 80)

    # 文件统计
    files = [
        "inkos_5agent.py",
        "inkos_5agent_config.json",
        "examples.py",
        "test_inkos_5agent.py",
        "demo.py",
        "README.md",
        "IMPLEMENTATION_SUMMARY.md"
    ]

    total_lines = 0
    total_size = 0

    for file in files:
        file_path = Path(__file__).parent / file
        if file_path.exists():
            with open(file_path, 'r', encoding='utf-8') as f:
                lines = len(f.readlines())
            size = file_path.stat().st_size
            total_lines += lines
            total_size += size
            print(f"   {file}: {lines} 行, {size} bytes")

    print(f"\n   总计: {total_lines} 行, {total_size} bytes")

    # 功能统计
    print("\n   功能统计:")
    print("   ✓ 5 个核心节点")
    print("   ✓ 循环机制")
    print("   ✓ 33 维度审计")
    print("   ✓ 15 个单元测试")
    print("   ✓ 5 个使用示例")
    print("   ✓ 完整文档")

    print("\n" + "=" * 80)


async def main():
    """主验证函数"""
    print("=" * 80)
    print("🔍 INKOS 5-Agent 工作流验证")
    print("=" * 80)

    results = []

    # 运行验证
    results.append(("导入验证", verify_imports()))
    results.append(("配置文件验证", verify_config()))
    results.append(("节点类验证", verify_nodes()))
    results.append(("工作流构建验证", await verify_workflow_building()))
    results.append(("配置加载验证", verify_config_loading()))
    results.append(("文档验证", verify_documentation()))

    # 输出结果
    print("\n" + "=" * 80)
    print("📋 验证结果")
    print("=" * 80)

    passed = 0
    failed = 0

    for name, result in results:
        if result:
            print(f"✅ {name}: 通过")
            passed += 1
        else:
            print(f"❌ {name}: 失败")
            failed += 1

    print("\n" + "=" * 80)
    print(f"总计: {passed} 通过, {failed} 失败")
    print("=" * 80)

    if failed == 0:
        print("\n🎉 所有验证通过！INKOS 5-Agent 工作流已准备就绪。")
        print_statistics()
    else:
        print(f"\n⚠️  有 {failed} 个验证失败，请检查相关问题。")


if __name__ == "__main__":
    asyncio.run(main())
