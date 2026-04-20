"""
审计节点配置
管理审计阈值、权重和参数
"""

from typing import Dict, List


class AuditConfig:
    """审计配置类"""

    # 审计阈值
    PASS_THRESHOLD = 0.7  # 通过阈值（得分 ≥ 此值且无严重问题）
    CRITICAL_THRESHOLD = 0.4  # 严重问题阈值（得分 < 此值为严重）

    # AI 痕迹阈值
    AI_TRACE_THRESHOLD = 0.5  # AI 痕迹评分 ≤ 此值才能通过

    # 批处理配置
    BATCH_SIZE = 5  # 每批审计的维度数量

    # 问题严重程度定义
    SEVERITY_DEFINITIONS = {
        "critical": {
            "description": "严重问题，必须修复",
            "score_penalty": 1.0,
            "blocks_pass": True
        },
        "major": {
            "description": "主要问题，建议修复",
            "score_penalty": 0.5,
            "blocks_pass": False
        },
        "minor": {
            "description": "次要问题，可选修复",
            "score_penalty": 0.1,
            "blocks_pass": False
        }
    }

    # AI 痕迹检测配置
    AI_TRACE_CONFIG = {
        "high_frequency_word_threshold": 0.005,  # 高频词阈值（0.5%）
        "sentence_variance_threshold": 100,  # 句式方差阈值
        "repetitive_start_threshold": 0.1,  # 重复开头阈值（10%）
        "over_summarization_threshold": 3,  # 过度总结阈值（每千字 3 次）
    }

    # 维度权重（可在运行时覆盖）
    DEFAULT_DIMENSION_WEIGHTS: Dict[str, float] = {
        "角色记忆一致性": 1.2,
        "物资连续性": 1.0,
        "伏笔回收": 1.3,
        "大纲偏离度": 1.5,
        "叙事节奏": 1.0,
        "情感弧线": 1.2,
        "AI 痕迹检测": 1.5,
        "时间线一致性": 1.2,
        "地理位置合理性": 1.0,
        "人物行为符合人设": 1.3,
        "信息边界遵守": 1.0,
        "物理规律一致性": 1.0,
        "社会规则合理性": 1.0,
        "语言风格统一性": 1.0,
        "对话自然度": 1.2,
        "描写丰富度": 1.0,
        "情节推进速度": 1.1,
        "冲突设置合理性": 1.2,
        "角色动机合理性": 1.3,
        "逻辑自洽性": 1.4,
        "细节描写准确性": 1.0,
        "比喻和修辞恰当性": 0.8,
        "情感描写深度": 1.1,
        "节奏把控": 1.0,
        "高潮设置": 1.3,
        "结局合理性": 1.2,
        "伏笔密度": 0.9,
        "世界观一致性": 1.4,
        "角色成长轨迹": 1.2,
        "副线推进": 0.9,
        "主题表达清晰度": 1.1,
        "读者代入感": 1.0,
        "悬念设置": 1.0,
        "文学性": 1.0,
    }

    # LLM 配置
    LLM_CONFIG = {
        "model": "qwen-plus",  # 默认模型
        "timeout": 30.0,  # 超时时间（秒）
        "max_retries": 3,  # 最大重试次数
        "temperature": 0.7,  # 温度参数
    }

    # 输出格式配置
    OUTPUT_CONFIG = {
        "include_dimension_scores": True,  # 是否包含各维度得分
        "include_ai_trace_report": True,  # 是否包含 AI 痕迹报告
        "include_full_issues": True,  # 是否包含完整问题列表
        "format": "dict",  # 输出格式: dict, yaml, json
    }

    # 增量审计配置
    INCREMENTAL_CONFIG = {
        "enabled": True,  # 是否启用增量审计
        "min_new_content_length": 10,  # 最小新增内容长度
        "overlap_length": 50,  # 重叠长度（上下文）
    }

    @classmethod
    def get_severity_penalty(cls, severity: str) -> float:
        """获取问题严重程度的扣分权重"""
        return cls.SEVERITY_DEFINITIONS.get(severity, {}).get("score_penalty", 0.1)

    @classmethod
    def get_severity_blocks_pass(cls, severity: str) -> bool:
        """检查问题是否会导致审计不通过"""
        return cls.SEVERITY_DEFINITIONS.get(severity, {}).get("blocks_pass", False)

    @classmethod
    def update_dimension_weight(cls, dimension_name: str, weight: float):
        """更新维度权重"""
        if dimension_name in cls.DEFAULT_DIMENSION_WEIGHTS:
            cls.DEFAULT_DIMENSION_WEIGHTS[dimension_name] = weight
        else:
            raise ValueError(f"未找到维度: {dimension_name}")

    @classmethod
    def to_dict(cls) -> Dict:
        """导出配置为字典"""
        return {
            "pass_threshold": cls.PASS_THRESHOLD,
            "critical_threshold": cls.CRITICAL_THRESHOLD,
            "ai_trace_threshold": cls.AI_TRACE_THRESHOLD,
            "batch_size": cls.BATCH_SIZE,
            "severity_definitions": cls.SEVERITY_DEFINITIONS,
            "ai_trace_config": cls.AI_TRACE_CONFIG,
            "dimension_weights": cls.DEFAULT_DIMENSION_WEIGHTS,
            "llm_config": cls.LLM_CONFIG,
            "output_config": cls.OUTPUT_CONFIG,
            "incremental_config": cls.INCREMENTAL_CONFIG,
        }


