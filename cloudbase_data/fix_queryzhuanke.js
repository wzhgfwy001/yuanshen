// 云函数：查询专科学校 - 修复版
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { 
    keyword = '',
    province = '',
    category = '',
    minScore,
    maxScore,
    page = 1,
    pageSize = 100
  } = event;

  try {
    // 构建查询条件
    const queryCondition = {};

    // 省份筛选
    if (province && province !== '不限' && province !== '') {
      queryCondition.province = province;
    }

    // 科类筛选
    if (category && category !== '不限' && category !== '') {
      queryCondition.category = category;
    }

    // 分数范围筛选
    if (minScore !== undefined && maxScore !== undefined) {
      queryCondition.predicted_score_2025 = _.gte(minScore).and(_.lte(maxScore));
    }

    // 关键词搜索 - 正则模糊匹配（支持"清华"匹配"清华大学"）
    if (keyword && keyword !== '') {
      queryCondition.school_name = _.regex({
        regexp: keyword,
        options: 'i'
      });
    }

    // 执行查询
    const query = db.collection('zhuanke').where(queryCondition);
    const limitSize = Math.min(pageSize, 100);
    const skipSize = (page - 1) * limitSize;

    const result = await query
      .orderBy('predicted_score_2025', 'desc')
      .skip(skipSize)
      .limit(limitSize)
      .get();

    // 获取总数
    let total = 0;
    try {
      const countResult = await query.count();
      total = countResult.total;
    } catch (countErr) {
      console.log('获取总数失败:', countErr.message);
      total = result.data.length;
    }

    return {
      success: true,
      total: total,
      page: page,
      pageSize: limitSize,
      list: result.data,
      message: `成功返回 ${result.data.length} 条数据`
    };

  } catch (err) {
    console.error('查询专科数据失败:', err);

    // 备用查询
    try {
      const fallbackResult = await db.collection('zhuanke')
        .limit(50)
        .orderBy('predicted_score_2025', 'desc')
        .get();

      return {
        success: true,
        total: fallbackResult.data.length,
        page: 1,
        pageSize: 50,
        list: fallbackResult.data,
        message: '使用备用查询返回数据'
      };
    } catch (fallbackErr) {
      return {
        success: false,
        message: `查询失败: ${err.message}`,
        total: 0,
        list: [],
        errorType: 'database_error'
      };
    }
  }
};
