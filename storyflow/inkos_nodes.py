"""
INKOS 增强节点模块 - v1.0.0
包含：真相文件节点、33维度审计、AI痕迹检测与去除
"""

import os
import re
import json
import yaml
import asyncio
from typing import Any, Dict, List, Optional
from dataclasses import dataclass, field
from datetime import datetime
from collections import Counter

import sys
sys.path.insert(0, os.path.dirname(__file__))

from engine import (
    Node, LLMNode, NodeResult, 
    ProviderFactory
)


def get_provider(provider_name: str = "minimax", model: str = None):
    """获取模型提供商"""
    import os
    api_key = os.environ.get("STORYFLOW_API_KEY") or os.environ.get("MINIMAX_API_KEY") or os.environ.get("DASHSCOPE_API_KEY")
    if not api_key:
        raise ValueError("请设置环境变量 STORYFLOW_API_KEY 或 MINIMAX_API_KEY")
    return ProviderFactory.create(provider_name, api_key, model)


# ============================================================
# AI 痕迹检测器
# ============================================================

@dataclass
class AITraceIssue:
    """AI 痕迹问题"""
    issue_type: str
    severity: str  # critical, major, minor
    description: str
    location: str
    evidence: str


class AITraceDetector:
    """AI 痕迹检测器
    
    检测文本中的 AI 生成痕迹：
    1. 高频词检测
    2. 句式单调性检测
    3. 过度总结检测
    4. AI 味表达识别
    """

    # AI 常用的高频词
    AI_COMMON_WORDS = {
        "值得注意的是", "总而言之", "换句话说", "因此",
        "由此可见", "总的来说", "综上所述", "简而言之",
        "可以说", "不难看出", "毋庸置疑", "毫无疑问",
        "众所周知", "实际上", "事实上", "当然",
    }

    # AI 常见的句式模式
    AI_PATTERNS = [
        r"总的来说[，,].*",
        r"综上所述[，,].*",
        r"值得注意的是[，,].*",
    ]

    # AI 常见的"AI味"表达
    AI_SMELL_EXPRESSIONS = [
        "综上所述，", "总的来说，", "值得注意的是，",
        "不可否认的是，", "不得不说的是，", "可以说，",
        "不难发现，", "显而易见，", "毫无疑问，",
        "毋庸置疑，", "在这个时代，", "随着...的发展，",
        "在...的背景下，", "从...的角度来看，",
        "一方面...另一方面", "不仅...而且", "尽管...但是",
    ]

    def __init__(self):
        self.issues: List[AITraceIssue] = []

    def detect(self, text: str) -> Dict[str, Any]:
        """检测文本中的 AI 痕迹"""
        self.issues = []

        # 1. 高频词检测
        self._detect_high_frequency_words(text)

        # 2. AI 味表达识别
        self._detect_ai_smell(text)

        # 3. 句式单调性检测
        self._detect_sentence_monotony(text)

        # 4. 过度总结检测
        self._detect_over_summarization(text)

        # 计算 AI 痕迹得分
        ai_trace_score = self._calculate_ai_score(text)

        return {
            "ai_trace_score": ai_trace_score,
            "issues": [self._issue_to_dict(i) for i in self.issues],
            "total_issues": len(self.issues),
            "critical_count": len([i for i in self.issues if i.severity == "critical"]),
            "major_count": len([i for i in self.issues if i.severity == "major"]),
            "minor_count": len([i for i in self.issues if i.severity == "minor"]),
        }

    def _detect_high_frequency_words(self, text: str):
        """检测高频词"""
        words = re.findall(r'[\w]+', text)
        if not words:
            return

        word_count = Counter(words)
        total_words = len(words)

        for word in self.AI_COMMON_WORDS:
            if word in text:
                count = text.count(word)
                # 超过 3 次算严重问题
                if count >= 3:
                    severity = "critical"
                elif count >= 2:
                    severity = "major"
                else:
                    severity = "minor"

                self.issues.append(AITraceIssue(
                    issue_type="高频词",
                    severity=severity,
                    description=f"发现 AI 常用词 \"{word}\" 使用 {count} 次",
                    location="全文",
                    evidence=f"\"{word}\" 出现 {count} 次"
                ))

    def _detect_ai_smell(self, text: str):
        """检测 AI 味表达"""
        lines = text.split('\n')

        for i, line in enumerate(lines, 1):
            for expr in self.AI_SMELL_EXPRESSIONS:
                if expr in line:
                    self.issues.append(AITraceIssue(
                        issue_type="AI味表达",
                        severity="major",
                        description=f"发现 AI 味表达: \"{expr}\"",
                        location=f"第 {i} 行",
                        evidence=line.strip()[:100]
                    ))

    def _detect_sentence_monotony(self, text: str):
        """检测句式单调性"""
        # 简单检测：统计句号、逗号、分号的出现频率
        sentences = re.split(r'[。!?]', text)
        sentences = [s.strip() for s in sentences if s.strip()]

        if len(sentences) < 5:
            return

        # 检测开头相似的句子
        start_patterns = Counter()
        for s in sentences[:20]:  # 只检查前20句
            if s:
                # 取前10个字符作为模式
                pattern = s[:10] if len(s) >= 10 else s
                start_patterns[pattern] += 1

        for pattern, count in start_patterns.items():
            if count >= 3:
                self.issues.append(AITraceIssue(
                    issue_type="句式单调",
                    severity="minor",
                    description=f"发现相似句式开头: \"{pattern}...\" 出现 {count} 次",
                    location="全文",
                    evidence=f"以 \"{pattern}\" 开头的句子重复出现"
                ))

    def _detect_over_summarization(self, text: str):
        """检测过度总结"""
        lines = text.split('\n')
        summary_indicators = ["总之", "总而言之", "综上所述", "简单来说", "简而言之"]

        for i, line in enumerate(lines, 1):
            for indicator in summary_indicators:
                if indicator in line:
                    # 如果总结句出现在开头1/3，可能是过度总结
                    if i <= len(lines) // 3:
                        self.issues.append(AITraceIssue(
                            issue_type="过度总结",
                            severity="minor",
                            description=f"开头附近出现总结性语句: \"{indicator}\"",
                            location=f"第 {i} 行",
                            evidence=line.strip()[:100]
                        ))

    def _calculate_ai_score(self, text: str) -> float:
        """计算 AI 痕迹得分（0-1，越高 AI 味越重）"""
        if not text:
            return 0.0

        score = 0.0

        # 基于问题数量
        issue_count = len(self.issues)
        if issue_count > 20:
            score += 0.5
        elif issue_count > 10:
            score += 0.3
        elif issue_count > 5:
            score += 0.2
        elif issue_count > 0:
            score += 0.1

        # 基于文本特征
        if "：" in text and text.count("：") > len(text) / 200:
            score += 0.1  # 过度使用冒号

        if "；" in text and text.count("；") > len(text) / 100:
            score += 0.1  # 过度使用分号

        # AI 味表达密度
        smell_count = sum(1 for expr in self.AI_SMELL_EXPRESSIONS if expr in text)
        if smell_count > 10:
            score += 0.3
        elif smell_count > 5:
            score += 0.2
        elif smell_count > 0:
            score += 0.1

        return min(1.0, score)

    def _issue_to_dict(self, issue: AITraceIssue) -> Dict[str, str]:
        return {
            "type": issue.issue_type,
            "severity": issue.severity,
            "description": issue.description,
            "location": issue.location,
            "evidence": issue.evidence
        }


