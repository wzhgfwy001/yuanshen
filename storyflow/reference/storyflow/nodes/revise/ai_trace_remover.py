"""AI 痕迹去除器 - 去 AI 味算法"""

import re
import random
from typing import List, Dict, Any, Tuple


class AIWordList:
    """AI 词汇疲劳词表"""

    # 常见的 AI 用词（需要替换或删除）
    COMMON_WORDS = [
        "在这个基础上", "基于此", "与此同时", "此外", "另外", "此外",
        "值得注意的是", "可以说", "显而易见", "毫无疑问", "毋庸置疑",
        "本质上", "从根本上", "综上所述", "总而言之",
        "进一步来说", "具体来说", "一般来说", "通常来说",
        "可以说", "事实上", "实际上", "显然", "当然",
    ]

    # AI 常用的形容词（过度使用）
    ADJECTIVES = [
        "独特的", "精彩的", "完美的", "惊人的", "壮观的",
        "不可思议的", "令人惊叹的", "极其", "非常",
        "格外", "特别", "相当", "十分",
    ]

    # AI 常用的句式开头
    OPENERS = [
        "值得注意的是", "值得一提的是", "需要强调的是",
        "重要的是", "关键在于", "核心在于",
        "这就意味着", "这就表明", "这就说明",
    ]

    @staticmethod
    def get_all_words() -> List[str]:
        """获取所有需要检查的词汇"""
        return AIWordList.COMMON_WORDS + AIWordList.ADJECTIVES + AIWordList.OPENERS


class BannedPatterns:
    """禁用句式"""

    # 过度说教的句式
    PREACHING_PATTERNS = [
        r"我们要知道[，。]",  # 我们要知道，
        r"应该明白[，。]",   # 应该明白，
        r"必须认识到[，。]",  # 必须认识到，
        r"这告诉我们[，。]",  # 这告诉我们，
    ]

    # 过度解释的句式
    OVER_EXPLANATION = [
        r"也就是说[，。]",    # 也就是说，
        r"换句话说[，。]",    # 换句话说，
        r"简而言之[，。]",    # 简而言之，
        r"换言之[，。]",      # 换言之，
    ]

    # 过度连接的句式
    OVER_CONNECTIVE = [
        r"因此，[^\n]{10,}，所以",  # 因此，...，所以
        r"此外，[^\n]{5,}。此外，",  # 此外，...。此外，
    ]

    @staticmethod
    def get_all_patterns() -> List[str]:
        """获取所有需要检查的句式模式"""
        return (
            BannedPatterns.PREACHING_PATTERNS +
            BannedPatterns.OVER_EXPLANATION +
            BannedPatterns.OVER_CONNECTIVE
        )


