// cloudbase_importer 云函数 - 数据批量导入
// 部署方式：在微信开发者工具中新建云函数，替换index.js内容

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const MAX_BATCH = 1000; // 云数据库单次最多1000条

// 导入专科数据
async function importZhuanke(data) {
  console.log(`开始导入 ${data.length} 条专科数据...`);
  let success = 0;
  let failed = 0;
  const errors = [];

  for (let i = 0; i < data.length; i += MAX_BATCH) {
    const batch = data.slice(i, i + MAX_BATCH);
    const batchNum = Math.floor(i / MAX_BATCH) + 1;
    
    try {
      // 清空旧数据
      const countResult = await db.collection('zhuanke').count();
      if (countResult.total > 0) {
        // 分批删除
        const total = countResult.total;
        for (let j = 0; j < total; j += MAX_BATCH) {
          const allQuery = await db.collection('zhuanke').limit(MAX_BATCH).get();
          if (allQuery.data.length > 0) {
            const ids = allQuery.data.map(item => item._id);
            await Promise.all(ids.map(id => db.collection('zhuanke').doc(id).remove()));
          }
        }
      }
      
      // 批量添加新数据
      const addResult = await db.collection('zhuanke').add({
        data: batch
      });
      success += batch.length;
      console.log(`批次 ${batchNum}: 成功`);
    } catch (e) {
      failed += batch.length;
      errors.push({ batch: batchNum, error: e.message });
      console.error(`批次 ${batchNum} 失败:`, e.message);
    }
  }
  
  return { success, failed, errors };
}

// 导入本科数据
async function importBenke(data) {
  console.log(`开始导入 ${data.length} 条本科数据...`);
  let success = 0;
  let failed = 0;
  const errors = [];

  for (let i = 0; i < data.length; i += MAX_BATCH) {
    const batch = data.slice(i, i + MAX_BATCH);
    const batchNum = Math.floor(i / MAX_BATCH) + 1;
    
    try {
      // 清空旧数据
      const countResult = await db.collection('benke').count();
      if (countResult.total > 0) {
        const total = countResult.total;
        for (let j = 0; j < total; j += MAX_BATCH) {
          const allQuery = await db.collection('benke').limit(MAX_BATCH).get();
          if (allQuery.data.length > 0) {
            const ids = allQuery.data.map(item => item._id);
            await Promise.all(ids.map(id => db.collection('benke').doc(id).remove()));
          }
        }
      }
      
      // 批量添加
      await db.collection('benke').add({
        data: batch
      });
      success += batch.length;
      console.log(`批次 ${batchNum}: 成功`);
    } catch (e) {
      failed += batch.length;
      errors.push({ batch: batchNum, error: e.message });
      console.error(`批次 ${batchNum} 失败:`, e.message);
    }
  }
  
  return { success, failed, errors };
}

exports.main = async (event, context) => {
  const { action, data } = event;
  
  try {
    if (action === 'import_zhuanke') {
      const result = await importZhuanke(data);
      return { success: true, ...result };
    }
    
    if (action === 'import_benke') {
      const result = await importBenke(data);
      return { success: true, ...result };
    }
    
    // 返回当前集合状态
    if (action === 'status') {
      const zhuankeCount = await db.collection('zhuanke').count();
      const benkeCount = await db.collection('benke').count();
      return {
        success: true,
        zhuanke: zhuankeCount.total,
        benke: benkeCount.total
      };
    }
    
    return { success: false, error: '未知操作' };
    
  } catch (e) {
    return { success: false, error: e.message };
  }
};