# ============================================================
# AI 痕迹去除器
# ============================================================

class AITraceRemover:
    """AI 痕迹去除器
    
    替换或删除 AI 常用表达，使文本更自然
    """

    # 替换词表
    REPLACEMENTS = {
        "值得注意的是": "",
        "总的来说": "",
        "综上所述": "因此",
        "简而言之": "",
        "不难看出": "可见",
        "可以说": "",
        "实际上": "",
        "事实上": "",
        "当然": "",
    }

    # 需要删除的句式
    DELETE_PATTERNS = [
        r"总的来说[，,]",
        r"综上所述[，,]",
        r"值得注意的是[，,]",
        r"简单来说[，,]",
        r"简而言之[，,]",
        r"一方面[，,]",  # 保留另一方面
    ]

    def __init__(self, intensity: str = "medium"):
        """
        初始化去除器
        
        Args:
            intensity: 去味强度 "light" | "medium" | "thorough"
        """
        self.intensity = intensity

    def remove_ai_traces(self, text: str) -> str:
        """去除 AI 痕迹"""
        result = text

        if self.intensity in ("medium", "thorough"):
            # 替换词
            for old, new in self.REPLACEMENTS.items():
                result = result.replace(old, new)

        if self.intensity == "thorough":
            # 删除整句模式
            for pattern in self.DELETE_PATTERNS:
                result = re.sub(pattern, "", result)

            # 清理多余空格和标点
            result = re.sub(r'\s+', ' ', result)
            result = re.sub(r'，+', '，', result)
            result = re.sub(r'。+', '。', result)

        # 清理开头
        lines = result.split('\n')
        cleaned_lines = []
        for line in lines:
            line = line.strip()
            if line and not self._is_empty_line(line):
                cleaned_lines.append(line)

        return '\n'.join(cleaned_lines)

    def _is_empty_line(self, line: str) -> bool:
        """判断是否为空行"""
        return len(line) < 2 or line in "，。、；：""''""()（）"


# ============================================================
# 真相文件节点基类
# ============================================================

