"""
INKOS 5-Agent 工作流使用示例
演示如何创建、配置和执行完整的小说创作管线
"""

import asyncio
import json
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from inkos_5agent import INKOS5AgentWorkflow


async def example_1_basic_workflow():
    """
    示例1: 基础工作流执行
    使用默认配置执行完整的 5-Agent 工作流
    """
    print("=" * 80)
    print("示例1: 基础工作流执行")
    print("=" * 80)

    # 配置 API Key（请替换为实际的 API Key）
    API_KEY = "your-api-key-here"
    MODEL = "modelstudio/qwen3.5-plus"

    # 加载工作流配置
    config_path = Path(__file__).parent / "inkos_5agent_config.json"

    # 创建工作流实例
    workflow = INKOS5AgentWorkflow(
        config_path=str(config_path),
        api_key=API_KEY,
        model=MODEL
    )

    # 执行工作流
    print("\n🚀 开始执行 5-Agent 工作流...\n")
    result = await workflow.execute()

    # 输出结果
    print("\n✅ 工作流执行完成！\n")
    print("=" * 80)
    print("执行结果:")
    print("=" * 80)

    for node_id, node_result in result["results"].items():
        print(f"\n📦 节点: {node_id}")
        print(f"   状态: {'成功' if result['success'] else '失败'}")

        # 输出关键结果
        if "market_report" in node_result:
            print(f"   市场报告: {json.dumps(node_result['market_report'], ensure_ascii=False)[:200]}...")
        if "chapter_outline" in node_result:
            print(f"   章节大纲: {node_result['chapter_outline'].get('chapter_title', 'N/A')}")
        if "chapter_draft" in node_result:
            print(f"   章节草稿: {len(node_result['chapter_draft'])} 字")
        if "critical_issues_count" in node_result:
            print(f"   关键问题数: {node_result['critical_issues_count']}")
        if "final_chapter" in node_result:
            print(f"   最终章节: {len(node_result['final_chapter'])} 字")

    # 输出执行日志
    print("\n" + "=" * 80)
    print("执行日志:")
    print("=" * 80)

    for log_entry in workflow.get_execution_log():
        node_id = log_entry.get("node_id", "unknown")
        status = log_entry.get("status", "unknown")
        iteration = log_entry.get("iteration", 0)
        error = log_entry.get("error", "")

        if iteration > 0:
            print(f"\n🔄 迭代 {iteration}: {node_id} - {status}")
        else:
            print(f"\n📌 {node_id} - {status}")

        if error:
            print(f"   ❌ 错误: {error}")


async def example_2_custom_config():
    """
    示例2: 自定义配置
    修改工作流配置，自定义节点参数
    """
    print("\n" + "=" * 80)
    print("示例2: 自定义配置")
    print("=" * 80)

    # 自定义配置
    custom_config = {
        "workflow_id": "inkos_5agent_custom",
        "name": "INKOS 5-Agent 接力工作流（自定义）",
        "description": "自定义小说创作管线",
        "nodes": [
            {
                "id": "radar",
                "type": "RadarNode",
                "name": "市场趋势雷达",
                "config": {
                    "genre": "都市",
                    "platform": "起点",
                    "trend_keywords": ["重生", "商战", "科技"]
                }
            },
            {
                "id": "architect",
                "type": "ArchitectNode",
                "name": "章节结构建筑师",
                "config": {
                    "chapter_number": 2,
                    "target_words": 5000
                }
            },
            {
                "id": "writer",
                "type": "WriterNode",
                "name": "章节写手",
                "config": {
                    "style": "fast-paced",
                    "pacing": "fast"
                }
            },
            {
                "id": "audit",
                "type": "AuditNode",
                "name": "33维度审计员",
                "config": {
                    "strict_mode": False,
                    "critical_dimensions": ["逻辑一致性", "角色行为"]
                }
            },
            {
                "id": "revise",
                "type": "ReviserNode",
                "name": "智能修订者",
                "config": {
                    "remove_ai_traces": True,
                    "enhance_readability": True
                }
            }
        ],
        "connections": [
            {
                "source": "radar",
                "output": "market_report",
                "target": "architect",
                "input": "market_context"
            },
            {
                "source": "architect",
                "output": "chapter_outline",
                "target": "writer",
                "input": "chapter_outline"
            },
            {
                "source": "writer",
                "output": "chapter_draft",
                "target": "audit",
                "input": "chapter_content"
            },
            {
                "source": "audit",
                "output": "audit_report",
                "target": "revise",
                "input": "audit_issues"
            },
            {
                "source": "writer",
                "output": "chapter_draft",
                "target": "revise",
                "input": "original_content"
            }
        ],
        "loop_config": {
            "enabled": True,
            "loop_nodes": ["revise", "audit"],
            "max_iterations": 2,
            "exit_condition": "critical_issues_count == 0"
        }
    }

    # 保存自定义配置
    custom_config_path = Path(__file__).parent / "inkos_5agent_custom.json"
    with open(custom_config_path, 'w', encoding='utf-8') as f:
        json.dump(custom_config, f, ensure_ascii=False, indent=2)

    print(f"\n✅ 自定义配置已保存到: {custom_config_path}")
    print(f"   题材: {custom_config['nodes'][0]['config']['genre']}")
    print(f"   章节数: {custom_config['nodes'][1]['config']['chapter_number']}")
    print(f"   目标字数: {custom_config['nodes'][1]['config']['target_words']}")
    print(f"   写作风格: {custom_config['nodes'][2]['config']['style']}")
    print(f"   最大迭代次数: {custom_config['loop_config']['max_iterations']}")


