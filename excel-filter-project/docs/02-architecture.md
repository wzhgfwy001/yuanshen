# Excel 筛选查找器 - 技术方案文档

## 一、技术选型

### 1.1 电脑端（Windows 桌面应用）

| 技术组件 | 选型 | 理由 |
|----------|------|------|
| 开发语言 | Python 3.10+ | 生态丰富，Excel 处理库成熟，开发效率高 |
| GUI 框架 | PyQt6 / CustomTkinter | 界面美观，跨平台，组件丰富 |
| Excel 处理 | openpyxl + pandas | 功能强大，支持多种格式，性能好 |
| 数据存储 | SQLite + JSON | 轻量级，无需额外服务，支持本地存储 |
| 打包工具 | PyInstaller / Nuitka | 生成独立 exe，无需安装 Python 环境 |
| 自动更新 | pysimplegui-updater | 支持版本检测和自动更新 |

**推荐方案：Python + CustomTkinter**
- 理由：Modern UI 风格，开发简单，适合工具类应用

### 1.2 微信小程序端

| 技术组件 | 选型 | 理由 |
|----------|------|------|
| 开发框架 | 微信小程序原生 / uni-app | 原生性能好，uni-app 可跨平台 |
| 前端语言 | TypeScript | 类型安全，便于维护 |
| UI 组件库 | Vant Weapp / TDesign | 组件丰富，美观实用 |
| Excel 处理 | 后端处理（云函数） | 小程序端处理能力有限 |
| 数据存储 | 微信云数据库 / 本地缓存 | 轻量级，与微信生态集成 |
| 部署平台 | 微信云开发 | 免运维，按需付费 |

**推荐方案：微信小程序原生 + 云开发**
- 理由：开发成本低，无需后端服务器，适合个人开发者

### 1.3 技术对比

| 维度 | 电脑端 | 小程序端 |
|------|--------|----------|
| 开发成本 | 低 | 中 |
| 用户体验 | 优（大屏、键鼠） | 良（触屏、小屏） |
| 数据处理能力 | 强（本地计算） | 中（依赖云端） |
| 发布难度 | 低（自行分发） | 高（需审核） |
| 更新频率 | 灵活 | 需审核 |
| 适用场景 | 深度使用、批量处理 | 轻量查询、随时随地 |

---

## 二、架构设计

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                      用户界面层 (UI Layer)                    │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │  电脑端 GUI  │  │  微信小程序  │  │  Web 版 (可选) │          │
│  │  (PyQt6)    │  │  (原生)     │  │  (Vue3)     │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    业务逻辑层 (Business Layer)                │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │  数据导入   │  │  筛选引擎   │  │  结果生成   │          │
│  │  (Import)   │  │  (Filter)   │  │  (Export)   │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │  选科匹配   │  │  分数匹配   │  │  冲稳保计算  │          │
│  │  (Subject)  │  │  (Score)    │  │  (Tier)     │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    数据访问层 (Data Layer)                    │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │  Excel 读写  │  │  SQLite DB  │  │  文件存储   │          │
│  │  (openpyxl) │  │  (本地)     │  │  (JSON)     │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      数据层 (Data Source)                     │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │  学校数据   │  │  学生数据   │  │  配置数据   │          │
│  │  (xlsx)     │  │  (xlsx)     │  │  (json)     │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 电脑端架构（MVC 模式）

```
┌─────────────────────────────────────────────────────────────┐
│                         View (视图)                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │  主窗口     │  │  导入对话框  │  │  筛选面板   │          │
│  │  MainWindow │  │ ImportDialog│  │FilterPanel  │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │  结果表格   │  │  设置窗口   │  │  关于窗口   │          │
│  │ResultTable  │  │ SettingsDlg │  │  AboutDlg   │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                       Controller (控制器)                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │  事件处理   │  │  命令处理   │  │  状态管理   │          │
│  │EventHandler │  │CommandHandler│ │ StateManager│          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        Model (模型)                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │  学生模型   │  │  学校模型   │  │  匹配结果   │          │
│  │  Student    │  │   School    │  │   Match     │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
│  ┌─────────────┐  ┌─────────────┐                           │
│  │  数据服务   │  │  筛选服务   │                           │
│  │DataService  │  │FilterService│                           │
│  └─────────────┘  └─────────────┘                           │
└─────────────────────────────────────────────────────────────┘
```

### 2.3 小程序端架构