class TruthFileNode(Node):
    """真相文件节点基类
    
    特性：
    1. 自动 YAML 序列化输出
    2. 支持增量更新（overwrite/append/merge）
    3. 内置数据验证
    4. 文件持久化
    """

    def __init__(
        self,
        node_id: str,
        name: str,
        truth_file_name: str,
        base_dir: str = ".storyflow_truth"
    ):
        super().__init__(node_id, name)
        self.truth_file_name = truth_file_name
        self.base_dir = base_dir

        # 创建目录
        os.makedirs(base_dir, exist_ok=True)

        # 添加通用输入
        self.add_input("update_mode", "str", False, "append")
        self.add_input("chapter_ref", "str", False, "")

        # 添加通用输出
        self.add_output("yaml_output", "str")
        self.add_output("file_path", "str")
        self.add_output("record_count", "int")

    @property
    def file_path(self) -> str:
        return os.path.join(self.base_dir, self.truth_file_name)

    def _get_schema(self) -> Dict[str, Any]:
        """获取数据结构定义（子类实现）"""
        raise NotImplementedError()

    def _validate_data(self, data: Dict[str, Any]) -> List[str]:
        """验证数据（子类实现）"""
        return []

    def _transform_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """数据转换（子类可选实现）"""
        return data

    def _load_existing_data(self) -> Optional[Dict[str, Any]]:
        """加载现有数据"""
        if not os.path.exists(self.file_path):
            return None
        try:
            with open(self.file_path, 'r', encoding='utf-8') as f:
                return yaml.safe_load(f) or {}
        except Exception:
            return None

    def _save_to_file(self, data: Dict[str, Any]) -> str:
        """保存数据到文件"""
        yaml_output = yaml.dump(
            data,
            allow_unicode=True,
            default_flow_style=False,
            sort_keys=False,
            indent=2
        )
        with open(self.file_path, 'w', encoding='utf-8') as f:
            f.write(yaml_output)
        return yaml_output

    def _append_data(self, existing: Dict[str, Any], new_data: Dict[str, Any]) -> Dict[str, Any]:
        """追加数据模式"""
        for key in existing.keys():
            if isinstance(existing[key], list) and key in new_data:
                if isinstance(new_data[key], list):
                    existing[key].extend(new_data[key])
                else:
                    existing[key].append(new_data[key])
        for key in new_data.keys():
            if key not in existing:
                existing[key] = new_data[key]
        return existing

    def _generate_metadata(self) -> Dict[str, Any]:
        return {
            "updated_at": datetime.now().isoformat(),
            "node_id": self.node_id,
            "chapter_ref": self.input_values.get("chapter_ref", "")
        }

    def _count_records(self, data: Dict[str, Any]) -> int:
        count = 0
        for value in data.values():
            if isinstance(value, list):
                count += len(value)
            elif isinstance(value, dict):
                count += self._count_records(value)
        return count

    def execute(self) -> NodeResult:
        try:
            update_mode = self.input_values.get("update_mode", "append")
            new_data = self._transform_data(self.input_values)

            # 验证
            validation_errors = self._validate_data(new_data)

            # 元数据
            if "metadata" not in new_data:
                new_data["metadata"] = self._generate_metadata()
            else:
                new_data["metadata"].update(self._generate_metadata())

            # 加载现有
            existing_data = self._load_existing_data()

            # 根据模式处理
            if update_mode == "overwrite" or existing_data is None:
                final_data = new_data
            elif update_mode == "append":
                final_data = self._append_data(existing_data, new_data)
            elif update_mode == "merge":
                final_data = self._merge_data(existing_data, new_data)
            else:
                final_data = new_data

            # 保存
            yaml_output = self._save_to_file(final_data)
            record_count = self._count_records(final_data)

            self.output_values = {
                "yaml_output": yaml_output,
                "file_path": self.file_path,
                "record_count": record_count
            }

            return NodeResult(
                success=len(validation_errors) == 0,
                data={
                    "yaml_output": yaml_output,
                    "file_path": self.file_path,
                    "record_count": record_count
                },
                error="; ".join(validation_errors) if validation_errors else None
            )

        except Exception as e:
            return NodeResult(success=False, error=str(e))

    def _merge_data(self, existing: Dict[str, Any], new_data: Dict[str, Any]) -> Dict[str, Any]:
        """合并数据（深度合并）"""
        result = existing.copy()
        for key, value in new_data.items():
            if key in result:
                if isinstance(result[key], dict) and isinstance(value, dict):
                    result[key] = self._merge_data(result[key], value)
                elif isinstance(result[key], list) and isinstance(value, list):
                    result[key] = list(set(result[key] + value))
                else:
                    result[key] = value
            else:
                result[key] = value
        return result


# ============================================================
# 具体真相文件节点
# ============================================================

class CurrentStateNode(TruthFileNode):
    """当前状态真相文件节点

    记录：角色位置、情绪、关系、物品持有、当前情境
    """

    def __init__(self, node_id: str, base_dir: str = ".storyflow_truth"):
        super().__init__(node_id, "当前状态", "current_state.yaml", base_dir)

        self.add_input("character_states", "dict", False, {})
        self.add_input("location", "str", False, "")
        self.add_input("time", "str", False, "")
        self.add_input("plot_progress", "str", False, "")

    def _get_schema(self) -> Dict[str, Any]:
        return {
            "character_states": {},
            "location": "",
            "time": "",
            "plot_progress": ""
        }

    def _validate_data(self, data: Dict[str, Any]) -> List[str]:
        errors = []
        if not data:
            errors.append("数据不能为空")
        return errors


class CharacterMatrixNode(TruthFileNode):
    """角色矩阵真相文件节点

    记录：角色属性、能力、背景、性格、目标
    """

    def __init__(self, node_id: str, base_dir: str = ".storyflow_truth"):
        super().__init__(node_id, "角色矩阵", "character_matrix.yaml", base_dir)

        self.add_input("characters", "list", False, [])

    def _get_schema(self) -> Dict[str, Any]:
        return {"characters": []}


class PendingHooksNode(TruthFileNode):
    """伏笔真相文件节点

    记录：已埋设的伏笔、待回收的线索
    """

    def __init__(self, node_id: str, base_dir: str = ".storyflow_truth"):
        super().__init__(node_id, "伏笔管理", "pending_hooks.yaml", base_dir)

        self.add_input("new_hooks", "list", False, [])
        self.add_input("resolved_hooks", "list", False, [])

    def _get_schema(self) -> Dict[str, Any]:
        return {
            "pending_hooks": [],
            "resolved_hooks": []
        }


class ParticleLedgerNode(TruthFileNode):
    """物资账本真相文件节点

    记录：物品获取、消耗、转移
    """

    def __init__(self, node_id: str, base_dir: str = ".storyflow_truth"):
        super().__init__(node_id, "物资账本", "particle_ledger.yaml", base_dir)

        self.add_input("acquired", "list", False, [])
        self.add_input("consumed", "list", False, [])
        self.add_input("transferred", "list", False, [])

    def _get_schema(self) -> Dict[str, Any]:
        return {
            "acquired": [],
            "consumed": [],
            "transferred": []
        }


class EmotionalArcsNode(TruthFileNode):
    """情感弧线真相文件节点

    记录：角色情感变化轨迹
    """

    def __init__(self, node_id: str, base_dir: str = ".storyflow_truth"):
        super().__init__(node_id, "情感弧线", "emotional_arcs.yaml", base_dir)

        self.add_input("emotional_events", "list", False, [])

    def _get_schema(self) -> Dict[str, Any]:
        return {"emotional_arcs": []}


