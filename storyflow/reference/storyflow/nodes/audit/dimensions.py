"""
审计维度定义 - 33 个文学审计维度
"""

from enum import Enum
from typing import Dict, List


class AuditSeverity(Enum):
    """问题严重程度"""
    CRITICAL = "critical"  # 严重：必须修复
    MAJOR = "major"  # 主要：建议修复
    MINOR = "minor"  # 次要：可选修复


class AuditDimension:
    """审计维度定义"""

    def __init__(
        self,
        dimension_id: str,
        name: str,
        description: str,
        check_prompt: str,
        weight: float = 1.0
    ):
        self.dimension_id = dimension_id
        self.name = name
        self.description = description
        self.check_prompt = check_prompt
        self.weight = weight

    def to_dict(self) -> Dict:
        """转换为字典"""
        return {
            "dimension_id": self.dimension_id,
            "name": self.name,
            "description": self.description,
            "check_prompt": self.check_prompt,
            "weight": self.weight
        }


# 33 个审计维度定义
_DIMENSIONS: List[AuditDimension] = [
    # 1. 角色记忆一致性
    AuditDimension(
        dimension_id="character_memory_consistency",
        name="角色记忆一致性",
        description="检查角色在不同章节中的记忆是否保持一致",
        check_prompt="""检查草稿中角色的记忆是否与之前章节保持一致：
1. 角色是否记得已经经历过的事件？
2. 角色对其他角色的认知是否连续？
3. 角色对世界的认知是否有矛盾？

如果发现不一致，请指出具体问题和位置。""",
        weight=1.2
    ),

    # 2. 物资连续性
    AuditDimension(
        dimension_id="resource_continuity",
        name="物资连续性",
        description="检查角色物品、装备、资源的连续性",
        check_prompt="""检查草稿中的物资使用是否连续：
1. 角色拥有的物品是否与之前一致？
2. 消耗的物品是否被正确记录？
3. 新获得的物品是否合理？

如果发现不连续，请指出具体问题和位置。""",
        weight=1.0
    ),

    # 3. 伏笔回收
    AuditDimension(
        dimension_id="foreshadowing_resolution",
        name="伏笔回收",
        description="检查伏笔是否得到合理的回收或延续",
        check_prompt="""检查草稿中的伏笔处理：
1. 之前章节设置的伏笔是否被提及或推进？
2. 本章节是否设置了新的伏笔？
3. 伏笔的埋设和回收是否自然？

如果发现伏笔处理不当，请指出具体问题和位置。""",
        weight=1.3
    ),

    # 4. 大纲偏离度
    AuditDimension(
        dimension_id="outline_deviation",
        name="大纲偏离度",
        description="检查内容是否符合原定大纲规划",
        check_prompt="""检查草稿是否符合大纲规划：
1. 当前章节内容是否偏离大纲设定的主线？
2. 关键情节是否按计划推进？
3. 角色发展路径是否与大纲一致？

如果发现严重偏离，请指出具体问题和位置。""",
        weight=1.5
    ),

    # 5. 叙事节奏
    AuditDimension(
        dimension_id="narrative_pacing",
        name="叙事节奏",
        description="检查叙事节奏是否合理，有无过快或过慢的问题",
        check_prompt="""检查草稿的叙事节奏：
1. 信息呈现是否过快，读者难以消化？
2. 某些段落是否拖沓，影响阅读体验？
3. 节奏变化是否合理，与情节高潮匹配？

如果发现节奏问题，请指出具体问题和位置。""",
        weight=1.0
    ),

    # 6. 情感弧线
    AuditDimension(
        dimension_id="emotional_arc",
        name="情感弧线",
        description="检查角色情感变化的合理性和连贯性",
        check_prompt="""检查草稿中的情感弧线：
1. 角色情感变化是否有足够的铺垫？
2. 情感转折是否自然，符合角色性格？
3. 情感强度是否与情境匹配？

如果发现情感弧线问题，请指出具体问题和位置。""",
        weight=1.2
    ),

    # 7. AI 痕迹检测
    AuditDimension(
        dimension_id="ai_trace_detection",
        name="AI 痕迹检测",
        description="检测文本中是否存在 AI 生成痕迹",
        check_prompt="""检测草稿中的 AI 生成痕迹：
1. 是否存在过度使用的陈词滥调？
2. 句式是否过于单一重复？
3. 是否缺乏细节和个性化表达？
4. 是否有明显的" AI 味"表达？

如果发现 AI 痕迹，请指出具体问题和位置。""",
        weight=1.5
    ),

    # 8. 时间线一致性
    AuditDimension(
        dimension_id="timeline_consistency",
        name="时间线一致性",
        description="检查时间流逝的合理性和一致性",
        check_prompt="""检查草稿中的时间线一致性：
1. 事件发生的时间顺序是否清晰？
2. 时间流逝的描述是否合理？
3. 是否存在时间矛盾或逻辑错误？

如果发现时间线问题，请指出具体问题和位置。""",
        weight=1.2
    ),

    # 9. 地理位置合理性
    AuditDimension(
        dimension_id="geographic_consistency",
        name="地理位置合理性",
        description="检查地理位置和移动路线的合理性",
        check_prompt="""检查草稿中的地理位置：
1. 角色移动的路线是否合理？
2. 地点之间的距离和时间是否匹配？
3. 地理描述是否与世界观设定一致？

如果发现地理位置问题，请指出具体问题和位置。""",
        weight=1.0
    ),

    # 10. 人物行为符合人设
    AuditDimension(
        dimension_id="character_behavior_consistency",
        name="人物行为符合人设",
        description="检查角色行为是否符合其人设和性格",
        check_prompt="""检查草稿中角色行为的一致性：
1. 角色行为是否符合其性格设定？
2. 角色决策是否与其价值观一致？
3. 角色反应是否与其背景相符？

如果发现行为与人设不符，请指出具体问题和位置。""",
        weight=1.3
    ),

    # 11. 信息边界遵守
    AuditDimension(
        dimension_id="information_boundary",
        name="信息边界遵守",
        description="检查信息揭露的时机和范围是否合理",
        check_prompt="""检查草稿中的信息揭露：
1. 角色获得信息的时机是否合理？
2. 信息揭露的范围是否恰当，不过早也不过晚？
3. 视角角色的知情范围是否合理？

如果发现信息边界问题，请指出具体问题和位置。""",
        weight=1.0
    ),

    # 12. 物理规律一致性
    AuditDimension(
        dimension_id="physical_consistency",
        name="物理规律一致性",
        description="检查物理规律的遵守情况（除非有魔法设定）",
        check_prompt="""检查草稿中的物理规律一致性：
1. 动作描写是否符合基本物理规律？
2. 时间、空间、重力的描述是否合理？
3. 如果存在魔法，是否遵循既定规则？

如果发现物理规律问题，请指出具体问题和位置。""",
        weight=1.0
    ),

    # 13. 社会规则合理性
    AuditDimension(
        dimension_id="social_rules_consistency",
        name="社会规则合理性",
        description="检查社会规则、文化习俗的合理性",
        check_prompt="""检查草稿中的社会规则：
1. 社会关系和行为是否符合设定文化？
2. 权力结构和等级制度是否合理？
3. 文化习俗和礼仪是否一致？

如果发现社会规则问题，请指出具体问题和位置。""",
        weight=1.0
    ),

    # 14. 语言风格统一性
    AuditDimension(
        dimension_id="language_style_consistency",
        name="语言风格统一性",
        description="检查文本语言风格是否统一",
        check_prompt="""检查草稿的语言风格：
1. 文本风格是否保持一致？
2. 词汇选择是否符合整体基调？
3. 句式风格是否统一？

如果发现语言风格问题，请指出具体问题和位置。""",
        weight=1.0
    ),

    # 15. 对话自然度
    AuditDimension(
        dimension_id="dialogue_naturalness",
        name="对话自然度",
        description="检查对话是否自然、符合角色个性",
        check_prompt="""检查草稿中的对话：
1. 对话是否符合角色身份和性格？
2. 对话是否自然流畅，不生硬？
3. 对话是否推动情节或展现角色？

如果发现对话问题，请指出具体问题和位置。""",
        weight=1.2
    ),

    # 16. 描写丰富度
    AuditDimension(
        dimension_id="description_richness",
        name="描写丰富度",
        description="检查场景、人物、动作描写的丰富性",
        check_prompt="""检查草稿的描写丰富度：
1. 场景描写是否有画面感？
2. 人物描写是否立体生动？
3. 动作描写是否具体细致？
4. 感官描写（视、听、嗅、味、触）是否充分？

如果发现描写不足，请指出具体问题和位置。""",
        weight=1.0
    ),

    # 17. 情节推进速度
    AuditDimension(
        dimension_id="plot_progression",
        name="情节推进速度",
        description="检查情节推进的速度是否合理",
        check_prompt="""检查草稿的情节推进：
1. 情节推进是否太慢，缺乏实质进展？
2. 情节推进是否太快，缺乏铺垫？
3. 关键转折点是否有足够的积累？

如果发现情节推进问题，请指出具体问题和位置。""",
        weight=1.1
    ),

    # 18. 冲突设置合理性
    AuditDimension(
        dimension_id="conflict_setup",
        name="冲突设置合理性",
        description="检查冲突的设置、发展和解决是否合理",
        check_prompt="""检查草稿中的冲突设置：
1. 冲突的引入是否自然？
2. 冲突的发展是否符合逻辑？
3. 冲突的解决是否合理或为后续埋下伏笔？

如果发现冲突设置问题，请指出具体问题和位置。""",
        weight=1.2
    ),

    # 19. 角色动机合理性
    AuditDimension(
        dimension_id="character_motivation",
        name="角色动机合理性",
        description="检查角色行为动机是否合理、充分",
        check_prompt="""检查草稿中角色的动机：
1. 角色行为是否有明确的动机？
2. 动机是否充分，符合角色背景？
3. 动机是否被合理揭示？

如果发现动机问题，请指出具体问题和位置。""",
        weight=1.3
    ),

    # 20. 逻辑自洽性
    AuditDimension(
        dimension_id="logical_consistency",
        name="逻辑自洽性",
        description="检查文本内部逻辑的一致性",
        check_prompt="""检查草稿的逻辑自洽性：
1. 前因后果是否清晰合理？
2. 推理过程是否严密？
3. 是否存在逻辑矛盾或漏洞？

如果发现逻辑问题，请指出具体问题和位置。""",
        weight=1.4
    ),

    # 21. 细节描写准确性
    AuditDimension(
        dimension_id="detail_accuracy",
        name="细节描写准确性",
        description="检查细节描写的准确性和可信度",
        check_prompt="""检查草稿中的细节描写：
1. 细节描写是否符合设定？
2. 细节是否有助于营造真实感？
3. 细节是否前后一致？

如果发现细节描写问题，请指出具体问题和位置。""",
        weight=1.0
    ),

    # 22. 比喻和修辞恰当性
    AuditDimension(
        dimension_id="metaphor_appropriateness",
        name="比喻和修辞恰当性",
        description="检查比喻和修辞是否恰当、新颖",
        check_prompt="""检查草稿中的比喻和修辞：
1. 比喻是否贴切，不生硬？
2. 修辞手法是否有助于表达？
3. 修辞是否过度使用，影响可读性？

如果发现修辞问题，请指出具体问题和位置。""",
        weight=0.8
    ),

    # 23. 情感描写深度
    AuditDimension(
        dimension_id="emotional_depth",
        name="情感描写深度",
        description="检查情感描写的深度和感染力",
        check_prompt="""检查草稿中的情感描写：
1. 情感描写是否深入，不流于表面？
2. 情感是否能够感染读者？
3. 情感是否通过具体细节展现，而非直接陈述？

如果发现情感描写问题，请指出具体问题和位置。""",
        weight=1.1
    ),

    # 24. 节奏把控
    AuditDimension(
        dimension_id="rhythm_control",
        name="节奏把控",
        description="检查整体节奏的把控是否得当",
        check_prompt="""检查草稿的节奏把控：
1. 快慢节奏的切换是否合理？
2. 高潮前的铺垫是否充分？
3. 节奏是否服务于情节和情感？

如果发现节奏把控问题，请指出具体问题和位置。""",
        weight=1.0
    ),

    # 25. 高潮设置
    AuditDimension(
        dimension_id="climax_setup",
        name="高潮设置",
        description="检查高潮的设置和呈现是否有效",
        check_prompt="""检查草稿中的高潮设置：
1. 高潮是否有足够的铺垫？
2. 高潮是否令人印象深刻？
3. 高潮的解决是否合理？

如果发现高潮设置问题，请指出具体问题和位置。""",
        weight=1.3
    ),

    # 26. 结局合理性
    AuditDimension(
        dimension_id="ending_appropriateness",
        name="结局合理性",
        description="检查结局（或章节结尾）是否合理",
        check_prompt="""检查草稿的结局：
1. 结局是否与整体基调一致？
2. 结局是否给读者满足感？
3. 结局是否为后续发展留有空间（如适用）？

如果发现结局问题，请指出具体问题和位置。""",
        weight=1.2
    ),

    # 27. 伏笔密度
    AuditDimension(
        dimension_id="foreshadowing_density",
        name="伏笔密度",
        description="检查伏笔设置的密度是否合理",
        check_prompt="""检查草稿的伏笔密度：
1. 伏笔是否过少，缺乏吸引力？
2. 伏笔是否过多，让读者困惑？
3. 伏笔的分布是否均衡？

如果发现伏笔密度问题，请指出具体问题和位置。""",
        weight=0.9
    ),

    # 28. 世界观一致性
    AuditDimension(
        dimension_id="worldview_consistency",
        name="世界观一致性",
        description="检查世界观设定的统一性",
        check_prompt="""检查草稿的世界观一致性：
1. 世界设定是否与之前章节一致？
2. 魔法/科技/社会规则是否统一？
3. 世界观细节是否有矛盾？

如果发现世界观问题，请指出具体问题和位置。""",
        weight=1.4
    ),

    # 29. 角色成长轨迹
    AuditDimension(
        dimension_id="character_growth",
        name="角色成长轨迹",
        description="检查角色的成长和变化是否合理",
        check_prompt="""检查草稿中角色的成长：
1. 角色是否有实质性的成长？
2. 成长是否自然，有足够的铺垫？
3. 成长方向是否符合角色设定？

如果发现角色成长问题，请指出具体问题和位置。""",
        weight=1.2
    ),

    # 30. 副线推进
    AuditDimension(
        dimension_id="subplot_progression",
        name="副线推进",
        description="检查副线的推进和交织情况",
        check_prompt="""检查草稿中的副线推进：
1. 副线是否有实质性进展？
2. 副线与主线的交织是否自然？
3. 副线是否被合理提及或暂时搁置？

如果发现副线推进问题，请指出具体问题和位置。""",
        weight=0.9
    ),

    # 31. 主题表达清晰度
    AuditDimension(
        dimension_id="theme_clarity",
        name="主题表达清晰度",
        description="检查主题表达是否清晰深刻",
        check_prompt="""检查草稿的主题表达：
1. 本章是否体现了作品的核心主题？
2. 主题表达是否清晰，不晦涩？
3. 主题是否通过具体情节展现，而非说教？

如果发现主题表达问题，请指出具体问题和位置。""",
        weight=1.1
    ),

    # 32. 读者代入感
    AuditDimension(
        dimension_id="reader_immersion",
        name="读者代入感",
        description="检查读者的代入感和参与度",
        check_prompt="""检查草稿的读者代入感：
1. 描写是否让读者有身临其境之感？
2. 角色是否能引起读者共鸣？
3. 情节是否能吸引读者继续阅读？

如果发现代入感问题，请指出具体问题和位置。""",
        weight=1.0
    ),

    # 33. 文学性
    AuditDimension(
        dimension_id="literary_quality",
        name="文学性",
        description="检查文本的文学价值和艺术水准",
        check_prompt="""检查草稿的文学性：
1. 文字是否有美感？
2. 结构是否精巧？
3. 是否有独特的表达或创新？
4. 是否能给读者新的思考或感受？

如果发现文学性问题，请指出具体问题和位置。""",
        weight=1.0
    ),
]


def get_all_dimensions() -> List[AuditDimension]:
    """获取所有审计维度"""
    return _DIMENSIONS


def get_dimension(dimension_id: str) -> AuditDimension:
    """根据 ID 获取维度"""
    for dim in _DIMENSIONS:
        if dim.dimension_id == dimension_id:
            return dim
    raise ValueError(f"未找到维度: {dimension_id}")
