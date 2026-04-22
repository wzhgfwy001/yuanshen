"""文风指纹 - 用于个性化文本生成和修订"""

import re
from typing import Dict, Any, List, Optional
from collections import Counter
import numpy as np


class StyleFingerprint:
    """文风指纹类"""

    def __init__(self, config: Dict[str, Any] = None):
        """
        初始化文风指纹

        Args:
            config: 配置字典
        """
        self.config = config or {}
        self.fingerprint: Optional[Dict[str, Any]] = None

    def extract(self, text: str) -> Dict[str, Any]:
        """
        从文本中提取文风指纹

        Args:
            text: 文本内容

        Returns:
            文风指纹字典
        """
        # 分句
        sentences = re.split(r'[。！？]', text)
        sentences = [s.strip() for s in sentences if s.strip()]

        # 分段
        paragraphs = [p.strip() for p in text.split('\n') if p.strip()]

        if not sentences:
            return self._get_empty_fingerprint()

        # 基础统计
        sentence_lengths = [len(s) for s in sentences]
        paragraph_lengths = [len(p) for p in paragraphs] if paragraphs else [len(text)]

        fingerprint = {
            # 句长特征
            "sentence_length_avg": float(np.mean(sentence_lengths)),
            "sentence_length_std": float(np.std(sentence_lengths)),
            "sentence_length_min": float(np.min(sentence_lengths)),
            "sentence_length_max": float(np.max(sentence_lengths)),

            # 段落特征
            "paragraph_length_avg": float(np.mean(paragraph_lengths)),
            "paragraph_length_std": float(np.std(paragraph_lengths)),

            # 词汇特征
            "unique_word_ratio": self._calculate_unique_ratio(text),
            "avg_word_length": self._calculate_avg_word_length(text),

            # 标点风格
            "punctuation_style": self._analyze_punctuation(text),

            # 句式特征
            "sentence_structure": self._analyze_sentence_structure(sentences),

            # 语气特征
            "tone": self._analyze_tone(text),
        }

        self.fingerprint = fingerprint
        return fingerprint

    def _get_empty_fingerprint(self) -> Dict[str, Any]:
        """获取空的文风指纹"""
        return {
            "sentence_length_avg": 0.0,
            "sentence_length_std": 0.0,
            "sentence_length_min": 0.0,
            "sentence_length_max": 0.0,
            "paragraph_length_avg": 0.0,
            "paragraph_length_std": 0.0,
            "unique_word_ratio": 0.0,
            "avg_word_length": 0.0,
            "punctuation_style": {},
            "sentence_structure": {},
            "tone": {}
        }

    def _calculate_unique_ratio(self, text: str) -> float:
        """计算独特词汇比例"""
        if not text:
            return 0.0

        words = re.findall(r'[\u4e00-\u9fa5]+', text)
        if not words:
            return 0.0

        unique_words = set(words)
        return len(unique_words) / len(words)

    def _calculate_avg_word_length(self, text: str) -> float:
        """计算平均词长"""
        if not text:
            return 0.0

        words = re.findall(r'[\u4e00-\u9fa5]+', text)
        if not words:
            return 0.0

        total_chars = sum(len(word) for word in words)
        return total_chars / len(words)

    def _analyze_punctuation(self, text: str) -> Dict[str, float]:
        """分析标点风格"""
        punctuations = ['，', '。', '！', '？', '；', '：', '、', '"', '"', ''', ''']
        counts = Counter(text)

        total = sum(counts.get(p, 0) for p in punctuations)
        if total == 0:
            return {}

        style = {}
        for p in punctuations:
            count = counts.get(p, 0)
            if count > 0:
                style[p] = count / total

        return style

    def _analyze_sentence_structure(self, sentences: List[str]) -> Dict[str, Any]:
        """分析句式结构"""
        if not sentences:
            return {}

        # 短句、中句、长句比例
        short = sum(1 for s in sentences if len(s) < 15)
        medium = sum(1 for s in sentences if 15 <= len(s) < 30)
        long = sum(1 for s in sentences if len(s) >= 30)

        total = len(sentences)

        return {
            "short_ratio": short / total if total > 0 else 0,
            "medium_ratio": medium / total if total > 0 else 0,
            "long_ratio": long / total if total > 0 else 0,
            "avg_clauses_per_sentence": self._count_avg_clauses(sentences)
        }

    def _count_avg_clauses(self, sentences: List[str]) -> float:
        """计算平均分句数"""
        if not sentences:
            return 0.0

        clause_counts = []
        for s in sentences:
            clauses = re.split(r'[，；;]', s)
            clause_counts.append(len(clauses))

        return np.mean(clause_counts)

    def _analyze_tone(self, text: str) -> Dict[str, float]:
        """分析语气特征"""
        # 情感词汇（简化版）
        emotional_words = {
            'happy': ['开心', '快乐', '幸福', '愉快', '喜悦', '兴奋'],
            'sad': ['悲伤', '难过', '痛苦', '伤心', '悲痛', '忧郁'],
            'angry': ['愤怒', '生气', '恼火', '愤怒', '怒火', '愤慨'],
            'calm': ['平静', '安静', '宁静', '冷静', '沉稳', '淡定'],
        }

        tone = {}
        for emotion, words in emotional_words.items():
            count = sum(text.count(word) for word in words)
            tone[emotion] = count

        return tone

    def compare(self, other: 'StyleFingerprint') -> Dict[str, float]:
        """
        比较两个文风指纹的相似度

        Args:
            other: 另一个文风指纹

        Returns:
            相似度得分（0-1，越高越相似）
        """
        if not self.fingerprint or not other.fingerprint:
            return 0.0

        similarities = {}

        # 句长相似度
        sent_len_sim = self._compare_value(
            self.fingerprint["sentence_length_avg"],
            other.fingerprint["sentence_length_avg"]
        )
        similarities["sentence_length"] = sent_len_sim

        # 词汇多样性相似度
        word_div_sim = self._compare_value(
            self.fingerprint["unique_word_ratio"],
            other.fingerprint["unique_word_ratio"]
        )
        similarities["word_diversity"] = word_div_sim

        # 语气相似度
        tone_sim = self._compare_tone(
            self.fingerprint["tone"],
            other.fingerprint["tone"]
        )
        similarities["tone"] = tone_sim

        # 总体相似度
        overall_sim = (
            similarities["sentence_length"] * 0.4 +
            similarities["word_diversity"] * 0.3 +
            similarities["tone"] * 0.3
        )

        similarities["overall"] = overall_sim

        return similarities

    def _compare_value(self, val1: float, val2: float, tolerance: float = 0.2) -> float:
        """比较两个数值的相似度"""
        if val1 == 0 and val2 == 0:
            return 1.0

        diff = abs(val1 - val2)
        avg = (val1 + val2) / 2

        if avg == 0:
            return 0.0

        ratio = diff / avg
        return max(0.0, 1.0 - ratio / tolerance)

    def _compare_tone(self, tone1: Dict[str, float], tone2: Dict[str, float]) -> float:
        """比较语气相似度"""
        all_keys = set(tone1.keys()) | set(tone2.keys())

        if not all_keys:
            return 1.0

        similarities = []
        for key in all_keys:
            val1 = tone1.get(key, 0)
            val2 = tone2.get(key, 0)

            if val1 == 0 and val2 == 0:
                similarities.append(1.0)
            else:
                max_val = max(val1, val2)
                if max_val == 0:
                    similarities.append(1.0)
                else:
                    sim = 1.0 - abs(val1 - val2) / max_val
                    similarities.append(sim)

        return np.mean(similarities)

    def merge(self, other: 'StyleFingerprint', weight: float = 0.5) -> 'StyleFingerprint':
        """
        合并两个文风指纹

        Args:
            other: 另一个文风指纹
            weight: 当前指纹的权重（0-1）

        Returns:
            合并后的文风指纹
        """
        if not self.fingerprint:
            return other

        if not other.fingerprint:
            return self

        merged = StyleFingerprint()
        merged.fingerprint = {}

        for key in self.fingerprint:
            if isinstance(self.fingerprint[key], dict):
                merged.fingerprint[key] = self._merge_dict(
                    self.fingerprint[key],
                    other.fingerprint.get(key, {}),
                    weight
                )
            else:
                merged.fingerprint[key] = (
                    self.fingerprint[key] * weight +
                    other.fingerprint.get(key, 0) * (1 - weight)
                )

        return merged

    def _merge_dict(self, dict1: Dict[str, float], dict2: Dict[str, float], weight: float) -> Dict[str, float]:
        """合并两个字典"""
        all_keys = set(dict1.keys()) | set(dict2.keys())

        merged = {}
        for key in all_keys:
            val1 = dict1.get(key, 0)
            val2 = dict2.get(key, 0)
            merged[key] = val1 * weight + val2 * (1 - weight)

        return merged
