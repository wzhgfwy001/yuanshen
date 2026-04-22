"""修订节点示例数据和用法"""

import asyncio
import json
from engine import Workflow, Engine
from nodes.revise import ReviseNode


# ==================== 示例数据 ====================

SAMPLE_DRAFT = """
第一章：觉醒

林晨睁开眼睛，发现自己躺在一个陌生的房间里。这是一个石质的小屋，墙壁上挂着几把古老的剑。

他试图站起来，但感觉到一阵眩晕。奇怪的是，他的记忆似乎有些混乱。他记得自己是一名现代大学生，但脑海中又浮现出另一个身份——这个世界的王子。

就在这时，门被推开了。一个穿着长袍的老人走了进来。

"殿下，您终于醒了！"老人激动地说道。

林晨看着老人，脑海中闪过一些片段。这个老人是王宫的宫廷法师，名叫阿尔文。

"阿尔文法师，"林晨试探性地说道，"这是哪里？"

阿尔文法师深深地鞠了一躬："殿下，这里是安全屋。您已经昏迷了三天了。"

林晨心中一惊。三天？他记得自己只是睡了一觉。时间线似乎有些不对劲。

"发生了什么？"林晨问道。

阿尔文法师叹了口气："三天前，皇宫遭到袭击。刺客的毒药让您陷入了昏迷。我们必须将您转移到这个安全屋。"

林晨试图回忆，但脑海中一片空白。他记得自己是一名大学生，正在图书馆看书，然后...然后就在这里了。

更奇怪的是，他能感觉到体内有一股力量在流动。这股力量温暖而强大，仿佛是他与生俱来的。

"殿下，您感觉如何？"阿尔文法师关切地问道。

"我感觉...有些奇怪。"林晨说道，"我似乎有些不记得了。"

阿尔文法师点了点头："这是正常的。毒药会影响记忆。不过，殿下的魔力已经觉醒了。这是好事。"

魔力？林晨心中一震。他记得自己是一名普通的现代大学生，怎么可能会有魔力？

但那股力量是真实的。他轻轻抬起手，掌心中浮现出一团微弱的光芒。

"看来殿下的魔力确实觉醒了。"阿尔文法师欣慰地说道，"现在，我们需要制定一个计划。"

林晨看着手中的光芒，心中充满了困惑。这个世界到底是什么？他为什么会在这里？这一切似乎都不合理。

他决定暂时相信阿尔文法师，毕竟他现在别无选择。
"""


SAMPLE_AUDIT_RESULT = {
    "draft": SAMPLE_DRAFT,
    "issues": [
        # 关键问题
        {
            "type": "timeline_error",
            "severity": "critical",
            "location": "第一章第 5 段",
            "description": "时间线不一致：林晨说'睡了一觉'，但法师说'昏迷了三天'",
            "suggestion": "调整时间描述，确保一致性"
        },
        {
            "type": "logic_contradiction",
            "severity": "critical",
            "location": "第一章第 12 段",
            "description": "逻辑矛盾：林晨记得自己是大学生，但同时也有王子的记忆，但没有解释这种穿越/重生机制",
            "suggestion": "增加对穿越/重生机制的解释"
        },
        {
            "type": "continuity_error",
            "severity": "critical",
            "location": "第一章第 18 段",
            "description": "连续性错误：林晨突然能够使用魔力，但之前没有任何铺垫或觉醒过程的描述",
            "suggestion": "增加魔力觉醒过程的详细描述"
        },

        # 重要问题
        {
            "type": "narrative_pacing",
            "severity": "major",
            "location": "第一章整体",
            "description": "叙事节奏过快，信息量过大，读者难以消化",
            "suggestion": "放缓节奏，增加环境描写和人物反应"
        },
        {
            "type": "character_behavior",
            "severity": "major",
            "location": "第一章第 10 段",
            "description": "角色行为不符合人设：林晨作为刚穿越的大学生，对陌生环境和新身份接受得太快，缺乏应有的震惊和困惑",
            "suggestion": "增加林晨的内心挣扎和情感反应"
        },
        {
            "type": "dialogue_issue",
            "severity": "major",
            "location": "第一章第 6-7 段",
            "description": "对话过于直接，缺乏张力",
            "suggestion": "增加对话的层次感和暗示性"
        },

        # 次要问题
        {
            "type": "language_polish",
            "severity": "minor",
            "location": "第一章第 15 段",
            "description": "句子结构重复：多次使用'林晨'作为句子开头",
            "suggestion": "变换句式结构，避免重复"
        },
        {
            "type": "description_opt",
            "severity": "minor",
            "location": "第一章第 2 段",
            "description": "环境描写过于简单：'石质的小屋'缺乏细节",
            "suggestion": "增加石屋的细节描写"
        },
        {
            "type": "rhetoric_improve",
            "severity": "minor",
            "location": "第一章第 20 段",
            "description": "比喻和修辞不够丰富",
            "suggestion": "增加比喻和修辞手法"
        }
    ],
    "summary": {
        "total_issues": 9,
        "critical_issues": 3,
        "major_issues": 3,
        "minor_issues": 3
    }
}


SAMPLE_TRUTH_FILES = {
    "world": {
        "name": "艾尔迪亚大陆",
        "magic_system": "魔力是一种天赋，通常在18岁左右觉醒",
        "timeline": "故事开始于艾尔迪亚历3042年"
    },
    "character": {
        "name": "林晨 / 艾瑞克王子",
        "age": 18,
        "background": "艾尔迪亚帝国的第二王子，拥有强大的魔法天赋",
        "personality": "谨慎、聪明、善于观察"
    }
}