class ChapterSummariesNode(TruthFileNode):
    """章节摘要真相文件节点

    记录：每章摘要、关键事件、人物出现
    """

    def __init__(self, node_id: str, base_dir: str = ".storyflow_truth"):
        super().__init__(node_id, "章节摘要", "chapter_summaries.yaml", base_dir)

        self.add_input("chapter_number", "int", False, 1)
        self.add_input("summary", "str", False, "")
        self.add_input("key_events", "list", False, [])

    def _get_schema(self) -> Dict[str, Any]:
        return {"chapters": []}


class SubplotBoardNode(TruthFileNode):
    """副线管理真相文件节点

    记录：副线进度、与其他线的交织
    """

    def __init__(self, node_id: str, base_dir: str = ".storyflow_truth"):
        super().__init__(node_id, "副线管理", "subplot_board.yaml", base_dir)

        self.add_input("subplots", "list", False, [])

    def _get_schema(self) -> Dict[str, Any]:
        return {"subplots": []}


# ============================================================
# 33 维度审计节点
# ============================================================

class AuditDimension:
    """审计维度定义"""

    def __init__(self, dimension_id: str, name: str, description: str,
                 check_prompt: str, weight: float = 1.0):
        self.dimension_id = dimension_id
        self.name = name
        self.description = description
        self.check_prompt = check_prompt
        self.weight = weight

    def to_dict(self) -> Dict[str, Any]:
        return {
            "dimension_id": self.dimension_id,
            "name": self.name,
            "description": self.description,
            "weight": self.weight
        }


# 33 个审计维度
AUDIT_DIMENSIONS = [
    # 1. 角色记忆一致性
    AuditDimension("character_memory", "角色记忆一致性",
        "检查角色在不同章节中的记忆是否保持一致",
        "检查草稿中角色的记忆是否与之前章节保持一致。",
        weight=1.2),
    # 2. 物资连续性
    AuditDimension("resource_continuity", "物资连续性",
        "检查角色物品、装备、资源的连续性",
        "检查草稿中的物资使用是否连续。",
        weight=1.0),
    # 3. 伏笔回收
    AuditDimension("foreshadowing", "伏笔回收",
        "检查伏笔是否得到合理的回收或延续",
        "检查草稿中的伏笔处理是否合理。",
        weight=1.3),
    # 4. 大纲偏离度
    AuditDimension("outline_deviation", "大纲偏离度",
        "检查内容是否符合原定大纲规划",
        "检查草稿是否符合大纲规划。",
        weight=1.5),
    # 5. 叙事节奏
    AuditDimension("narrative_pacing", "叙事节奏",
        "检查叙事节奏是否合理",
        "检查草稿的叙事节奏是否合理。",
        weight=1.0),
    # 6. 情感弧线
    AuditDimension("emotional_arc", "情感弧线",
        "检查角色情感变化的合理性和连贯性",
        "检查草稿中的情感弧线是否合理。",
        weight=1.2),
    # 7. AI痕迹检测
    AuditDimension("ai_trace", "AI痕迹检测",
        "检测文本中是否存在AI生成痕迹",
        "检测草稿中的AI生成痕迹。",
        weight=1.5),
    # 8. 时间线一致性
    AuditDimension("timeline", "时间线一致性",
        "检查时间流逝的合理性和一致性",
        "检查草稿中的时间线一致性。",
        weight=1.2),
    # 9. 地理位置合理性
    AuditDimension("geographic", "地理位置合理性",
        "检查地理位置和移动路线的合理性",
        "检查草稿中的地理位置是否合理。",
        weight=1.0),
    # 10. 人物行为符合人设
    AuditDimension("character_behavior", "人物行为符合人设",
        "检查角色行为是否符合其人设和性格",
        "检查草稿中角色行为的一致性。",
        weight=1.3),
    # 11. 信息边界遵守
    AuditDimension("information_boundary", "信息边界遵守",
        "检查信息揭露的时机和范围是否合理",
        "检查草稿中的信息揭露是否合理。",
        weight=1.0),
    # 12. 物理规律一致性
    AuditDimension("physical_consistency", "物理规律一致性",
        "检查物理规律的遵守情况",
        "检查草稿中的物理规律一致性。",
        weight=1.0),
    # 13. 社会规则合理性
    AuditDimension("social_rules", "社会规则合理性",
        "检查社会规则、文化习俗的合理性",
        "检查草稿中的社会规则是否合理。",
        weight=1.0),
    # 14. 语言风格统一性
    AuditDimension("language_style", "语言风格统一性",
        "检查文本语言风格是否统一",
        "检查草稿的语言风格是否统一。",
        weight=1.0),
    # 15. 对话自然度
    AuditDimension("dialogue_naturalness", "对话自然度",
        "检查对话是否自然、符合角色个性",
        "检查草稿中的对话是否自然。",
        weight=1.2),
    # 16. 描写丰富度
    AuditDimension("description_richness", "描写丰富度",
        "检查场景、人物、动作描写的丰富性",
        "检查草稿的描写丰富度。",
        weight=1.0),
    # 17. 情节推进速度
    AuditDimension("plot_progression", "情节推进速度",
        "检查情节推进的速度是否合理",
        "检查草稿的情节推进是否合理。",
        weight=1.1),
    # 18. 冲突设置合理性
    AuditDimension("conflict_setup", "冲突设置合理性",
        "检查冲突的设置、发展和解决是否合理",
        "检查草稿中的冲突设置是否合理。",
        weight=1.2),
    # 19. 角色动机合理性
    AuditDimension("character_motivation", "角色动机合理性",
        "检查角色行为动机是否合理、充分",
        "检查草稿中角色的动机是否合理。",
        weight=1.3),
    # 20. 逻辑自洽性
    AuditDimension("logical_consistency", "逻辑自洽性",
        "检查文本内部逻辑的一致性",
        "检查草稿的逻辑自洽性。",
        weight=1.4),
    # 21. 细节描写准确性
    AuditDimension("detail_accuracy", "细节描写准确性",
        "检查细节描写的准确性和可信度",
        "检查草稿中的细节描写是否准确。",
        weight=1.0),
    # 22. 比喻和修辞恰当性
    AuditDimension("metaphor_appropriateness", "比喻和修辞恰当性",
        "检查比喻和修辞是否恰当、新颖",
        "检查草稿中的比喻和修辞是否恰当。",
        weight=0.8),
    # 23. 情感描写深度
    AuditDimension("emotional_depth", "情感描写深度",
        "检查情感描写的深度和感染力",
        "检查草稿中的情感描写深度。",
        weight=1.1),
    # 24. 节奏把控
    AuditDimension("rhythm_control", "节奏把控",
        "检查整体节奏的把控是否得当",
        "检查草稿的节奏把控是否得当。",
        weight=1.0),
    # 25. 高潮设置
    AuditDimension("climax_setup", "高潮设置",
        "检查高潮的设置和呈现是否有效",
        "检查草稿中的高潮设置是否有效。",
        weight=1.3),
    # 26. 结局合理性
    AuditDimension("ending_appropriateness", "结局合理性",
        "检查结局（或章节结尾）是否合理",
        "检查草稿的结局是否合理。",
        weight=1.2),
    # 27. 伏笔密度
    AuditDimension("foreshadowing_density", "伏笔密度",
        "检查伏笔设置的密度是否合理",
        "检查草稿的伏笔密度是否合理。",
        weight=0.9),
    # 28. 世界观一致性
    AuditDimension("worldview_consistency", "世界观一致性",
        "检查世界观设定的统一性",
        "检查草稿的世界观一致性。",
        weight=1.4),
    # 29. 角色成长轨迹
    AuditDimension("character_growth", "角色成长轨迹",
        "检查角色的成长和变化是否合理",
        "检查草稿中角色的成长是否合理。",
        weight=1.2),
    # 30. 副线推进
    AuditDimension("subplot_progression", "副线推进",
        "检查副线的推进和交织情况",
        "检查草稿中的副线推进情况。",
        weight=0.9),
    # 31. 主题表达清晰度
    AuditDimension("theme_clarity", "主题表达清晰度",
        "检查主题表达是否清晰深刻",
        "检查草稿的主题表达是否清晰。",
        weight=1.1),
    # 32. 读者代入感
    AuditDimension("reader_immersion", "读者代入感",
        "检查读者的代入感和参与度",
        "检查草稿的读者代入感。",
        weight=1.0),
    # 33. 文学性
    AuditDimension("literary_quality", "文学性",
        "检查文本的文学价值和艺术水准",
        "检查草稿的文学性。",
        weight=1.0),
]


