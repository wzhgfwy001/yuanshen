"""
AI 痕迹检测器 - 检测文本中的 AI 生成痕迹
"""

import re
from typing import Dict, List, Tuple
from collections import Counter
from dataclasses import dataclass


@dataclass
class AITraceIssue:
    """AI 痕迹问题"""
    issue_type: str
    severity: str  # critical, major, minor
    description: str
    location: str  # 位置描述
    evidence: str  # 证据文本


class AITraceDetector:
    """AI 痕迹检测器"""

    # AI 常用的高频词和陈词滥调
    AI_COMMON_WORDS = {
        "值得注意的是", "值得注意的是", "总而言之", "换句话说",
        "因此", "由此可见", "换句话说", "也就是说",
        "总的来说", "综上所述", "简而言之", "由此可见",
        "可以说", "不难看出", "毋庸置疑", "毫无疑问",
        "众所周知", "众所周知", "众所周知", "众所周知",
    }

    # AI 常见的句式模式
    AI_PATTERNS = [
        r"总的来说[，,].*",
        r"总的来说[，,].*",
        r"总的来说[，,].*",
    ]

    # AI 常见的" AI 味"表达
    AI_SMELL_EXPRESSIONS = [
        "综上所述，",
        "总的来说，",
        "值得注意的是，",
        "不可否认的是，",
        "不得不说的是，",
        "可以说，",
        "不难发现，",
        "显而易见，",
        "毫无疑问，",
        "毋庸置疑，",
        "在这个时代，",
        "随着...的发展，",
        "在...的背景下，",
        "从...的角度来看，",
        "基于...的考虑，",
        "一方面...另一方面",
        "不仅...而且",
        "尽管...但是",
    ]

    def __init__(self):
        self.issues: List[AITraceIssue] = []

    def detect(self, text: str) -> List[AITraceIssue]:
        """
        检测文本中的 AI 痕迹

        Args:
            text: 待检测的文本

        Returns:
            AI 痕迹问题列表
        """
        self.issues = []

        # 1. 高频词检测
        self._detect_high_frequency_words(text)

        # 2. 句式单调性检测
        self._detect_sentence_monotony(text)

        # 3. 过度总结检测
        self._detect_over_summarization(text)

        # 4. AI 味表达识别
        self._detect_ai_smell(text)

        return self.issues

    def _detect_high_frequency_words(self, text: str):
        """检测高频词"""
        # 分词（简单按空格和标点分割）
        words = re.findall(r'[\w]+', text)
        word_count = Counter(words)
        total_words = len(words)

        if total_words == 0:
            return

        # 检查常用 AI 词是否过度使用
        for word in self.AI_COMMON_WORDS:
            if word in word_count:
                count = word_count[word]
                frequency = count / total_words

                # 如果使用频率过高（超过 0.5%）
                if frequency > 0.005:
                    self.issues.append(AITraceIssue(
                        issue_type="high_frequency_word",
                        severity="minor",
                        description=f"高频词 '{word}' 使用频率过高 ({frequency:.2%})",
                        location=f"全文共出现 {count} 次",
                        evidence=word
                    ))

    def _detect_sentence_monotony(self, text: str):
        """检测句式单调性"""
        sentences = re.split(r'[。！？.!?]', text)
        sentences = [s.strip() for s in sentences if s.strip()]

        if len(sentences) < 10:
            return

        # 分析句子长度分布
        sentence_lengths = [len(s) for s in sentences]
        avg_length = sum(sentence_lengths) / len(sentence_lengths)
        length_variance = sum((l - avg_length) ** 2 for l in sentence_lengths) / len(sentence_lengths)

        # 如果方差太小，说明句式过于单调
        if length_variance < 100:  # 这是一个经验值
            self.issues.append(AITraceIssue(
                issue_type="sentence_monotony",
                severity="minor",
                description="句式长度过于单调，缺乏变化",
                location="全文",
                evidence=f"平均句长: {avg_length:.1f} 字，方差: {length_variance:.1f}"
            ))

        # 检查是否以相同的模式开头
        start_words = [re.match(r'^(.+?)[，,。]', s) for s in sentences]
        start_words = [m.group(1) if m else "" for m in start_words if m]

        start_word_count = Counter(start_words)
        for word, count in start_word_count.most_common(5):
            if count > len(sentences) * 0.1:  # 如果某个开头词超过 10%
                self.issues.append(AITraceIssue(
                    issue_type="repetitive_start",
                    severity="minor",
                    description=f"句子开头过于重复，'{word}' 出现 {count} 次",
                    location="全文",
                    evidence=word
                ))

    def _detect_over_summarization(self, text: str):
        """检测过度总结"""
        # 检查总结性词汇的密度
        summary_keywords = [
            "总结", "总之", "综上", "总的来说", "简而言之",
            "概括", "归纳", "归纳起来", "一言以蔽之",
        ]

        summary_count = 0
        for keyword in summary_keywords:
            summary_count += text.count(keyword)

        # 计算总结密度
        text_length = len(text)
        if text_length > 0:
            summary_density = summary_count / (text_length / 1000)  # 每千字的总结次数

            # 如果总结密度过高（每千字超过 3 次）
            if summary_density > 3:
                self.issues.append(AITraceIssue(
                    issue_type="over_summarization",
                    severity="major",
                    description=f"过度使用总结性表达（每千字 {summary_density:.1f} 次）",
                    location="全文",
                    evidence=f"共发现 {summary_count} 处总结性表达"
                ))

    def _detect_ai_smell(self, text: str):
        """检测 AI 味表达"""
        for expression in self.AI_SMELL_EXPRESSIONS:
            # 查找所有匹配位置
            matches = list(re.finditer(re.escape(expression), text))

            if len(matches) > 0:
                for match in matches:
                    # 获取上下文
                    start = max(0, match.start() - 20)
                    end = min(len(text), match.end() + 20)
                    context = text[start:end]

                    severity = "minor"
                    if expression in ["综上所述，", "总的来说，"]:
                        severity = "major"

                    self.issues.append(AITraceIssue(
                        issue_type="ai_smell_expression",
                        severity=severity,
                        description=f"AI 味表达: '{expression}'",
                        location=f"位置 {match.start()}-{match.end()}",
                        evidence=context
                    ))

    def calculate_ai_score(self, text: str) -> float:
        """
        计算 AI 痕迹评分（0-1，0 表示无 AI 痕迹，1 表示明显 AI 痕迹）

        Args:
            text: 待评分的文本

        Returns:
            AI 痕迹评分
        """
        issues = self.detect(text)

        if not issues:
            return 0.0

        # 根据问题严重程度计算权重
        severity_weights = {
            "critical": 3.0,
            "major": 2.0,
            "minor": 1.0
        }

        # 计算总分
        total_score = 0.0
        for issue in issues:
            total_score += severity_weights.get(issue.severity, 1.0)

        # 归一化到 0-1
        # 假设每 100 字出现 1 个 major 问题即为 0.5 分
        text_length = len(text) / 100  # 以百字为单位
        normalized_score = min(total_score / (text_length + 1), 1.0)

        return normalized_score

    def get_report(self, text: str) -> Dict:
        """
        获取 AI 痕迹检测报告

        Args:
            text: 待检测的文本

        Returns:
            检测报告
        """
        issues = self.detect(text)
        score = self.calculate_ai_score(text)

        # 统计问题类型
        issue_types = {}
        for issue in issues:
            issue_types[issue.issue_type] = issue_types.get(issue.issue_type, 0) + 1

        # 统计严重程度
        severity_counts = {
            "critical": 0,
            "major": 0,
            "minor": 0
        }
        for issue in issues:
            severity_counts[issue.severity] += 1

        return {
            "ai_trace_score": score,
            "total_issues": len(issues),
            "severity_breakdown": severity_counts,
            "issue_type_breakdown": issue_types,
            "issues": [
                {
                    "type": issue.issue_type,
                    "severity": issue.severity,
                    "description": issue.description,
                    "location": issue.location,
                    "evidence": issue.evidence
                }
                for issue in issues
            ]
        }
