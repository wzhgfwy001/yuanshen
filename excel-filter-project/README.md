# Excel 筛选查找器

高考志愿填报辅助工具 - 根据选科条件和分数筛选可报考的学校和专业。

## 功能特点

- ✅ 支持导入 Excel 数据（学校专业表、学生信息表）
- ✅ 智能选科匹配（必选/可选科目）
- ✅ 分数/排名双重匹配
- ✅ 冲稳保三档自动划分
- ✅ 多条件组合筛选
- ✅ 结果导出 Excel

## 快速开始

### 安装依赖

```bash
pip install -r requirements.txt
```

### 运行程序

```bash
cd src
python main.py
```

### 打包为 EXE

```bash
pyinstaller --onefile --windowed --name "Excel 筛选查找器" src/main.py
```

## 数据格式

### 学校专业表 (schools.xlsx)

| 字段 | 说明 | 示例 |
|------|------|------|
| major_id | 专业 ID | MAJ001 |
| school_id | 学校 ID | SCH001 |
| school_name | 学校名称 | 清华大学 |
| major_name | 专业名称 | 计算机科学与技术 |
| major_category | 专业类别 | 理工 |
| subject_requirement | 选科要求 | 物理 + 化学 |
| subject_required | 必选科目 | 物理，化学 |
| subject_optional | 可选科目 | 生物 |
| year | 招生年份 | 2025 |
| min_score | 最低分 | 680 |
| min_rank | 最低排名 | 100 |

### 学生信息表 (students.xlsx)

| 字段 | 说明 | 示例 |
|------|------|------|
| student_id | 学生 ID | STU001 |
| student_name | 学生姓名 | 张三 |
| category | 考生类别 | 物理类 |
| subjects | 选科 | 物理，化学，生物 |
| total_score | 总分 | 650 |
| rank | 排名 | 5000 |
| province | 省份 | 广东 |

## 使用说明

1. **导入数据**：点击"导入学校数据"和"导入学生 Excel"
2. **选择学生**：从下拉列表中选择学生
3. **设置条件**：选择学校层次、匹配类型等
4. **开始筛选**：点击"开始筛选"按钮
5. **查看结果**：右侧显示匹配的学校和专业
6. **导出结果**：点击"导出结果"保存为 Excel

## 冲稳保规则

- **冲**：排名落后 500 名以内（可冲刺）
- **稳**：排名持平或领先（较稳妥）
- **保**：排名领先 1000 名以上（保底）

## 项目结构

```
excel-filter-project/
├── src/
│   ├── main.py           # 主程序入口
│   ├── models.py         # 数据模型
│   ├── services.py       # 业务逻辑
│   └── ui/
│       └── main_window.py # 主窗口 UI
├── docs/
│   ├── 01-requirements.md # 需求文档
│   ├── 02-architecture.md # 架构文档
│   └── 03-plan.md         # 开发计划
├── data/                  # 数据目录
├── requirements.txt       # 依赖包
└── README.md             # 说明文档
```

## 技术栈

- **语言**: Python 3.10+
- **GUI**: CustomTkinter
- **数据处理**: pandas, openpyxl
- **数据库**: SQLite
- **打包**: PyInstaller

## 开发计划

- [x] 需求分析
- [x] 技术方案设计
- [x] 开发计划制定
- [x] 核心代码实现
- [ ] 测试用例编写
- [ ] UI 美化优化
- [ ] 小程序开发
- [ ] 应用商店上架

## 许可证

MIT License

## 联系方式

如有问题或建议，欢迎反馈。