class AuditNode(LLMNode):
    """33 维度审计节点
    
    执行多维度文学审计，检测问题并输出结构化报告
    """

    def __init__(self, node_id: str, provider=None, config: Dict[str, Any] = None):
        if provider is None:
            provider = get_provider("minimax")
        super().__init__(node_id, "33维度审计", provider)
        self.config = config or {}

        # 输入
        self.add_input("chapter_draft", "str", True)
        self.add_input("chapter_number", "int", False, 1)
        self.add_input("truth_files", "dict", False, {})
        self.add_input("strict_mode", "bool", False, True)

        # 输出
        self.add_output("audit_report", "dict")
        self.add_output("passed", "bool")
        self.add_output("score", "float")
        self.add_output("issues_count", "int")
        self.add_output("critical_issues_count", "int")

        # 审计配置
        self.pass_threshold = self.config.get("pass_threshold", 0.7)
        self.ai_detector = AITraceDetector()

    async def execute(self) -> NodeResult:
        try:
            chapter_draft = self.input_values.get("chapter_draft", "")
            chapter_number = self.input_values.get("chapter_number", 1)
            truth_files = self.input_values.get("truth_files", {})
            strict_mode = self.input_values.get("strict_mode", True)

            # 1. 执行 AI 痕迹检测
            ai_report = self.ai_detector.detect(chapter_draft)

            # 2. 分批执行 33 维度审计（每批 5 个）
            issues = []
            dimension_scores = {}

            batch_size = 5
            for i in range(0, len(AUDIT_DIMENSIONS), batch_size):
                batch = AUDIT_DIMENSIONS[i:i + batch_size]
                batch_issues, batch_scores = await self._audit_batch(
                    batch, chapter_draft, truth_files
                )
                issues.extend(batch_issues)
                dimension_scores.update(batch_scores)

            # 3. 计算综合得分
            overall_score = self._calculate_score(dimension_scores, ai_report)

            # 4. 统计关键问题
            critical_issues = [i for i in issues if i.get("severity") == "critical"]
            major_issues = [i for i in issues if i.get("severity") == "major"]
            minor_issues = [i for i in issues if i.get("severity") == "minor"]

            # 5. 判断是否通过
            passed = self._evaluate_pass(overall_score, critical_issues, ai_report, strict_mode)

            # 生成摘要
            summary = self._generate_summary(
                passed, overall_score,
                len(critical_issues), len(major_issues), len(minor_issues),
                ai_report
            )

            audit_report = {
                "passed": passed,
                "score": overall_score,
                "chapter_number": chapter_number,
                "issues": issues,
                "dimension_scores": dimension_scores,
                "ai_trace_report": ai_report,
                "summary": summary,
                "audit_time": datetime.now().isoformat()
            }

            return NodeResult(
                success=True,
                data={
                    "audit_report": audit_report,
                    "passed": passed,
                    "score": overall_score,
                    "issues_count": len(issues),
                    "critical_issues_count": len(critical_issues),
                    "major_issues_count": len(major_issues),
                    "minor_issues_count": len(minor_issues),
                }
            )

        except Exception as e:
            return NodeResult(success=False, error=str(e))

    async def _audit_batch(self, dimensions: List[AuditDimension],
                           content: str, truth_files: Dict) -> tuple:
        """审计一批维度"""
        issues = []
        scores = {}

        for dim in dimensions:
            try:
                prompt = f"""请根据以下维度审查文本：

**审计维度**: {dim.name}
**维度说明**: {dim.description}
**检查要求**: {dim.check_prompt}

**真相文件参考**:
{json.dumps(truth_files, ensure_ascii=False, indent=2)[:2000] if truth_files else "无"}

**待审查文本**:
{content[:3000]}

请输出 JSON 格式：
{{
    "issues": [
        {{
            "dimension": "{dim.name}",
            "severity": "critical|major|minor",
            "description": "问题描述",
            "location": "位置",
            "suggestion": "修改建议"
        }}
    ]
}}

无问题返回: {{"issues": []}}"""

                response = await self.call_llm(prompt)
                result = self._parse_response(response)

                if result.get("issues"):
                    issues.extend(result["issues"])

                # 计算维度得分
                if result.get("issues"):
                    issue_count = len(result["issues"])
                    scores[dim.name] = max(0, 1.0 - issue_count * 0.1)
                else:
                    scores[dim.name] = 1.0

            except Exception as e:
                scores[dim.name] = 0.5  # 审计失败给0.5分

        return issues, scores

    def _parse_response(self, response: str) -> Dict[str, Any]:
        """解析 LLM 响应"""
        try:
            json_start = response.find("{")
            json_end = response.rfind("}") + 1
            if json_start >= 0 and json_end > json_start:
                return json.loads(response[json_start:json_end])
        except json.JSONDecodeError:
            pass
        return {"issues": []}

    def _calculate_score(self, dimension_scores: Dict, ai_report: Dict) -> float:
        """计算综合得分"""
        if not dimension_scores:
            return 0.5

        # 加权平均
        total_weight = sum(d.weight for d in AUDIT_DIMENSIONS if d.name in dimension_scores)
        weighted_sum = sum(
            dimension_scores.get(d.name, 1.0) * d.weight
            for d in AUDIT_DIMENSIONS if d.name in dimension_scores
        )

        avg_score = weighted_sum / total_weight if total_weight > 0 else 1.0

        # AI 痕迹扣分
        ai_score = ai_report.get("ai_trace_score", 0.0)
        ai_penalty = ai_score * 0.3

        return max(0.0, min(1.0, avg_score - ai_penalty))

    def _evaluate_pass(self, score: float, critical_issues: List[Dict],
                       ai_report: Dict, strict_mode: bool) -> bool:
        """评估是否通过"""
        if score < self.pass_threshold:
            return False
        if len(critical_issues) > 0:
            return False
        if ai_report.get("ai_trace_score", 0.0) > 0.5:
            return False
        return True

    def _generate_summary(self, passed: bool, score: float,
                         critical: int, major: int, minor: int,
                         ai_report: Dict) -> str:
        """生成审计摘要"""
        parts = []
        parts.append(f"{'✅ 审计通过' if passed else '❌ 审计未通过'}（得分: {score:.2f}）")

        if critical + major + minor > 0:
            parts.append(f"\n发现问题 {critical + major + minor} 个：")
            if critical > 0:
                parts.append(f"  - 严重: {critical}")
            if major > 0:
                parts.append(f"  - 主要: {major}")
            if minor > 0:
                parts.append(f"  - 次要: {minor}")

        ai_issues = ai_report.get("total_issues", 0)
        if ai_issues > 0:
            parts.append(f"\nAI 痕迹: {ai_report.get('ai_trace_score', 0):.2f}（{ai_issues} 处）")

        return "".join(parts)


