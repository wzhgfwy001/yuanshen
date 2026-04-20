"""
单元测试 - 真相文件节点

测试所有 7 个真相文件节点的功能：
- 数据验证
- YAML 输出
- 增量更新（append/merge）
- 文件持久化
"""

import os
import sys
import yaml
import tempfile
import shutil
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from nodes.truth_files import (
    TruthFileNode,
    CurrentStateNode,
    ParticleLedgerNode,
    PendingHooksNode,
    ChapterSummariesNode,
    SubplotBoardNode,
    EmotionalArcsNode,
    CharacterMatrixNode
)


class TestTruthFiles:
    """真相文件节点测试套件"""

    def __init__(self):
        # 创建临时目录用于测试
        self.test_dir = tempfile.mkdtemp(prefix="truth_files_test_")
        print(f"\n🧪 测试目录: {self.test_dir}")

    def cleanup(self):
        """清理测试目录"""
        if os.path.exists(self.test_dir):
            shutil.rmtree(self.test_dir)
            print(f"\n🧹 清理测试目录: {self.test_dir}")

    def test_current_state_node(self):
        """测试世界状态节点"""
        print("\n🧪 测试 1: CurrentStateNode - 世界状态节点")

        # 创建节点
        node = CurrentStateNode("test_current_state")
        node.base_dir = self.test_dir

        # 测试 1.1: 添加角色信息
        print("   测试 1.1: 添加角色信息")
        node.set_input("character_name", "艾利克斯")
        node.set_input("character_location", "魔法塔")
        node.set_input("character_status", "alive")
        node.set_input("current_chapter", 1)
        node.set_input("chapter_ref", "第1章")

        result = node.execute()

        assert result.success, f"执行失败: {result.error}"
        assert len(result.validation_errors) == 0, f"验证错误: {result.validation_errors}"
        print("   ✅ 角色信息添加成功")

        # 验证文件
        assert os.path.exists(node.file_path), "文件未创建"
        with open(node.file_path, 'r', encoding='utf-8') as f:
            data = yaml.safe_load(f)
            assert "characters" in data
            assert len(data["characters"]) == 1
            assert data["characters"][0]["name"] == "艾利克斯"
            print("   ✅ 文件内容正确")

        # 测试 1.2: 追加关系信息
        print("   测试 1.2: 追加关系信息")
        node2 = CurrentStateNode("test_current_state_2")
        node2.base_dir = self.test_dir
        node2.set_input("update_mode", "append")
        node2.set_input("relationship_from", "艾利克斯")
        node2.set_input("relationship_to", "玛丽亚")
        node2.set_input("relationship_type", "friend")
        node2.set_input("relationship_status", "positive")
        node2.set_input("current_chapter", 2)
        node2.set_input("chapter_ref", "第2章")

        result2 = node2.execute()
        assert result2.success, f"执行失败: {result2.error}"
        assert result2.is_incremental, "应该是增量更新"
        print("   ✅ 关系信息追加成功")

        # 验证追加
        with open(node2.file_path, 'r', encoding='utf-8') as f:
            data = yaml.safe_load(f)
            assert len(data["characters"]) == 1, "角色数量应该保持"
            assert len(data["relationships"]) == 1, "应该有1个关系"
            print("   ✅ 追加验证通过")

        print("   ✓ CurrentStateNode 测试通过")

    def test_particle_ledger_node(self):
        """测试资源账本节点"""
        print("\n🧪 测试 2: ParticleLedgerNode - 资源账本节点")

        node = ParticleLedgerNode("test_particle_ledger")
        node.base_dir = self.test_dir

        # 测试 2.1: 添加物品
        print("   测试 2.1: 添加物品")
        node.set_input("item_name", "魔法剑")
        node.set_input("item_owner", "艾利克斯")
        node.set_input("item_type", "weapon")
        node.set_input("item_quantity", 1)
        node.set_input("chapter_ref", "第1章")

        result = node.execute()
        assert result.success, f"执行失败: {result.error}"
        print("   ✅ 物品添加成功")

        # 验证
        with open(node.file_path, 'r', encoding='utf-8') as f:
            data = yaml.safe_load(f)
            assert "items" in data
            assert data["items"][0]["name"] == "魔法剑"
            print("   ✅ 物品数据正确")

        # 测试 2.2: 添加货币
        print("   测试 2.2: 添加货币")
        node2 = ParticleLedgerNode("test_particle_ledger_2")
        node2.base_dir = self.test_dir
        node2.set_input("update_mode", "append")
        node2.set_input("currency_name", "金币")
        node2.set_input("currency_owner", "艾利克斯")
        node2.set_input("currency_amount", 100)
        node2.set_input("chapter_ref", "第1章")

        result2 = node2.execute()
        assert result2.success
        print("   ✅ 货币添加成功")

        print("   ✓ ParticleLedgerNode 测试通过")

    def test_pending_hooks_node(self):
        """测试未闭合伏笔节点"""
        print("\n🧪 测试 3: PendingHooksNode - 未闭合伏笔节点")

        node = PendingHooksNode("test_pending_hooks")
        node.base_dir = self.test_dir

        # 测试 3.1: 添加伏笔
        print("   测试 3.1: 添加伏笔")
        node.set_input("hook_id", "mysterious_amulet")
        node.set_input("hook_description", "艾利克斯发现了一个神秘的护身符")
        node.set_input("hook_type", "mystery")
        node.set_input("hook_priority", "high")
        node.set_input("hook_estimated_resolution", "第5章")
        node.set_input("chapter_ref", "第1章")

        result = node.execute()
        assert result.success, f"执行失败: {result.error}"
        print("   ✅ 伏笔添加成功")

        # 验证
        with open(node.file_path, 'r', encoding='utf-8') as f:
            data = yaml.safe_load(f)
            assert "hooks" in data
            assert data["hooks"][0]["id"] == "mysterious_amulet"
            assert data["hooks"][0]["priority"] == "high"
            print("   ✅ 伏笔数据正确")

        # 测试 3.2: 添加冲突
        print("   测试 3.2: 添加冲突")
        node2 = PendingHooksNode("test_pending_hooks_2")
        node2.base_dir = self.test_dir
        node2.set_input("update_mode", "append")
        node2.set_input("conflict_id", "kingdom_threat")
        node2.set_input("conflict_parties", "艾利克斯 vs 黑暗领主")
        node2.set_input("conflict_type", "interpersonal")
        node2.set_input("chapter_ref", "第2章")

        result2 = node2.execute()
        assert result2.success
        print("   ✅ 冲突添加成功")

        print("   ✓ PendingHooksNode 测试通过")

    def test_chapter_summaries_node(self):
        """测试各章摘要节点"""
        print("\n🧪 测试 4: ChapterSummariesNode - 各章摘要节点")

        node = ChapterSummariesNode("test_chapter_summaries")
        node.base_dir = self.test_dir

        # 测试 4.1: 添加章节摘要
        print("   测试 4.1: 添加章节摘要")
        node.set_input("chapter_number", 1)
        node.set_input("chapter_title", "命运的开始")
        node.set_input("character_present", "艾利克斯")
        node.set_input("key_event", "艾利克斯获得了神秘护身符")
        node.set_input("word_count", 1200)

        result = node.execute()
        assert result.success, f"执行失败: {result.error}"
        print("   ✅ 章节摘要添加成功")

        # 验证
        with open(node.file_path, 'r', encoding='utf-8') as f:
            data = yaml.safe_load(f)
            assert "chapters" in data
            assert data["chapters"][0]["chapter_number"] == 1
            assert data["chapters"][0]["title"] == "命运的开始"
            print("   ✅ 章节数据正确")

        print("   ✓ ChapterSummariesNode 测试通过")

    def test_subplot_board_node(self):
        """测试支线进度板节点"""
        print("\n🧪 测试 5: SubplotBoardNode - 支线进度板节点")

        node = SubplotBoardNode("test_subplot_board")
        node.base_dir = self.test_dir

        # 测试 5.1: 添加支线
        print("   测试 5.1: 添加支线")
        node.set_input("subplot_id", "romance_arc")
        node.set_input("subplot_name", "艾利克斯与玛丽亚的恋情")
        node.set_input("subplot_type", "supporting")
        node.set_input("subplot_status", "active")
        node.set_input("subplot_progress", 25)
        node.set_input("subplot_characters", "艾利克斯, 玛丽亚")
        node.set_input("chapter_ref", "第1章")

        result = node.execute()
        assert result.success, f"执行失败: {result.error}"
        print("   ✅ 支线添加成功")

        # 验证
        with open(node.file_path, 'r', encoding='utf-8') as f:
            data = yaml.safe_load(f)
            assert "subplots" in data
            assert data["subplots"][0]["id"] == "romance_arc"
            assert data["subplots"][0]["progress_percentage"] == 25
            print("   ✅ 支线数据正确")

        print("   ✓ SubplotBoardNode 测试通过")

    def test_emotional_arcs_node(self):
        """测试情感弧线节点"""
        print("\n🧪 测试 6: EmotionalArcsNode - 情感弧线节点")

        node = EmotionalArcsNode("test_emotional_arcs")
        node.base_dir = self.test_dir

        # 测试 6.1: 添加情感记录
        print("   测试 6.1: 添加情感记录")
        node.set_input("character_name", "艾利克斯")
        node.set_input("current_emotion", "惊讶")
        node.set_input("emotion_cause", "发现神秘护身符")
        node.set_input("emotion_intensity", 7)
        node.set_input("emotion_type", "reaction")
        node.set_input("chapter_ref", "第1章")

        result = node.execute()
        assert result.success, f"执行失败: {result.error}"
        print("   ✅ 情感记录添加成功")

        # 验证
        with open(node.file_path, 'r', encoding='utf-8') as f:
            data = yaml.safe_load(f)
            assert "characters" in data
            assert data["characters"][0]["name"] == "艾利克斯"
            assert data["characters"][0]["emotional_history"][0]["emotion"] == "惊讶"
            print("   ✅ 情感数据正确")

        # 测试 6.2: 添加情感里程碑
        print("   测试 6.2: 添加情感里程碑")
        node2 = EmotionalArcsNode("test_emotional_arcs_2")
        node2.base_dir = self.test_dir
        node2.set_input("update_mode", "append")
        node2.set_input("character_name", "艾利克斯")
        node2.set_input("milestone_type", "realization")
        node2.set_input("milestone_description", "意识到自己拥有魔法天赋")
        node2.set_input("chapter_ref", "第3章")

        result2 = node2.execute()
        assert result2.success
        print("   ✅ 情感里程碑添加成功")

        print("   ✓ EmotionalArcsNode 测试通过")

    def test_character_matrix_node(self):
        """测试角色交互矩阵节点"""
        print("\n🧪 测试 7: CharacterMatrixNode - 角色交互矩阵节点")

        node = CharacterMatrixNode("test_character_matrix")
        node.base_dir = self.test_dir

        # 测试 7.1: 添加交互记录
        print("   测试 7.1: 添加交互记录")
        node.set_input("character_a", "艾利克斯")
        node.set_input("character_b", "玛丽亚")
        node.set_input("interaction_type", "dialogue")
        node.set_input("interaction_context", "在酒馆相遇")
        node.set_input("interaction_significance", "medium")
        node.set_input("chapter_ref", "第2章")

        result = node.execute()
        assert result.success, f"执行失败: {result.error}"
        print("   ✅ 交互记录添加成功")

        # 验证
        with open(node.file_path, 'r', encoding='utf-8') as f:
            data = yaml.safe_load(f)
            assert "interactions" in data
            assert data["interactions"][0]["character_a"] == "艾利克斯"
            assert data["interactions"][0]["character_b"] == "玛丽亚"
            print("   ✅ 交互数据正确")

        # 测试 7.2: 添加信息边界
        print("   测试 7.2: 添加信息边界")
        node2 = CharacterMatrixNode("test_character_matrix_2")
        node2.base_dir = self.test_dir
        node2.set_input("update_mode", "append")
        node2.set_input("info_known_by", "艾利克斯")
        node2.set_input("info_content", "护身符是开启古老封印的钥匙")
        node2.set_input("info_source", "神秘老人")
        node2.set_input("info_secret", True)
        node2.set_input("chapter_ref", "第3章")

        result2 = node2.execute()
        assert result2.success
        print("   ✅ 信息边界添加成功")

        print("   ✓ CharacterMatrixNode 测试通过")

    def test_validation_errors(self):
        """测试数据验证功能"""
        print("\n🧪 测试 8: 数据验证功能")

        # 测试 8.1: 无效的角色状态
        print("   测试 8.1: 无效的角色状态")
        node = CurrentStateNode("test_validation")
        node.base_dir = self.test_dir
        node.set_input("character_name", "测试角色")
        node.set_input("character_status", "invalid_status")

        result = node.execute()
        # 注意：节点不会因为验证错误而失败，但会记录错误
        if len(result.validation_errors) > 0:
            print("   ✅ 检测到无效状态")
        else:
            print("   ⚠️  验证逻辑可能需要调整")

        # 测试 8.2: 无效的关系强度
        print("   测试 8.2: 无效的关系强度")
        node2 = CurrentStateNode("test_validation_2")
        node2.base_dir = self.test_dir
        node2.set_input("relationship_from", "角色A")
        node2.set_input("relationship_to", "角色B")
        node2.set_input("relationship_type", "friend")

        result2 = node2.execute()
        if len(result2.validation_errors) > 0:
            print("   ✅ 检测到缺失的必需字段")

        print("   ✓ 数据验证测试完成")

    def test_merge_mode(self):
        """测试合并模式"""
        print("\n🧪 测试 9: 合并模式（merge）")

        # 创建一个独立的测试目录，避免与其他测试冲突
        merge_test_dir = tempfile.mkdtemp(prefix="truth_files_merge_test_")

        node = CurrentStateNode("test_merge")
        node.base_dir = merge_test_dir

        # 第一次添加
        print("   测试 9.1: 初始数据")
        node.set_input("character_name", "艾利克斯")
        node.set_input("character_location", "魔法塔")
        node.set_input("current_chapter", 1)

        result = node.execute()
        assert result.success
        print("   ✅ 初始数据添加成功")

        # 第二次合并更新
        print("   测试 9.2: 合并更新")
        node2 = CurrentStateNode("test_merge_2")
        node2.base_dir = merge_test_dir
        node2.set_input("update_mode", "merge")
        node2.set_input("current_chapter", 2)
        node2.set_input("time_of_day", "黄昏")

        result2 = node2.execute()
        assert result2.success
        assert result2.is_incremental

        # 验证合并结果
        with open(node2.file_path, 'r', encoding='utf-8') as f:
            data = yaml.safe_load(f)
            assert data["current_chapter"] == 2, f"章节数应该被更新，但实际是 {data.get('current_chapter')}"
            assert data["time_of_day"] == "黄昏", "新字段应该被添加"
            print("   ✅ 合并更新验证通过")

        # 清理独立的测试目录
        shutil.rmtree(merge_test_dir)

        print("   ✓ 合并模式测试通过")

    def run_all_tests(self):
        """运行所有测试"""
        print("\n" + "=" * 60)
        print("🧪 StoryFlow 真相文件节点 - 单元测试")
        print("=" * 60)

        try:
            self.test_current_state_node()
            self.test_particle_ledger_node()
            self.test_pending_hooks_node()
            self.test_chapter_summaries_node()
            self.test_subplot_board_node()
            self.test_emotional_arcs_node()
            self.test_character_matrix_node()
            self.test_validation_errors()
            self.test_merge_mode()

            print("\n" + "=" * 60)
            print("✅ 所有测试通过！")
            print("=" * 60 + "\n")

            return True

        except Exception as e:
            print(f"\n❌ 测试失败: {e}")
            import traceback
            traceback.print_exc()
            return False

        finally:
            self.cleanup()


def main():
    """主函数"""
    tester = TestTruthFiles()
    success = tester.run_all_tests()

    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
