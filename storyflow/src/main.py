"""
StoryFlow 主入口 - 增强版 v1.1.0
支持:
- 环境变量 API Key
- 多模型提供商
- 断点续传
- 结果缓存
"""

import os
import asyncio
import json
from engine import Workflow, Engine, ProviderFactory
from nodes import (
    WorldBuildingNode, CharacterNode, ChapterGenerationNode,
    SceneNode, DialogueNode, OutlineNode, ReviseNode, PlotNode,
    TextConcatNode, WordCountNode, NODE_REGISTRY
)


def get_api_key(provider: str = "minimax") -> str:
    """从环境变量获取API Key"""
    # 优先级: STORYFLOW_API_KEY > MINIMAX_API_KEY > 通义千问
    api_key = os.environ.get("STORYFLOW_API_KEY") or os.environ.get("MINIMAX_API_KEY")
    if not api_key:
        # 尝试通义千问
        api_key = os.environ.get("DASHSCOPE_API_KEY") or os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise ValueError(
            "请设置环境变量 STORYFLOW_API_KEY 或 MINIMAX_API_KEY\n"
            "Windows: set STORYFLOW_API_KEY=your-key\n"
            "Linux/Mac: export STORYFLOW_API_KEY=your-key"
        )
    return api_key


def create_workflow_from_config(config_path: str, provider=None) -> Workflow:
    """从配置文件创建工作流"""
    with open(config_path, 'r', encoding='utf-8') as f:
        config = json.load(f)
    
    workflow = Workflow(config["workflow_id"], config["name"])
    
    # 创建默认提供商
    if provider is None:
        api_key = get_api_key()
        provider_name = config.get("provider", "minimax")
        model = config.get("model", None)
        provider = ProviderFactory.create(provider_name, api_key, model)
    
    for node_config in config["nodes"]:
        node_id = node_config["node_id"]
        node_type = node_config["type"]
        
        if node_type in NODE_REGISTRY:
            node_class = NODE_REGISTRY[node_type]
            node = node_class(node_id, provider=provider)
            
            # 设置初始配置值
            if "config" in node_config:
                for key, value in node_config["config"].items():
                    if key in node.inputs:
                        node.set_input(key, value)
            
            workflow.add_node(node)
        else:
            raise ValueError(f"未知的节点类型: {node_type}, 可选: {list(NODE_REGISTRY.keys())}")
    
    # 添加连接
    for conn in config.get("connections", []):
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


def print_workflow_info(workflow: Workflow):
    """打印工作流信息"""
    print(f"✅ 工作流加载成功: {workflow.name}")
    print(f"   节点数量: {len(workflow.nodes)}")
    print(f"   连接数量: {len(workflow.connections)}")
    
    print("\n📊 工作流结构:")
    for node_id, node in workflow.nodes.items():
        print(f"   • {node.name} ({node_id})")
        print(f"     输入: {', '.join(node.inputs.keys())}")
        print(f"     输出: {', '.join(node.outputs.keys())}")
    
    print("\n🔗 连接关系:")
    for conn in workflow.connections.values():
        print(f"   • {conn['source_node']}.{conn['source_output']} → "
              f"{conn['target_node']}.{conn['target_input']}")


def print_execution_log(log: list):
    """打印执行日志"""
    print("\n📝 执行日志:")
    print("-" * 40)
    for log_entry in log:
        status = "✅ 成功" if log_entry["status"] == "success" else "❌ 失败"
        print(f"{status} - {log_entry['node_id']}")
        if log_entry.get("error"):
            print(f"   错误: {log_entry['error']}")