# ============================================================
# 智能修订节点
# ============================================================

class ReviseNode(LLMNode):
    """智能修订节点
    
    自动修复审计发现的问题，支持多轮修订
    """

    def __init__(self, node_id: str, provider=None, config: Dict[str, Any] = None):
        if provider is None:
            provider = get_provider("minimax")
        super().__init__(node_id, "智能修订", provider)
        self.config = config or {}

        # 输入
        self.add_input("draft", "str", True)
        self.add_input("audit_result", "dict", False, {})
        self.add_input("truth_files", "dict", False, {})

        # 输出
        self.add_output("revised_draft", "str")
        self.add_output("revision_summary", "dict")

        self.ai_remover = AITraceRemover(
            intensity=self.config.get("ai_trace_intensity", "medium")
        )

    async def execute(self) -> NodeResult:
        try:
            draft = self.input_values.get("draft", "")
            audit_result = self.input_values.get("audit_result", {})
            truth_files = self.input_values.get("truth_files", {})

            revised = draft
            changes = []

            # 1. 修复 critical 问题
            critical_issues = [
                i for i in audit_result.get("issues", [])
                if i.get("severity") == "critical"
            ]
            if critical_issues:
                revised = await self._fix_issues(revised, critical_issues, "critical", truth_files)
                changes.append(f"修复 {len(critical_issues)} 个严重问题")

            # 2. 修复 major 问题
            major_issues = [
                i for i in audit_result.get("issues", [])
                if i.get("severity") == "major"
            ]
            if major_issues:
                revised = await self._fix_issues(revised, major_issues, "major", truth_files)
                changes.append(f"修复 {len(major_issues)} 个主要问题")

            # 3. 去 AI 味
            revised = self.ai_remover.remove_ai_traces(revised)
            changes.append("去 AI 味处理")

            summary = {
                "original_length": len(draft),
                "revised_length": len(revised),
                "changes": changes,
                "revision_count": len(changes)
            }

            return NodeResult(
                success=True,
                data={
                    "revised_draft": revised,
                    "revision_summary": summary
                }
            )

        except Exception as e:
            return NodeResult(success=False, error=str(e))

    async def _fix_issues(self, draft: str, issues: List[Dict],
                          severity: str, truth_files: Dict) -> str:
        """修复特定严重级别的问题"""
        issues_text = "\n".join([
            f"- [{i.get('dimension', '未知')}] {i.get('description', '')} (位置: {i.get('location', '未知')})"
            for i in issues
        ])

        system_prompt = f"""你是一位专业的小说编辑，擅长修复{severity}级别的问题。
修复原则：
- 只修复指出的问题，不要过度修改
- 保持原文风格和语气
- 确保修复后逻辑通顺"""

        prompt = f"""请修复以下草稿中的 {severity} 问题：

【原始草稿】
{draft[:5000]}

【需要修复的问题】
{issues_text}

请直接输出修复后的完整草稿，不要添加任何解释。"""

        try:
            revised = await self.call_llm(prompt, system_prompt)
            return revised
        except Exception:
            return draft


