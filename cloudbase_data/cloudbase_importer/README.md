# 微信云函数批量导入数据 - 使用说明

## 📊 数据概况

| 数据类型 | 文件路径 | 数据条数 |
|---------|---------|---------|
| 专科 | `zhuanke_fixed.json` | 11,912 条 |
| 本科 | `benke_fixed.json` | 21,425 条 |
| **合计** | - | **33,337 条** |

---

## 📁 云函数文件

```
cloudbase_importer/
├── index.js      # 云函数主代码
└── package.json  # 依赖配置
```

---

## 🚀 部署步骤

### 步骤1：登录微信开发者工具

1. 打开微信开发者工具
2. 登录您的账号（AppID: `wx21c2c6114d560057`）
3. 打开您的云开发项目

### 步骤2：创建云函数

1. 在 `cloudFunctions` 目录上右键
2. 选择「新建Node.js云函数」
3. 函数名称输入：`cloudbase_importer`
4. 将 `index.js` 和 `package.json` 的内容分别粘贴到对应文件

### 步骤3：安装依赖

在云函数目录（`cloudFunctions/cloudbase_importer/`）下：
- 如果有 `node_modules`，先删除
- 右键云函数目录 → 「安装依赖」
- 或在 `package.json` 同目录执行：`npm install wx-server-sdk`

### 步骤4：上传并部署

1. 右键 `cloudbase_importer` 云函数
2. 选择「上传并部署：云端安装依赖」
3. 等待部署完成

---

## 📱 调用云函数导入数据

### 方法一：在微信开发者工具控制台调用

在开发者工具的「云开发控制台」→「云函数」中调用：

```javascript
// 导入专科数据
wx.cloud.callFunction({
  name: 'cloudbase_importer',
  data: {
    collection: 'zhuanke',      // 集合名称
    data: [/* 专科数据数组 */],  // 从JSON文件读取的数据
    clearOld: true,              // 清空旧数据
    batchSize: 100               // 每批100条
  }
}).then(res => {
  console.log('导入结果:', res)
})

// 导入本科数据
wx.cloud.callFunction({
  name: 'cloudbase_importer',
  data: {
    collection: 'benke',         // 集合名称
    data: [/* 本科数据数组 */],  // 从JSON文件读取的数据
    clearOld: true,              // 清空旧数据
    batchSize: 100               // 每批100条
  }
})
```

### 方法二：创建一个测试页面调用

在项目的 `pages` 目录下创建 `import-data/import-data.js`：

```javascript
const cloud = require('wx-server-sdk')

Page({
  data: {
    importing: false
  },
  
  // 导入专科数据
  async importZhuanke() {
    this.setData({ importing: true })
    try {
      // 加载本地JSON数据
      const zhuankeData = require('./zhuanke_fixed.json')
      
      const res = await wx.cloud.callFunction({
        name: 'cloudbase_importer',
        data: {
          collection: 'zhuanke',
          data: zhuankeData,
          clearOld: true,
          batchSize: 100
        }
      })
      
      wx.showModal({
        title: '导入成功',
        content: `成功导入 ${res.result.imported} 条专科数据`,
        showCancel: false
      })
    } catch (err) {
      wx.showModal({
        title: '导入失败',
        content: err.message,
        showCancel: false
      })
    } finally {
      this.setData({ importing: false })
    }
  },
  
  // 导入本科数据
  async importBenke() {
    this.setData({ importing: true })
    try {
      const benkeData = require('./benke_fixed.json')
      
      const res = await wx.cloud.callFunction({
        name: 'cloudbase_importer',
        data: {
          collection: 'benke',
          data: benkeData,
          clearOld: true,
          batchSize: 100
        }
      })
      
      wx.showModal({
        title: '导入成功',
        content: `成功导入 ${res.result.imported} 条本科数据`,
        showCancel: false
      })
    } catch (err) {
      wx.showModal({
        title: '导入失败',
        content: err.message,
        showCancel: false
      })
    } finally {
      this.setData({ importing: false })
    }
  }
})
```

---

## ⚠️ 重要提示

### 云函数超时问题

由于数据量较大（33,337条），建议在 `config.json` 中配置较长的超时时间：

```json
{
  "permissions": {
    "openapi": []
  },
  "timeout": 300,
  "memorySize": 256
}
```

### 内存限制

云函数默认内存 256MB，批量写入时注意：
- `batchSize` 建议设置为 50-200
- 如果还是内存不足，减少 `batchSize`

### 建议的导入策略

1. **先导入专科数据**（11,912条）
2. **再导入本科数据**（21,425条）
3. 每批导入之间适当间隔

---

## 📋 云函数参数说明

| 参数 | 类型 | 必填 | 说明 | 默认值 |
|-----|------|-----|------|-------|
| `collection` | string | ✅ | 目标集合名称 | - |
| `data` | array | ✅ | 要导入的数据数组 | - |
| `clearOld` | boolean | ❌ | 是否清空旧数据 | `false` |
| `batchSize` | number | ❌ | 每批写入数量 | `100` |

---

## ✅ 验证导入结果

导入完成后，可在云开发控制台验证：

1. 进入「数据库」
2. 选择对应的集合（`zhuanke` 或 `benke`）
3. 查看记录数量是否与预期一致

---

## ❓ 常见问题

**Q: 导入失败怎么办？**
A: 检查云函数日志，错误信息会在 `errors` 数组中返回。根据错误信息调整参数。

**Q: 数据量太大导入超时？**
A: 减小 `batchSize` 到 50，同时在 `config.json` 中增大 `timeout`。

**Q: 如何只导入部分数据？**
A: 在调用前先对数据数组做切片处理：
```javascript
const partialData = fullData.slice(0, 1000)  // 只取前1000条
```