async def example_3_single_node():
    """
    示例3: 单独使用某个节点
    例如单独使用 RadarNode 进行市场分析
    """
    print("\n" + "=" * 80)
    print("示例3: 单独使用节点")
    print("=" * 80)

    from inkos_5agent import RadarNode

    API_KEY = "your-api-key-here"
    MODEL = "modelstudio/qwen3.5-plus"

    # 创建 RadarNode
    radar = RadarNode(
        node_id="radar_test",
        api_key=API_KEY,
        model=MODEL,
        config={
            "genre": "科幻",
            "platform": "起点",
            "trend_keywords": ["星际", "机甲", "进化"]
        }
    )

    # 设置输入
    radar.set_input("genre", "科幻")
    radar.set_input("platform", "起点")
    radar.set_input("trend_keywords", ["星际", "机甲", "进化"])

    # 执行节点
    print("\n🔍 执行市场趋势分析...\n")
    result = await radar.execute()

    # 输出结果
    print("\n✅ 分析完成！\n")
    print("=" * 80)
    print("市场分析结果:")
    print("=" * 80)
    print(json.dumps(result.data, ensure_ascii=False, indent=2))


async def example_4_loop_demonstration():
    """
    示例4: 循环机制演示
    展示如何审计不通过时自动进入"修订 → 再审计"循环
    """
    print("\n" + "=" * 80)
    print("示例4: 循环机制演示")
    print("=" * 80)

    print("\n🔄 循环机制说明:")
    print("   1. WriterNode 生成章节草稿")
    print("   2. AuditNode 进行33维度审计")
    print("   3. 如果 critical_issues_count > 0：")
    print("      - ReviserNode 修复问题")
    print("      - AuditNode 重新审计")
    print("      - 循环直到 critical_issues_count == 0 或达到最大迭代次数")
    print("   4. 输出最终章节")

    print("\n⚙️  循环配置:")
    print("   - 循环节点: [revise, audit]")
    print("   - 最大迭代次数: 3")
    print("   - 退出条件: critical_issues_count == 0")

    print("\n📊 执行流程示例:")
    print("   迭代 1:")
    print("     - audit: critical_issues_count = 5")
    print("     - revise: 修复问题")
    print("   迭代 2:")
    print("     - audit: critical_issues_count = 2")
    print("     - revise: 继续修复")
    print("   迭代 3:")
    print("     - audit: critical_issues_count = 0")
    print("     - ✅ 退出循环，输出最终章节")


async def example_5_save_results():
    """
    示例5: 保存结果到文件
    将工作流执行结果保存到本地文件
    """
    print("\n" + "=" * 80)
    print("示例5: 保存结果到文件")
    print("=" * 80)

    # 模拟工作流结果
    mock_result = {
        "workflow_id": "inkos_5agent",
        "success": True,
        "results": {
            "radar": {
                "market_report": {
                    "market_trends": ["修仙", "重生", "系统"],
                    "reader_preferences": {"age_group": "18-35"},
                    "story_direction": "主角获得系统，修仙重生"
                }
            },
            "architect": {
                "chapter_outline": {
                    "chapter_title": "第一章：觉醒",
                    "chapter_goal": "主角觉醒系统",
                    "scene_breakdown": [
                        {"scene": "主角日常", "mood": "平静"},
                        {"scene": "意外事件", "mood": "紧张"},
                        {"scene": "系统觉醒", "mood": "震撼"}
                    ]
                }
            },
            "writer": {
                "chapter_draft": "这是一个示例章节内容..." * 100,
                "word_count": 2500
            },
            "audit": {
                "critical_issues_count": 2,
                "overall_score": 75,
                "passed": False
            },
            "revise": {
                "final_chapter": "这是修订后的章节内容..." * 100,
                "word_count": 2800,
                "revision_log": ["修复了逻辑问题", "增强了描写"]
            }
        }
    }

    # 保存结果
    output_dir = Path(__file__).parent / "outputs"
    output_dir.mkdir(exist_ok=True)

    # 保存完整结果
    result_path = output_dir / "workflow_result.json"
    with open(result_path, 'w', encoding='utf-8') as f:
        json.dump(mock_result, f, ensure_ascii=False, indent=2)

    # 保存章节草稿
    chapter_path = output_dir / "chapter_final.txt"
    with open(chapter_path, 'w', encoding='utf-8') as f:
        f.write(mock_result["results"]["revise"]["final_chapter"])

    # 保存大纲
    outline_path = output_dir / "chapter_outline.json"
    with open(outline_path, 'w', encoding='utf-8') as f:
        json.dump(mock_result["results"]["architect"]["chapter_outline"], f, ensure_ascii=False, indent=2)

    print(f"\n✅ 结果已保存到: {output_dir}")
    print(f"   - 工作流结果: {result_path.name}")
    print(f"   - 最终章节: {chapter_path.name}")
    print(f"   - 章节大纲: {outline_path.name}")


async def main():
    """主函数：运行所有示例"""
    print("\n" + "=" * 80)
    print("INKOS 5-Agent 工作流使用示例")
    print("=" * 80)

    # 运行示例
    await example_1_basic_workflow()
    await example_2_custom_config()
    await example_3_single_node()
    await example_4_loop_demonstration()
    await example_5_save_results()

    print("\n" + "=" * 80)
    print("所有示例运行完成！")
    print("=" * 80)


if __name__ == "__main__":
    # 注意：运行前请配置正确的 API Key
    print("⚠️  请先在代码中配置正确的 API Key")
    print("⚠️  然后取消注释下面的代码运行示例")
    # asyncio.run(main())