# ============================================================
# INKOS 5-Agent 工作流类
# ============================================================

class INKOSWorkflow:
    """INKOS 5-Agent 工作流
    
    完整创作管线：雷达 → 建筑师 → 写手 → 审计 → 修订（循环）
    """

    def __init__(self, api_key: str = None, model: str = "minimax"):
        self.api_key = api_key or os.environ.get("STORYFLOW_API_KEY")
        self.model = model

        # 创建 Provider
        self.provider = get_provider(model, self.api_key)

        # 创建 Agent 节点
        self._create_agents()

    def _create_agents(self):
        """创建 5 个 Agent"""
        from engine import Workflow, LoopConfig

        # 雷达节点 - 市场趋势分析
        self.radar = RadarNode("radar", self.provider)

        # 建筑师节点 - 章节规划
        self.architect = ArchitectNode("architect", self.provider)

        # 写手节点 - 章节创作
        self.writer = WriterNode("writer", self.provider)

        # 审计节点 - 33维度审计
        self.auditor = AuditNode("auditor", self.provider)

        # 修订节点 - 智能修订
        self.reviser = ReviserNode("reviser", self.provider)

        # 构建工作流
        self.workflow = Workflow("inkos_5agent", "INKOS 5-Agent")

        # 添加节点
        self.workflow.add_node(self.radar)
        self.workflow.add_node(self.architect)
        self.workflow.add_node(self.writer)
        self.workflow.add_node(self.auditor)
        self.workflow.add_node(self.reviser)

        # 添加连接
        # Radar → Architect
        self.workflow.add_connection("radar", "story_direction", "architect", "market_context")
        # Architect → Writer
        self.workflow.add_connection("architect", "chapter_outline", "writer", "chapter_outline")
        # Architect → Writer (真相上下文)
        self.workflow.add_connection("architect", "truth_context", "writer", "truth_context")
        # Writer → Auditor
        self.workflow.add_connection("writer", "chapter_draft", "auditor", "chapter_draft")
        self.workflow.add_connection("writer", "state_update", "auditor", "truth_files")
        # Auditor → Reviser
        self.workflow.add_connection("auditor", "audit_report", "reviser", "audit_result")
        self.workflow.add_connection("writer", "chapter_draft", "reviser", "draft")

        # 配置循环引擎（审计 → 修订 → 审计）
        loop_config = LoopConfig(
            enabled=True,
            loop_nodes=["reviser", "auditor"],  # 循环执行修订和审计
            max_iterations=3,
            exit_condition="critical_issues == 0"
        )

        from engine import LoopEngine
        self.engine = LoopEngine(self.workflow, loop_config)

    async def execute(self, genre: str = "玄幻", platform: str = "起点",
                     chapter_number: int = 1, target_words: int = 3000) -> Dict[str, Any]:
        """执行工作流"""

        # 设置初始输入
        self.radar.input_values = {
            "genre": genre,
            "platform": platform,
        }

        self.architect.input_values = {
            "chapter_number": chapter_number,
            "target_words": target_words,
        }

        # 执行
        result = await self.engine.execute()

        return {
            "success": result.get("success", False),
            "results": result.get("results", {}),
            "iteration_count": result.get("iteration_count", 0),
            "log": result.get("log", [])
        }

    def get_execution_log(self) -> List[Dict[str, Any]]:
        return self.engine.get_execution_log()


# ============================================================
# 5-Agent 具体实现
# ============================================================

class RadarNode(LLMNode):
    """市场趋势雷达节点"""

    def __init__(self, node_id: str, provider):
        super().__init__(node_id, "市场趋势雷达", provider)

        self.add_input("genre", "str", False, "玄幻")
        self.add_input("platform", "str", False, "起点")
        self.add_input("trend_keywords", "list", False, [])

        self.add_output("market_report", "dict")
        self.add_output("story_direction", "str")

    async def execute(self) -> NodeResult:
        genre = self.input_values.get("genre", "玄幻")
        platform = self.input_values.get("platform", "起点")
        keywords = self.input_values.get("trend_keywords", [])

        prompt = f"""分析以下网文市场情况：

题材：{genre}
平台：{platform}
热门关键词：{', '.join(keywords) if keywords else '无'}

请输出：
1. 当前市场趋势
2. 读者偏好画像
3. 推荐的故事方向
4. 创新机会点

以 JSON 格式输出：
{{
    "market_trends": [...],
    "reader_preferences": {{...}},
    "story_direction": "...",
    "innovation_points": [...]
}}"""

        try:
            response = await self.call_llm(prompt)
            try:
                data = json.loads(response)
            except json.JSONDecodeError:
                data = {"story_direction": response, "market_trends": []}

            return NodeResult(
                success=True,
                data={
                    "market_report": data,
                    "story_direction": data.get("story_direction", "")
                }
            )
        except Exception as e:
            return NodeResult(success=False, error=str(e))


