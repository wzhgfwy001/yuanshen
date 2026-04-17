/**
 * 云函数：cloudbase_importer
 * 用于批量导入数据到云开发数据库
 * 
 * 功能：
 * 1. 接收JSON格式的数据
 * 2. 批量写入到指定集合
 * 3. 支持大量数据分批写入
 * 4. 自动清空旧数据（可选）
 * 
 * 调用方式：
 * wx.cloud.callFunction({
 *   name: 'cloudbase_importer',
 *   data: {
 *     collection: '集合名称',
 *     data: [...],           // JSON数组数据
 *     clearOld: true,        // 是否清空旧数据
 *     batchSize: 100         // 每批写入数量，默认100
 *   }
 * })
 */

const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV  // 使用当前云环境
})

const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const { collection, data, clearOld = false, batchSize = 100 } = event

  // 参数校验
  if (!collection) {
    return {
      success: false,
      error: '缺少 collection 参数'
    }
  }

  if (!Array.isArray(data) || data.length === 0) {
    return {
      success: false,
      error: 'data 参数必须是非空数组'
    }
  }

  const res = {
    success: true,
    collection,
    total: data.length,
    imported: 0,
    failed: 0,
    errors: [],
    batches: 0
  }

  try {
    // 可选：清空旧数据
    if (clearOld) {
      console.log(`[${collection}] 开始清空旧数据...`)
      let deleted = 0
      while (true) {
        const result = await db.collection(collection).limit(100).remove()
        deleted += result.deleted
        if (result.deleted < 100) break
      }
      console.log(`[${collection}] 已清空 ${deleted} 条旧数据`)
      res.deleted = deleted
    }

    // 分批写入数据
    console.log(`[${collection}] 开始导入 ${data.length} 条数据，每批 ${batchSize} 条...`)
    
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize)
      res.batches++
      
      try {
        // 批量插入当前批次
        const result = await db.collection(collection).add({
          data: batch
        })
        res.imported += batch.length
        console.log(`[${collection}] 批次 ${res.batches} 完成，已导入 ${res.imported}/${data.length}`)
      } catch (err) {
        console.error(`[${collection}] 批次 ${res.batches} 失败:`, err)
        res.failed += batch.length
        res.errors.push({
          batch: res.batches,
          error: err.message || err.errMsg || '未知错误'
        })
      }
    }

    res.success = res.failed === 0

    console.log(`[${collection}] 导入完成！成功: ${res.imported}, 失败: ${res.failed}`)

    return res

  } catch (err) {
    console.error(`[${collection}] 云函数执行失败:`, err)
    return {
      success: false,
      error: err.message || err.errMsg || '云函数执行失败',
      details: err
    }
  }
}
