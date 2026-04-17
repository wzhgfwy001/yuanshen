# 小程序查询卡在"查询中"问题 - 诊断报告

## 诊断时间
2026-04-10

## 问题现象
用户点击"开始查询"后，一直显示"查询中..."弹窗，无法继续。

---

## 一、根因分析

### 1. 云函数 `queryByScoreRange` 逻辑错误（严重）

**位置**: `cloudfunctions/querybenke/index.js`

**问题**: 函数内部构建了 `scoreQuery`，但 `subject_require` 字段（值为 `_.or(...)`）被直接放入 CloudBase 查询对象中。当 `_.or()` 条件与其他字段条件（如 `predicted_score_2025: _.gte().and(_.lte())`）混在同一 `where()` 对象里时，CloudBase 可能：
- 直接返回空结果（静默失败）
- 执行超时
- 行为不确定

**代码原问题**:
```javascript
async function queryByScoreRange(...) {
  const query = db.collection(collectionName).where(baseQuery); // ← 未使用
  const scoreQuery = { ...baseQuery };  // ← subject_require 包含 _.or()
  scoreQuery[scoreField] = _.gte(minScore).and(_.lte(maxScore));
  // scoreQuery 同时有 _.or() 和 _.gte().and()，CloudBase 行为不确定
  const result = await db.collection(collectionName).where(scoreQuery)...;
  return result.data;
}
```

**修复**: 将 `subject_require` 的 `_.or()` 过滤改为**客户端（JavaScript）过滤**，避免与数据库查询条件冲突。

---

### 2. 缺少 `package.json`（中等）

**位置**: `cloudfunctions/querybenke/` 和 `cloudfunctions/queryzhuanke/`

**问题**: 两个云函数目录均只有 `index.js`，没有 `package.json`。虽然 CloudBase 环境预装了 `wx-server-sdk`，但没有 `package.json` 会导致：
- 依赖版本不明确
- 部署时可能使用错误版本的 SDK
- 本地调试困难

**修复**: 创建 `package.json`，声明 `wx-server-sdk` 依赖。

---

### 3. 无超时保护（中等）

**问题**: 云函数没有超时控制，如果数据库查询耗时过长，会一直挂起，导致前端永久显示"查询中..."。

**修复**: 添加 15 秒超时保护，超时后返回明确的超时错误，前端可据此提示用户。

---

### 4. 错误日志不足（轻微）

**问题**: catch 块只记录了 `err.message`，无法有效调试 `where()` 条件复杂导致的静默失败。

**修复**: 在关键步骤添加 `console.log`，catch 块打印完整错误栈。

---

## 二、修复内容汇总

| 文件 | 修复项 |
|------|--------|
| `cloudfunctions/querybenke/package.json` | 新建，声明 wx-server-sdk 依赖 |
| `cloudfunctions/queryzhuanke/package.json` | 新建，声明 wx-server-sdk 依赖 |
| `cloudfunctions/querybenke/index.js` | 修复 `queryByScoreRange` subject_require 过滤逻辑；添加超时保护；添加 console.log 日志 |
| `cloudfunctions/queryzhuanke/index.js` | 同上（同步修复） |

---

## 三、修复后代码关键变更

### 3.1 `queryByScoreRange` 过滤逻辑变更

**修复前**: 将 `_.or(subjectConditions)` 直接放入 CloudBase `where()` 对象
```javascript
const scoreQuery = { ...baseQuery }; // 含 _.or()
scoreQuery[scoreField] = _.gte(minScore).and(_.lte(maxScore));
```

**修复后**: 先 `delete scoreQuery.subject_require`，在 JavaScript 中单独过滤
```javascript
const scoreQuery = { ...baseQuery };
delete scoreQuery.subject_require; // 移除 _.or 避免冲突
scoreQuery[scoreField] = _.gte(minScore).and(_.lte(maxScore));
// ... 查询 ...
if (!baseQuery.subject_require) return result.data; // 无 subject_require 直接返回
// 客户端过滤 _.or 条件
return result.data.filter(item => { /* 正则 + 不限 匹配逻辑 */ });
```

### 3.2 超时保护
```javascript
function withTimeout(promise, timeoutMs = 15000) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`执行超时（${timeoutMs/1000}秒）`)), timeoutMs)
    )
  ]);
}
```

---

## 四、部署步骤

1. **上传云函数**（通过微信开发者工具或 tcb CLI）:
   ```bash
   # 确保在项目根目录
   cd cloudfunctions/querybenke
   # 上传（微信开发者工具会自动部署）
   # 或使用 tcb cli:
   tcb fn deploy querybenke
   tcb fn deploy queryzhuanke
   ```

2. **验证云函数配置**:
   - 检查云函数是否已上传部署
   - 检查云函数日志（微信开发者工具 → 云开发 → 云函数 → 日志）
   - 确认 `package.json` 中的依赖已正确安装

3. **前端验证**（需要在 `miniprogram/pages/filter/filter.js` 中）:
   - 确保调用云函数时传入了必要参数：`minScore`、`maxScore`
   - 确保错误处理（`success: false`）能够关闭"查询中"弹窗并显示错误信息

---

## 五、已知限制

- `miniprogram/pages/filter/filter.js` 不在当前工作目录，无法检查前端调用逻辑
- 前端超时处理需要单独验证
- 如云函数已部署到生产环境，需先在测试环境验证

---

## 六、测试验证步骤

### 前端测试（需小程序开发者配合）
1. 打开小程序，进入筛选页面
2. 输入：省份=北京，科类=物理，分数段=500-550
3. 点击"开始查询"
4. **预期**: 5秒内关闭"查询中"弹窗，显示结果列表
5. **如仍卡住**: 检查微信开发者工具控制台网络请求状态

### 云函数日志检查
1. 微信开发者工具 → 云开发面板 → 云函数 → `querybenke` → 日志
2. 搜索关键词 `[querybenke]` 查看入参和查询结果
3. 如出现 `执行超时` → 说明数据库查询仍然太慢，需优化索引

### 直接调用测试（CloudBase 控制台）
1. 进入腾讯云CloudBase控制台
2. 找到 `querybenke` 云函数
3. 用以下测试参数调用：
```json
{
  "keyword": "",
  "province": "北京",
  "category": "物理",
  "minScore": 500,
  "maxScore": 550,
  "electives": ["物理"],
  "page": 1,
  "pageSize": 100
}
```
4. 预期返回 `{"success": true, "total": >0, "list": [...]}`