class ArchitectNode(LLMNode):
    """章节结构建筑师节点"""

    def __init__(self, node_id: str, provider):
        super().__init__(node_id, "章节结构建筑师", provider)

        self.add_input("market_context", "dict", False, {})
        self.add_input("chapter_number", "int", False, 1)
        self.add_input("target_words", "int", False, 3000)
        self.add_input("previous_outline", "str", False, "")

        self.add_output("chapter_outline", "dict")
        self.add_output("truth_context", "dict")
        self.add_output("scene_breakdown", "list")

    async def execute(self) -> NodeResult:
        market_context = self.input_values.get("market_context", {})
        chapter_number = self.input_values.get("chapter_number", 1)
        target_words = self.input_values.get("target_words", 3000)
        previous_outline = self.input_values.get("previous_outline", "")

        prompt = f"""设计第 {chapter_number} 章的详细大纲：

市场趋势：{json.dumps(market_context, ensure_ascii=False)[:500]}
目标字数：{target_words}
上一章大纲：{previous_outline or '无'}

请输出：
1. 章节标题
2. 章节目标
3. 场景分解（3-5个）
4. 节奏规划
5. 关键冲突点
6. 情感曲线

以 JSON 格式输出"""

        try:
            response = await self.call_llm(prompt)
            try:
                outline = json.loads(response)
            except json.JSONDecodeError:
                outline = {"chapter_title": f"第{chapter_number}章", "chapter_goal": response}

            truth_context = {
                "current_chapter": chapter_number,
                "outline": outline
            }

            return NodeResult(
                success=True,
                data={
                    "chapter_outline": outline,
                    "truth_context": truth_context,
                    "scene_breakdown": outline.get("scene_breakdown", [])
                }
            )
        except Exception as e:
            return NodeResult(success=False, error=str(e))


class WriterNode(LLMNode):
    """章节写手节点"""

    def __init__(self, node_id: str, provider):
        super().__init__(node_id, "章节写手", provider)

        self.add_input("chapter_outline", "dict", True)
        self.add_input("truth_context", "dict", False, {})
        self.add_input("style", "str", False, "沉浸式")
        self.add_input("pacing", "str", False, "平衡")

        self.add_output("chapter_draft", "str")
        self.add_output("state_update", "dict")
        self.add_output("word_count", "int")

    async def execute(self) -> NodeResult:
        outline = self.input_values.get("chapter_outline", {})
        truth_context = self.input_values.get("truth_context", {})
        style = self.input_values.get("style", "沉浸式")
        pacing = self.input_values.get("pacing", "平衡")

        # 阶段1: 创意写作
        draft = await self._creative_writing(outline, truth_context, style, pacing)

        # 阶段2: 状态结算
        state_update = await self._state_settlement(draft, truth_context)

        return NodeResult(
            success=True,
            data={
                "chapter_draft": draft,
                "state_update": state_update,
                "word_count": len(draft)
            }
        )

    async def _creative_writing(self, outline: Dict, truth: Dict,
                                 style: str, pacing: str) -> str:
        prompt = f"""根据以下大纲创作章节正文：

大纲：
{json.dumps(outline, ensure_ascii=False, indent=2)}

风格：{style}
节奏：{pacing}

要求：
1. 严格按照大纲创作
2. 语言生动，画面感强
3. 避免 AI 味
4. 字数 2000-4000 字

直接输出正文："""

        return await self.call_llm(prompt)

    async def _state_settlement(self, draft: str, truth: Dict) -> Dict:
        prompt = f"""根据以下章节正文，提取状态更新：

正文（前3000字）：
{draft[:3000]}

请输出 JSON：
{{
    "character_updates": {{}},
    "plot_progress": [],
    "new_hooks": [],
    "resolved_hooks": []
}}"""

        try:
            response = await self.call_llm(prompt)
            try:
                return json.loads(response)
            except json.JSONDecodeError:
                return {"character_updates": {}, "plot_progress": [], "new_hooks": [], "resolved_hooks": []}
        except Exception:
            return {"character_updates": {}, "plot_progress": [], "new_hooks": [], "resolved_hooks": []}


# ============================================================
# 节点注册表
# ============================================================

INKOS_NODE_REGISTRY = {
    # 真相文件节点
    "current_state": CurrentStateNode,
    "character_matrix": CharacterMatrixNode,
    "pending_hooks": PendingHooksNode,
    "particle_ledger": ParticleLedgerNode,
    "emotional_arcs": EmotionalArcsNode,
    "chapter_summaries": ChapterSummariesNode,
    "subplot_board": SubplotBoardNode,
    # 审计和修订
    "audit_33d": AuditNode,
    "revise": ReviseNode,
    # 5-Agent
    "radar": RadarNode,
    "architect": ArchitectNode,
    "writer": WriterNode,
}


def create_inkos_node(node_type: str, node_id: str, **kwargs) -> Node:
    """根据类型创建 INKOS 节点"""
    node_class = INKOS_NODE_REGISTRY.get(node_type)
    if not node_class:
        raise ValueError(f"未知的 INKOS 节点类型: {node_type}")
    return node_class(node_id, **kwargs)
