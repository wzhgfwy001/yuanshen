# 用户反馈收集脚本

**用途：** 收集和汇总用户反馈
**输入：** 用户填写的反馈模板
**输出：** 汇总报告

---

## 📝 使用方法

```powershell
# 1. 收集反馈（手动粘贴用户反馈到 feedbacks/ 目录）
# 2. 生成汇总报告
.\collect-feedback.ps1 -summarize

# 3. 查看反馈统计
.\collect-feedback.ps1 -stats
```

---

## 🔧 脚本代码

```powershell
# collect-feedback.ps1
param(
    [switch]$summarize,
    [switch]$stats
)

$feedbackDir = "feedbacks"
$outputFile = "operations/USER-FEEDBACK.md"

if ($stats) {
    # 统计反馈数量
    $files = Get-ChildItem $feedbackDir -Filter "*.md" -ErrorAction SilentlyContinue
    Write-Host "反馈总数：$($files.Count)"
    
    # 分类统计
    $bugs = (Get-ChildItem $feedbackDir -Filter "*bug*.md" -ErrorAction SilentlyContinue).Count
    $suggestions = (Get-ChildItem $feedbackDir -Filter "*suggest*.md" -ErrorAction SilentlyContinue).Count
    
    Write-Host "Bug 报告：$bugs"
    Write-Host "功能建议：$suggestions"
    return
}

if ($summarize) {
    Write-Host "生成反馈汇总报告..."
    # 生成汇总逻辑
    return
}

# 默认：显示帮助
Get-Help $PSCommandPath
```

---

## 📊 反馈存储结构

```
feedbacks/
├── 2026-04/
│   ├── feedback-001.md
│   ├── feedback-002.md
│   └── ...
└── 2026-05/
    └── ...
```

---

## 📈 汇总报告模板

```markdown
# 用户反馈汇总 - 2026-04

**收集周期：** 2026-04-01 ~ 2026-04-30
**反馈总数：** X

## 分类统计
| 类型 | 数量 | 占比 |
|------|------|------|
| Bug 报告 | X | X% |
| 功能建议 | X | X% |
| 使用问题 | X | X% |
| 性能反馈 | X | X% |

## 满意度
| 评分 | 数量 | 占比 |
|------|------|------|
| ⭐⭐⭐⭐⭐ | X | X% |
| ⭐⭐⭐⭐ | X | X% |
| ⭐⭐⭐ | X | X% |
| ⭐⭐ | X | X% |
| ⭐ | X | X% |

## 高频问题 TOP5
1. 
2. 
3. 
4. 
5. 

## 已解决问题
- [x] 
- [x] 

## 待处理问题
- [ ] 
- [ ] 

## 下周计划
1. 
2. 
3. 
```

---

**创建时间：** 2026-04-06
**维护人：** 开发团队