# 预设配置
class AuditPresets:
    """预设配置"""

    @classmethod
    def strict(cls) -> Dict:
        """严格模式（高质量要求）"""
        config = AuditConfig.to_dict()
        config["pass_threshold"] = 0.85
        config["ai_trace_threshold"] = 0.3
        config["dimension_weights"] = {
            k: v * 1.2 for k, v in config["dimension_weights"].items()
        }
        return config

    @classmethod
    def normal(cls) -> Dict:
        """正常模式（标准要求）"""
        return AuditConfig.to_dict()

    @classmethod
    def relaxed(cls) -> Dict:
        """宽松模式（初稿检查）"""
        config = AuditConfig.to_dict()
        config["pass_threshold"] = 0.6
        config["ai_trace_threshold"] = 0.7
        config["dimension_weights"] = {
            k: v * 0.8 for k, v in config["dimension_weights"].items()
        }
        return config

    @classmethod
    def draft_only(cls) -> Dict:
        """仅初稿模式（只检查严重问题）"""
        config = AuditConfig.to_dict()
        config["pass_threshold"] = 0.5
        config["ai_trace_threshold"] = 0.8
        config["dimension_weights"] = {
            k: v * 0.5 for k, v in config["dimension_weights"].items()
        }
        # 只关注严重问题
        config["severity_definitions"]["major"]["blocks_pass"] = False
        config["severity_definitions"]["minor"]["blocks_pass"] = False
        return config


# 辅助函数
def load_custom_config(config_path: str) -> Dict:
    """加载自定义配置"""
    import json

    try:
        with open(config_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        raise ValueError(f"加载配置文件失败: {str(e)}")


def save_config(config: Dict, output_path: str):
    """保存配置到文件"""
    import json

    try:
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(config, f, ensure_ascii=False, indent=2)
    except Exception as e:
        raise ValueError(f"保存配置文件失败: {str(e)}")


# 使用示例
if __name__ == "__main__":
    print("=== 审计配置示例 ===\n")

    # 获取默认配置
    print("1. 默认配置:")
    default_config = AuditConfig.to_dict()
    print(f"   通过阈值: {default_config['pass_threshold']}")
    print(f"   AI 痕迹阈值: {default_config['ai_trace_threshold']}")
    print(f"   批处理大小: {default_config['batch_size']}")

    # 获取预设配置
    print("\n2. 严格模式:")
    strict_config = AuditPresets.strict()
    print(f"   通过阈值: {strict_config['pass_threshold']}")
    print(f"   AI 痕迹阈值: {strict_config['ai_trace_threshold']}")

    print("\n3. 宽松模式:")
    relaxed_config = AuditPresets.relaxed()
    print(f"   通过阈值: {relaxed_config['pass_threshold']}")
    print(f"   AI 痕迹阈值: {relaxed_config['ai_trace_threshold']}")

    # 获取问题扣分权重
    print("\n4. 问题扣分权重:")
    for severity in ["critical", "major", "minor"]:
        penalty = AuditConfig.get_severity_penalty(severity)
        blocks_pass = AuditConfig.get_severity_blocks_pass(severity)
        print(f"   {severity}: 扣分 {penalty}, 阻塞通过: {blocks_pass}")
