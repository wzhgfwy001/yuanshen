# 山东高考志愿填报系统

## 版本信息

- **当前版本：** v1.5-optimized
- **更新日期：** 2026-04-07
- **状态：** 🟢 运行中

## 项目结构

```
excel-filter-project/
├── main_launcher.py              # 主界面（本科/专科选择）
├── main_simple2.py               # 本科筛选器
├── main_zhuanke.py               # 专科筛选器
├── data_loader.py                # 数据加载（原始）
├── data_loader_optimized.py       # 数据加载（优化版）
├── data_quality_check.py          # 数据质量检查
├── test/                         # 测试目录
│   ├── test_basic.py            # 基础测试
│   ├── test_filter.py           # 筛选逻辑测试
│   └── test_performance.py      # 性能测试
├── data/                        # 数据文件
│   ├── cache.pkl                # 缓存文件（自动生成）
│   └── *.xlsx                   # 数据文件
└── docs/                        # 文档
```

## 功能

### 核心功能
- ✅ 分数输入（语数外 + 选考）
- ✅ 省份/层次/学校/专业筛选
- ✅ 冲/稳/保分析（30/50/20）
- ✅ 结果导出Excel

### 优化功能
- ✅ 数据缓存加速
- ✅ 自动化测试
- ✅ 数据质量检查
- ✅ 性能监控

## 快速开始

### 1. 运行主程序
```bash
python main_launcher.py
```

### 2. 运行测试
```bash
python test/test_basic.py
```

### 3. 数据质量检查
```bash
python data_quality_check.py
```

## 数据格式

| 字段 | 说明 |
|------|------|
| 院校名称 | 学校名称 |
| 专业名称 | 专业名称 |
| 预测分数 | 2025预测分数 |
| 省份 | 院校所在省份 |
| 院校层次 | 985/211/双一流/本科 |

## 技术栈

- Python 3.11+
- Tkinter（GUI）
- Pandas（数据处理）
- Openpyxl（Excel读写）

## 更新日志

### v1.5-optimized (2026-04-07)
- 添加数据缓存加速
- 完善自动化测试框架
- 优化代码结构
- 清理冗余文件

### v1.5 (2026-04-07)
- UI全面优化
- 按钮阴影效果
- 深蓝主题

### v1.0 (2026-04-03)
- 初始版本

---

*Developed with 混合动态多Agent系统 v1.3.1*