def print_results(workflow: Workflow, results: dict):
    """打印执行结果"""
    print("\n📊 执行结果:")
    print("-" * 40)
    for node_id, node_result in results.items():
        node = workflow.nodes[node_id]
        print(f"\n【{node.name}】")
        print("-" * 40)
        
        for output_name, output_value in node_result.items():
            if isinstance(output_value, int):
                print(f"📏 {output_name}: {output_value} 字")
            elif isinstance(output_value, list):
                print(f"📋 {output_name}: {len(output_value)} 项")
                for item in output_value[:5]:  # 最多显示5项
                    print(f"   - {item[:50]}...")
            elif isinstance(output_value, str) and len(output_value) > 200:
                print(f"📖 {output_name}:")
                print(f"   {output_value[:200]}...")
            else:
                print(f"✨ {output_name}: {output_value}")


async def main():
    """主函数"""
    print_separator()
    print("🚀 StoryFlow - 增强版 v1.1.0")
    print("   支持: 多模型 | 断点续传 | 结果缓存")
    print_separator()
    
    # 检查API Key
    try:
        api_key = get_api_key()
        # 显示API Key前4位
        masked_key = api_key[:4] + "****" + api_key[-4:] if len(api_key) > 8 else "****"
        print(f"🔑 API Key: {masked_key}")
    except ValueError as e:
        print(f"\n❌ {e}")
        return
    
    # 加载配置
    config_path = "workflow_config.json"
    
    if not os.path.exists(config_path):
        print(f"\n❌ 配置文件不存在: {config_path}")
        # 创建示例配置
        create_sample_config()
        config_path = "workflow_config_sample.json"
        print(f"📄 已创建示例配置: {config_path}")
    
    print(f"\n📄 加载工作流配置: {config_path}")
    
    try:
        # 创建提供商
        api_key = get_api_key()
        config = json.load(open(config_path, 'r', encoding='utf-8'))
        provider_name = config.get("provider", "minimax")
        model = config.get("model", None)
        provider = ProviderFactory.create(provider_name, api_key, model)
        
        # 创建工作流
        workflow = create_workflow_from_config(config_path, provider)
        print_workflow_info(workflow)
        
        # 执行选项
        use_cache = True
        enable_checkpoint = True
        
        print(f"\n⚙️ 执行选项: 缓存={use_cache}, 断点={enable_checkpoint}")
        
        # 执行工作流
        print_separator()
        print("⚙️ 开始执行工作流...")
        print_separator()
        
        engine = Engine(workflow, use_cache=use_cache, enable_checkpoint=enable_checkpoint)
        result = await engine.execute()
        
        # 打印结果
        print_execution_log(result["log"])
        print_results(workflow, result["results"])
        
        print_separator()
        print("🎉 工作流执行完成！")
        print_separator()
        
    except Exception as e:
        print(f"\n❌ 执行失败: {str(e)}")
        import traceback
        traceback.print_exc()


def create_sample_config():
    """创建示例配置"""
    sample_config = {
        "workflow_id": "novel_creation",
        "name": "小说创作工作流",
        "provider": "minimax",
        "model": "MiniMax-M2.7",
        "nodes": [
            {
                "node_id": "world_building",
                "type": "world_building",
                "config": {
                    "genre": "奇幻",
                    "theme": "魔法与冒险"
                }
            },
            {
                "node_id": "character",
                "type": "character",
                "config": {
                    "character_type": "主角"
                }
            },
            {
                "node_id": "chapter_1",
                "type": "chapter_generation",
                "config": {
                    "chapter_number": 1,
                    "chapter_title": "觉醒"
                }
            }
        ],
        "connections": [
            {
                "source_node": "world_building",
                "source_output": "world_description",
                "target_node": "character",
                "target_input": "world_description"
            },
            {
                "source_node": "world_building",
                "source_output": "magic_system",
                "target_node": "character",
                "target_input": "magic_system"
            },
            {
                "source_node": "character",
                "source_output": "character_profile",
                "target_node": "chapter_1",
                "target_input": "character_profile"
            },
            {
                "source_node": "world_building",
                "source_output": "world_description",
                "target_node": "chapter_1",
                "target_input": "world_description"
            }
        ]
    }
    
    with open("workflow_config_sample.json", 'w', encoding='utf-8') as f:
        json.dump(sample_config, f, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    asyncio.run(main())