"""
StoryFlow 主入口 - 演示工作流执行
"""

import asyncio
import json
from engine import Workflow, Engine
from nodes import WorldBuildingNode, CharacterNode, ChapterGenerationNode


# 配置
API_KEY = "sk-71dadf6736754521b01832e8c1963445"
MODEL = "modelstudio/qwen3.5-plus"


def create_workflow_from_config(config_path: str) -> Workflow:
    """从配置文件创建工作流"""
    with open(config_path, 'r', encoding='utf-8') as f:
        config = json.load(f)

    workflow = Workflow(config["workflow_id"], config["name"])

    # 创建节点
    node_registry = {
        "world_building": lambda node_id, config: WorldBuildingNode(
            node_id, API_KEY, MODEL
        ),
        "character": lambda node_id, config: CharacterNode(
            node_id, API_KEY, MODEL
        ),
        "chapter_generation": lambda node_id, config: ChapterGenerationNode(
            node_id, API_KEY, MODEL
        )
    }

    for node_config in config["nodes"]:
        node_id = node_config["node_id"]
        node_type = node_config["type"]

        if node_type in node_registry:
            node = node_registry[node_type](node_id, node_config["config"])

            # 设置初始配置值
            for key, value in node_config["config"].items():
                if key in node.inputs:
                    node.set_input(key, value)

            workflow.add_node(node)
        else:
            raise ValueError(f"未知的节点类型: {node_type}")

    # 添加连接
    for conn in config["connections"]:
        workflow.add_connection(
            conn["source_node"],
            conn["source_output"],
            conn["target_node"],
            conn["target_input"]
        )

    return workflow


def print_separator():
    """打印分隔线"""
    print("\n" + "=" * 80 + "\n")


async def main():
    """主函数"""
    print_separator()
    print("🚀 StoryFlow - 节点工作流引擎")
    print_separator()

    # 加载配置
    config_path = "workflow_config.json"
    print(f"📄 加载工作流配置: {config_path}")

    try:
        workflow = create_workflow_from_config(config_path)
        print(f"✅ 工作流加载成功: {workflow.name}")
        print(f"   节点数量: {len(workflow.nodes)}")
        print(f"   连接数量: {len(workflow.connections)}")

        # 打印工作流信息
        print("\n📊 工作流结构:")
        for node_id, node in workflow.nodes.items():
            print(f"   • {node.name} ({node_id})")
            print(f"     输入: {', '.join(node.inputs.keys())}")
            print(f"     输出: {', '.join(node.outputs.keys())}")

        print("\n🔗 连接关系:")
        for conn in workflow.connections:
            print(f"   • {conn['source_node']}.{conn['source_output']} → "
                  f"{conn['target_node']}.{conn['target_input']}")

        # 执行工作流
        print_separator()
        print("⚙️ 开始执行工作流...")
        print_separator()

        engine = Engine(workflow)
        result = await engine.execute()

        # 打印执行日志
        print_separator()
        print("📝 执行日志:")
        print_separator()

        for log_entry in result["log"]:
            status = "✅ 成功" if log_entry["status"] == "success" else "❌ 失败"
            print(f"{status} - {log_entry['node_id']}")
            if log_entry.get("error"):
                print(f"   错误: {log_entry['error']}")

        # 打印结果
        print_separator()
        print("📊 执行结果:")
        print_separator()

        for node_id, node_result in result["results"].items():
            node = workflow.nodes[node_id]
            print(f"\n【{node.name}】")
            print("-" * 40)

            for output_name, output_value in node_result.items():
                if output_name == "word_count":
                    print(f"📏 {output_name}: {output_value} 字")
                elif output_name == "chapter_content":
                    print(f"📖 {output_name}:\n{output_value}")
                else:
                    print(f"✨ {output_name}: {output_value}")

        print_separator()
        print("🎉 工作流执行完成！")
        print_separator()

    except Exception as e:
        print(f"\n❌ 执行失败: {str(e)}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())
