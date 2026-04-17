# Learnings - 经验教训

**最后更新：** 2026-04-10

---

## 🔴 云函数开发教训

### 问题1：子Agent不写文件！
**现象：** 子Agent说"已修复"但文件没变
**根因：** 子Agent任务完成但实际没执行写入
**教训：** 
- 重要修改必须自己执行，不用子Agent
- 子Agent只做分析/建议，不做关键文件修改
- 验证比信任更重要

### 问题2：前端vs云函数参数不匹配
**现象：** 控制台测试成功，前端调用失败
**根因：** 
- 前端发 `querySubjects: ['物理']`
- 云函数期望 `category: '物理'`
- 参数名不一致

**教训：** 
- 前后端参数必须对齐
- 部署前用实际前端参数在控制台测试

### 问题3：CloudBase _.and() 用法错误
**错误写法：**
```javascript
_.gte(minScore).and(_.lte(maxScore))  // ❌ 链式错误
```

**正确写法：**
```javascript
_.and(_.gte('字段', minScore), _.lte('字段', maxScore))  // ✅
```

**教训：** CloudBase 的 .and() 是独立方法，不是链式调用

### 问题4：undefined 导致查询崩溃
**错误写法：**
```javascript
_.and(_.gte('score', undefined), _.lte('score', undefined))  // ❌
```

**正确写法：**
```javascript
const safeMin = Number(minScore) || 0;  // ✅ 先转换
const safeMax = Number(maxScore) || 900;
_.and(_.gte('score', safeMin), _.lte('score', safeMax));
```

---

## ✅ 正确开发流程

### 云函数修改
```
1. 本地修改代码
2. 微信开发者工具上传部署
3. 云开发控制台测试（用实际前端参数）
4. 小程序前端测试
5. 验证通过后才算完成
```

### 子Agent使用原则
```
只做：分析/调研/建议/测试
不做：关键文件写入/部署操作
```

---

## 📝 调试技巧

### 云函数调试
```javascript
// 1. 添加详细日志
console.log('[函数名] 入参:', JSON.stringify(event));

// 2. 控制台测试参数
{
  "minScore": 500,
  "maxScore": 600,
  "province": "山东",
  "querySubjects": ["物理"]
}

// 3. 查看日志
// 云开发控制台 → 云函数 → 查看日志
```

### 前端调试
```javascript
// 添加catch和错误显示
fail: (err) => {
  wx.hideLoading();
  wx.showModal({
    title: '错误',
    content: err.errMsg
  });
}
```

---

## 🔧 CloudBase 查询语法备忘

```javascript
// 分数范围
_.and(_.gte('score', min), _.lte('score', max))

// 精确匹配
_.eq('province', '山东')

// 正则匹配
db.RegExp({ regexp: '山东', options: 'i' })

// 组合条件
query.where(_.and(条件1, 条件2, ...))
```

---

_每次犯错后更新此文件_