```
┌─────────────────────────────────────────────────────────────┐
│                      小程序前端 (Mini Program)                │
├─────────────────────────────────────────────────────────────┤
│  pages/                                                      │
│  ├── index/           # 首页（导入、筛选入口）                │
│  ├── import/          # 数据导入页                           │
│  ├── filter/          # 筛选条件设置页                        │
│  ├── result/          # 结果展示页                           │
│  └── profile/         # 个人中心（历史、设置）                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    微信云开发 (Cloud Base)                    │
├─────────────────────────────────────────────────────────────┤
│  云函数/                                                     │
│  ├── importExcel      # Excel 导入处理                       │
│  ├── filterSchools    # 学校筛选                            │
│  ├── exportResult     # 结果导出                            │
│  └── updateData       # 数据更新                            │
│                                                              │
│  云数据库/                                                    │
│  ├── schools          # 学校数据集合                         │
│  ├── students         # 学生数据集合                         │
│  └── results          # 筛选结果集合                         │
│                                                              │
│  云存储/                                                      │
│  └── files/           # Excel 文件存储                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 三、数据库设计

### 3.1 SQLite 数据库 schema（电脑端）

```sql
-- 学校信息表
CREATE TABLE IF NOT EXISTS schools (
    school_id TEXT PRIMARY KEY,
    school_name TEXT NOT NULL,
    province TEXT NOT NULL,
    city TEXT NOT NULL,
    level TEXT NOT NULL,  -- 985/211/双一流/普通
    type TEXT NOT NULL,   -- 理工/综合/师范/...
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 专业信息表
CREATE TABLE IF NOT EXISTS majors (
    major_id TEXT PRIMARY KEY,
    school_id TEXT NOT NULL,
    major_name TEXT NOT NULL,
    major_category TEXT NOT NULL,  -- 理工/文史/医学/...
    subject_requirement TEXT NOT NULL,  -- 物理 + 化学
    subject_required TEXT,  -- 必选科目 JSON 数组
    subject_optional TEXT,  -- 可选科目 JSON 数组
    year INTEGER NOT NULL,
    min_score REAL NOT NULL,
    min_rank INTEGER NOT NULL,
    avg_score REAL,
    enrollment_count INTEGER,
    tuition REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (school_id) REFERENCES schools(school_id)
);

-- 学生信息表
CREATE TABLE IF NOT EXISTS students (
    student_id TEXT PRIMARY KEY,
    student_name TEXT NOT NULL,
    category TEXT NOT NULL,  -- 物理类/历史类
    subjects TEXT NOT NULL,  -- JSON 数组
    total_score REAL NOT NULL,
    rank INTEGER NOT NULL,
    province TEXT NOT NULL,
    preference_province TEXT,  -- JSON 数组
    preference_level TEXT,     -- JSON 数组
    preference_major TEXT,     -- JSON 数组
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 筛选结果表
CREATE TABLE IF NOT EXISTS results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id TEXT NOT NULL,
    school_id TEXT NOT NULL,
    major_id TEXT NOT NULL,
    match_type TEXT NOT NULL,  -- 冲/稳/保
    score_gap REAL NOT NULL,
    rank_gap INTEGER NOT NULL,
    match_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(student_id),
    FOREIGN KEY (school_id) REFERENCES schools(school_id),
    FOREIGN KEY (major_id) REFERENCES majors(major_id)
);

-- 筛选条件模板表
CREATE TABLE IF NOT EXISTS filter_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_name TEXT NOT NULL,
    filter_config TEXT NOT NULL,  -- JSON 配置
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_majors_school ON majors(school_id);
CREATE INDEX IF NOT EXISTS idx_majors_year ON majors(year);
CREATE INDEX IF NOT EXISTS idx_majors_score ON majors(min_score);
CREATE INDEX IF NOT EXISTS idx_majors_rank ON majors(min_rank);
CREATE INDEX IF NOT EXISTS idx_results_student ON results(student_id);
CREATE INDEX IF NOT EXISTS idx_results_match_type ON results(match_type);
```

### 3.2 云数据库集合设计（小程序端）

```javascript
// schools 集合
{
  _id: "SCH001",
  school_name: "清华大学",
  province: "北京",
  city: "北京",
  level: "985/211/双一流",
  type: "理工",
  created_at: new Date(),
  updated_at: new Date()
}

// majors 集合
{
  _id: "MAJ001",
  school_id: "SCH001",
  major_name: "计算机科学与技术",
  major_category: "理工",
  subject_requirement: "物理 + 化学",
  subject_required: ["物理", "化学"],
  subject_optional: [],
  year: 2025,
  min_score: 680,
  min_rank: 100,
  avg_score: 685,
  enrollment_count: 50,
  tuition: 5000
}

// students 集合
{
  _id: "STU001",
  student_name: "张三",
  category: "物理类",
  subjects: ["物理", "化学", "生物"],
  total_score: 650,
  rank: 5000,
  province: "广东",
  preference_province: ["北京", "上海"],
  preference_level: ["985", "211"],
  preference_major: ["理工"],
  created_at: new Date()
}

// results 集合
{
  _id: "RES001",
  student_id: "STU001",
  school_id: "SCH001",
  major_id: "MAJ001",
  match_type: "冲",
  score_gap: -30,
  rank_gap: -4900,
  match_time: new Date()
}
```

---

## 四、核心算法设计

### 4.1 选科匹配算法

```python
def match_subjects(student_subjects, major_required, major_optional):
    """
    选科匹配算法
    
    Args:
        student_subjects: 学生选科列表，如 ['物理', '化学', '生物']
        major_required: 专业必选科目列表，如 ['物理', '化学']
        major_optional: 专业可选科目列表，如 ['生物', '地理']
    
    Returns:
        bool: 是否匹配
    """
    # 必选科目必须全部满足
    if major_required:
        for subj in major_required:
            if subj not in student_subjects:
                return False
    
    # 可选科目：至少选一科（如果有要求）
    if major_optional:
        has_optional = any(subj in student_subjects for subj in major_optional)
        if not has_optional:
            return False
    
    return True
```

### 4.2 冲稳保划分算法

```python
def calculate_tier(student_score, admit_score, student_rank, admit_rank):
    """
    冲稳保划分算法
    
    Args:
        student_score: 学生分数
        admit_score: 往年录取分数
        student_rank: 学生排名
        admit_rank: 往年录取排名
    
    Returns:
        str: '冲' / '稳' / '保'
        float: 分数差距
    """
    score_gap = student_score - admit_score
    rank_gap = admit_rank - student_rank  # 排名越小越好
    
    # 优先按排名判断（更准确）
    if rank_gap >= 1000:  # 排名领先 1000 名以上
        return '保', score_gap
    elif rank_gap >= 0:   # 排名领先
        return '稳', score_gap
    elif rank_gap >= -500:  # 排名落后 500 名以内
        return '冲', score_gap
    else:
        return '不匹配', score_gap
    
    # 备用：按分数判断
    if score_gap >= 10:
        return '保', score_gap
    elif score_gap >= -5:
        return '稳', score_gap
    elif score_gap >= -15:
        return '冲', score_gap
    else:
        return '不匹配', score_gap
```

### 4.3 筛选引擎核心逻辑

```python
def filter_schools(student, schools_data, filters):
    """
    筛选引擎核心逻辑
    
    Args:
        student: 学生信息对象
        schools_data: 学校专业数据列表
        filters: 筛选条件配置
    
    Returns:
        list: 匹配结果列表
    """
    results = []
    
    for major in schools_data:
        # 1. 选科匹配
        if not match_subjects(
            student.subjects,
            major.subject_required,
            major.subject_optional
        ):
            continue
        
        # 2. 分数/排名匹配
        tier, score_gap = calculate_tier(
            student.total_score,
            major.min_score,
            student.rank,
            major.min_rank
        )
        
        if tier == '不匹配':
            continue
        
        # 3. 应用额外筛选条件
        if filters.get('province') and major.province not in filters['province']:
            continue
        if filters.get('level') and major.level not in filters['level']:
            continue
        if filters.get('category') and major.major_category not in filters['category']:
            continue
        
        # 4. 添加结果
        results.append({
            'student_id': student.id,
            'school_name': major.school_name,
            'major_name': major.major_name,
            'match_type': tier,
            'score_gap': score_gap,
            'min_score': major.min_score,
            'min_rank': major.min_rank
        })
    
    # 5. 排序（冲稳保顺序，然后按分数差距）
    tier_order = {'冲': 0, '稳': 1, '保': 2}
    results.sort(key=lambda x: (tier_order[x['match_type']], -x['score_gap']))
    
    return results
```

---

## 五、接口设计

### 5.1 电脑端内部 API

```python
# 数据服务接口
class IDataService:
    def import_excel(self, file_path: str, sheet_type: str) -> bool
    def export_excel(self, data: list, file_path: str) -> bool
    def get_schools(self, filters: dict) -> list
    def get_students(self) -> list
    def save_student(self, student: dict) -> bool
    def delete_student(self, student_id: str) -> bool

# 筛选服务接口
class IFilterService:
    def filter(self, student_id: str, filters: dict) -> list
    def batch_filter(self, student_ids: list, filters: dict) -> dict
    def save_template(self, name: str, config: dict) -> bool
    def load_template(self, name: str) -> dict
```

### 5.2 小程序云函数接口

```javascript
// 云函数：importExcel
exports.main = async (event, context) => {
  const { fileID, sheetType } = event;
  // 1. 下载文件
  // 2. 解析 Excel
  // 3. 写入数据库
  // 4. 返回结果
};

// 云函数：filterSchools
exports.main = async (event, context) => {
  const { studentId, filters } = event;
  // 1. 获取学生信息
  // 2. 执行筛选
  // 3. 保存结果
  // 4. 返回匹配列表
};
```

---

*文档版本：v1.0*
*创建时间：2026-04-04*
*作者：技术架构 Agent*