SAMPLE_STYLE_FINGERPRINT = {
    "sentence_length_avg": 25.0,
    "sentence_length_std": 8.0,
    "sentence_length_min": 10.0,
    "sentence_length_max": 40.0,
    "paragraph_length_avg": 150.0,
    "paragraph_length_std": 50.0,
    "unique_word_ratio": 0.65,
    "avg_word_length": 2.0,
    "punctuation_style": {
        "，": 0.6,
        "。": 0.3,
        "！": 0.05,
        "？": 0.05
    },
    "sentence_structure": {
        "short_ratio": 0.3,
        "medium_ratio": 0.5,
        "long_ratio": 0.2,
        "avg_clauses_per_sentence": 2.5
    },
    "tone": {
        "happy": 1,
        "sad": 0,
        "angry": 0,
        "calm": 2
    }
}


# ==================== 使用示例 ====================

async def example_basic_revision():
    """示例：基本修订流程"""
    print("=" * 60)
    print("📝 示例 1: 基本修订流程")
    print("=" * 60)
    print()

    # 创建修订节点
    # 注意：需要真实的 API Key
    node = ReviseNode(
        node_id="revise_1",
        api_key="your_api_key_here",  # 替换为真实的 API Key
        model="modelstudio/qwen3.5-plus",
        config={
            "max_revision_rounds": 3,
            "ai_trace_removal_config": {
                "word_replacement_rate": 0.8,
                "pattern_removal_rate": 0.9
            }
        }
    )

    # 设置输入
    node.set_input("draft", SAMPLE_DRAFT)
    node.set_input("audit_result", SAMPLE_AUDIT_RESULT)
    node.set_input("truth_files", SAMPLE_TRUTH_FILES)

    # 执行修订
    print("开始修订...")
    result = await node.execute()

    if result.success:
        print("✅ 修订成功！")
        print()
        print(f"修订轮次: {result.data['revision_rounds']}")
        print(f"修订摘要: {json.dumps(result.data['revision_summary'], ensure_ascii=False, indent=2)}")
        print()
        print("修订后的草稿:")
        print("-" * 60)
        print(result.data['revised_draft'][:500] + "...")
        print()
        print("次要问题建议:")
        print("-" * 60)
        for suggestion in result.data['suggestions']:
            print(f"- {suggestion['type']}: {suggestion['description']}")
    else:
        print(f"❌ 修订失败: {result.error}")

    print()


async def example_with_style_fingerprint():
    """示例：使用文风指纹进行修订"""
    print("=" * 60)
    print("📝 示例 2: 使用文风指纹")
    print("=" * 60)
    print()

    # 创建修订节点，并注入文风指纹
    node = ReviseNode(
        node_id="revise_2",
        api_key="your_api_key_here",  # 替换为真实的 API Key
        model="modelstudio/qwen3.5-plus",
        config={
            "max_revision_rounds": 2,
            "style_fingerprint": SAMPLE_STYLE_FINGERPRINT
        }
    )

    # 设置输入
    node.set_input("draft", SAMPLE_DRAFT)
    node.set_input("audit_result", SAMPLE_AUDIT_RESULT)

    # 执行修订
    print("开始修订（使用文风指纹）...")
    result = await node.execute()

    if result.success:
        print("✅ 修订成功！")
        print()
        print(f"修订后的文本长度: {len(result.data['revised_draft'])}")
        print(f"修订摘要: {json.dumps(result.data['revision_summary'], ensure_ascii=False, indent=2)}")
    else:
        print(f"❌ 修订失败: {result.error}")

    print()


async def example_in_workflow():
    """示例：在工作流中使用修订节点"""
    print("=" * 60)
    print("📝 示例 3: 在工作流中使用修订节点")
    print("=" * 60)
    print()

    # 创建工作流
    workflow = Workflow("story_revision", "故事修订工作流")

    # 添加修订节点
    revise_node = ReviseNode(
        node_id="auto_revise",
        api_key="your_api_key_here",  # 替换为真实的 API Key
        model="modelstudio/qwen3.5-plus"
    )

    workflow.add_node(revise_node)

    # 手动设置输入（在实际应用中，应该从其他节点传递）
    revise_node.set_input("draft", SAMPLE_DRAFT)
    revise_node.set_input("audit_result", SAMPLE_AUDIT_RESULT)
    revise_node.set_input("truth_files", SAMPLE_TRUTH_FILES)

    # 执行工作流
    engine = Engine(workflow)

    print("开始执行工作流...")
    try:
        results = await engine.execute()

        print("✅ 工作流执行成功！")
        print()
        print("执行日志:")
        for log in engine.get_execution_log():
            print(f"  - 节点 {log['node_id']}: {log['status']}")
        print()

    except Exception as e:
        print(f"❌ 工作流执行失败: {str(e)}")

    print()


# ==================== 主函数 ====================

async def main():
    """主函数"""
    print("\n")
    print("🎨 StoryFlow 修订节点 - 使用示例")
    print("⚠️  注意：以下示例需要真实的通义千问 API Key")
    print("   请将 'your_api_key_here' 替换为您的真实 API Key")
    print()

    # 取消注释以运行示例
    # await example_basic_revision()
    # await example_with_style_fingerprint()
    # await example_in_workflow()

    print("💡 提示：取消注释 main() 函数中的示例代码，并配置 API Key 后即可运行")
    print()


if __name__ == "__main__":
    asyncio.run(main())