class AITraceRemover:
    """AI 痕迹去除器"""

    def __init__(self, config: Dict[str, Any] = None):
        """
        初始化 AI 痕迹去除器

        Args:
            config: 配置字典，可包含：
                - word_replacement_rate: 词汇替换率 (0-1)
                - pattern_removal_rate: 句式移除率 (0-1)
                - min_sentence_length: 最小句长
                - max_sentence_length: 最大句长
        """
        self.config = config or {}
        self.word_replacement_rate = self.config.get("word_replacement_rate", 0.8)
        self.pattern_removal_rate = self.config.get("pattern_removal_rate", 0.9)
        self.min_sentence_length = self.config.get("min_sentence_length", 5)
        self.max_sentence_length = self.config.get("max_sentence_length", 50)

    def remove_ai_traces(self, text: str, style_fingerprint: Dict[str, Any] = None) -> str:
        """
        去除 AI 痕迹

        Args:
            text: 待处理的文本
            style_fingerprint: 文风指纹（可选）

        Returns:
            处理后的文本
        """
        # 1. 处理疲劳词汇
        text = self._remove_fatigued_words(text)

        # 2. 处理禁用句式
        text = self._remove_banned_patterns(text)

        # 3. 注入文风指纹
        if style_fingerprint:
            text = self._inject_style_fingerprint(text, style_fingerprint)

        # 4. 调整句长多样性
        text = self._adjust_sentence_diversity(text)

        return text

    def _remove_fatigued_words(self, text: str) -> str:
        """移除疲劳词汇"""
        words_to_remove = AIWordList.get_all_words()

        result = text
        for word in words_to_remove:
            if random.random() < self.word_replacement_rate:
                # 尝试移除或替换
                if word in ["在这个基础上", "基于此", "与此同时"]:
                    # 这些词通常可以安全删除
                    result = result.replace(word, "")
                elif word in ["可以说", "显然", "显然"]:
                    # 替换为更自然的表达
                    replacements = ["", "其实", "确实"]
                    result = result.replace(word, random.choice(replacements))
                else:
                    # 其他情况直接删除
                    result = result.replace(word, "")

        # 清理多余的空格和标点
        result = re.sub(r'\s+', ' ', result)
        result = re.sub(r'[，。]{2,}', '，', result)

        return result

    def _remove_banned_patterns(self, text: str) -> str:
        """移除禁用句式"""
        patterns = BannedPatterns.get_all_patterns()

        result = text
        for pattern in patterns:
            if random.random() < self.pattern_removal_rate:
                # 移除匹配的句式
                result = re.sub(pattern, "", result)

        # 清理多余的标点
        result = re.sub(r'[，。]{2,}', '，', result)
        result = re.sub(r'\s+', ' ', result)

        return result

    def _inject_style_fingerprint(self, text: str, fingerprint: Dict[str, Any]) -> str:
        """
        注入文风指纹

        Args:
            text: 文本
            fingerprint: 文风指纹字典，包含：
                - sentence_length_avg: 平均句长
                - sentence_length_var: 句长方差
                - paragraph_length: 段落长度偏好
                - punctuation_style: 标点风格

        Returns:
            注入文风后的文本
        """
        if not fingerprint:
            return text

        sentences = re.split(r'[。！？]', text)
        sentences = [s.strip() for s in sentences if s.strip()]

        # 根据文风指纹调整句长
        target_avg = fingerprint.get("sentence_length_avg", 20)
        result_sentences = []

        for sentence in sentences:
            current_length = len(sentence)
            if current_length < target_avg * 0.7:
                # 句子太短，考虑合并
                if result_sentences:
                    result_sentences[-1] += "，" + sentence
                else:
                    result_sentences.append(sentence)
            elif current_length > target_avg * 1.5:
                # 句子太长，考虑拆分
                parts = re.split(r'[，；]', sentence)
                for part in parts:
                    if part.strip():
                        result_sentences.append(part.strip())
            else:
                result_sentences.append(sentence)

        return "。".join(result_sentences) + "。"

    def _adjust_sentence_diversity(self, text: str) -> str:
        """调整句长多样性"""
        sentences = re.split(r'[。！？]', text)
        sentences = [s.strip() for s in sentences if s.strip()]

        # 分析句长分布
        lengths = [len(s) for s in sentences]
        if not lengths:
            return text

        avg_length = sum(lengths) / len(lengths)
        min_len = max(self.min_sentence_length, avg_length * 0.5)
        max_len = min(self.max_sentence_length, avg_length * 2)

        # 调整极端句长的句子
        result = []
        for sentence in sentences:
            if len(sentence) < min_len:
                # 句子太短，考虑与前后合并
                if result and len(result[-1]) < max_len:
                    result[-1] += "，" + sentence
                else:
                    result.append(sentence)
            elif len(sentence) > max_len:
                # 句子太长，尝试拆分
                parts = re.split(r'[，；；,]', sentence)
                current = ""
                for part in parts:
                    if len(current) + len(part) < max_len:
                        current += ("，" if current else "") + part
                    else:
                        if current:
                            result.append(current)
                        current = part
                if current:
                    result.append(current)
            else:
                result.append(sentence)

        return "。".join(result) + "。"

    def analyze_ai_traces(self, text: str) -> Dict[str, Any]:
        """
        分析文本中的 AI 痕迹

        Args:
            text: 待分析的文本

        Returns:
            AI 痕迹分析报告
        """
        words_to_check = AIWordList.get_all_words()
        patterns_to_check = BannedPatterns.get_all_patterns()

        found_words = []
        found_patterns = []

        # 检查疲劳词汇
        for word in words_to_check:
            count = text.count(word)
            if count > 0:
                found_words.append({"word": word, "count": count})

        # 检查禁用句式
        for pattern in patterns_to_check:
            matches = re.findall(pattern, text)
            if matches:
                found_patterns.append({"pattern": pattern, "count": len(matches)})

        return {
            "fatigued_words": found_words,
            "banned_patterns": found_patterns,
            "word_count": len(text),
            "ai_score": self._calculate_ai_score(found_words, found_patterns, len(text))
        }

    def _calculate_ai_score(self, words: List[Dict], patterns: List[Dict], text_length: int) -> float:
        """计算 AI 痕迹得分"""
        if text_length == 0:
            return 0.0

        word_weight = sum(item["count"] for item in words) / max(text_length / 100, 1)
        pattern_weight = sum(item["count"] for item in patterns) / max(text_length / 200, 1)

        # 综合得分（0-1，越高表示 AI 痕迹越明显）
        total_score = (word_weight * 0.6 + pattern_weight * 0.4)
        return min(total_score, 1.0)
