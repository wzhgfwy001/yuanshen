// 云函数：查询专科学校 - 修复版
// 修复问题：前端参数名(querySubjects) vs 后台参数名(electives) 不匹配
// 修复 _.and() _.gte() _.lte() 在 undefined 值时出错的问题
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

/**
 * 安全获取数值，默认值处理
 */
function getNumber(value, defaultValue) {
  const num = Number(value);
  return isNaN(num) ? defaultValue : num;
}

/**
 * 安全获取数组
 */
function getArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null) return [];
  if (typeof value === 'string' && value.trim() === '') return [];
  return [];
}

/**
 * 构建基础查询条件（省份+科类+关键词）
 */
function buildBaseQuery(event) {
  const { keyword = '', province = '', category = '' } = event;
  const queryCondition = {};

  if (province && province !== '不限' && province.trim() !== '') {
    queryCondition.province = province;
  }

  if (category && category !== '不限' && category.trim() !== '') {
    queryCondition.major_category = category;
  }

  if (keyword && keyword.trim() !== '') {
    queryCondition.school_name = _.regex({
      regexp: keyword,
      options: 'i'
    });
  }

  return queryCondition;
}

/**
 * 规则4：专科选科逻辑
 * 修复：同时支持 electives 和 querySubjects 两个参数名
 */
function buildZhuankeSubjectCondition(electives, querySubjects) {
  const subjects = getArray(electives).length > 0 ? electives : getArray(querySubjects);

  console.log('[queryzhuanke] 选科参数 - electives:', JSON.stringify(electives), 'querySubjects:', JSON.stringify(querySubjects), '最终使用:', JSON.stringify(subjects));

  if (!subjects || subjects.length === 0) {
    return { subjectCondition: null, subjectNote: '(不限)' };
  }

  let subjectNote;
  if (subjects.length === 3) {
    subjectNote = `(${subjects.join('+')}+不限)`;
  } else {
    subjectNote = `(${subjects.join('+')})`;
  }

  let subjectConditions;
  if (subjects.length === 3) {
    const validSubjects = [...subjects, '不限'];
    subjectConditions = validSubjects.map(sub => {
      if (sub === '不限') return { subject_require: '不限' };
      return { subject_require: _.regex({ regexp: sub, options: 'i' }) };
    });
  } else {
    subjectConditions = subjects.map(sub => {
      return { subject_require: _.regex({ regexp: sub, options: 'i' }) };
    });
  }

  return { subjectCondition: _.or(subjectConditions), subjectNote };
}

/**
 * 分数范围筛选
 * 修复：确保 minScore/maxScore 是有效数值
 */
async function queryByScoreRange(collectionName, baseQuery, minScore, maxScore, scoreField = 'predicted_score_2025') {
  const limitSize = 150;

  const safeMinScore = getNumber(minScore, 0);
  const safeMaxScore = getNumber(maxScore, 999);

  console.log('[queryzhuanke] queryByScoreRange - minScore:', safeMinScore, 'maxScore:', safeMaxScore, 'scoreField:', scoreField);

  const scoreQuery = { ...baseQuery };
  // 移除 subject_require，后面单独过滤
  delete scoreQuery.subject_require;
  scoreQuery[scoreField] = _.and(_.gte(safeMinScore), _.lte(safeMaxScore));

  console.log('[queryzhuanke] scoreQuery:', JSON.stringify(scoreQuery));

  const result = await db.collection(collectionName)
    .where(scoreQuery)
    .orderBy(scoreField, 'desc')
    .limit(limitSize)
    .get();

  console.log('[queryzhuanke] 数据库返回条数:', result.data.length);

  if (!baseQuery.subject_require) {
    return result.data;
  }

  // 客户端过滤 _.or 条件
  const subjectOrCondition = baseQuery.subject_require;
  return result.data.filter(item => {
    const sr = item.subject_require;
    if (!sr || sr === '不限') {
      return subjectOrCondition._factory && subjectOrCondition._factory.some
        && subjectOrCondition._factory.some(cond => cond.subject_require === '不限');
    }
    const conditions = subjectOrCondition._factory || [];
    return conditions.some(cond => {
      if (cond.subject_require === '不限') return true;
      const regex = cond.subject_require;
      if (regex && typeof regex === 'object' && regex.regexp) {
        return new RegExp(regex.regexp, regex.options || '').test(sr);
      }
      return false;
    });
  });
}

/**
 * 规则2：分数优先2025
 */
async function queryWithScoreFallback(event, baseQuery, minScore, maxScore) {
  const { collectionName = 'zhuanke' } = event;

  let results2025 = await queryByScoreRange(collectionName, baseQuery, minScore, maxScore, 'predicted_score_2025');

  results2025 = results2025.filter(item => {
    if (item.predicted_score_2025 && item.score_2024) {
      const diff = Math.abs(item.predicted_score_2025 - item.score_2024);
      if (diff > 20) return false;
    }
    return true;
  });

  results2025 = results2025.map(item => ({
    ...item,
    isNewMajor2025: item.predicted_score_2025 && !item.score_2024
  }));

  console.log('[queryzhuanke] 2025结果数量:', results2025.length);

  if (results2025.length >= 100) {
    return { list: results2025.slice(0, 100), total: results2025.length, source: '2025_only', insufficient: false };
  }

  const needMore = 100 - results2025.length;
  const existingSchoolMajors = new Set(results2025.map(item => `${item.school_name}_${item.major_name}`));

  let results2024 = await queryByScoreRange(collectionName, baseQuery, minScore, maxScore, 'score_2024');

  results2024 = results2024.filter(item => {
    const key = `${item.school_name}_${item.major_name}`;
    if (existingSchoolMajors.has(key)) return false;
    if (item.score_2024 && item.predicted_score_2025) {
      const diff = Math.abs(item.score_2024 - item.predicted_score_2025);
      if (diff > 20) return false;
    }
    return true;
  });

  console.log('[queryzhuanke] 2024结果数量:', results2024.length);

  const combined = [...results2025, ...results2024.slice(0, needMore)];
  const insufficient = combined.length < 100;

  return {
    list: combined,
    total: combined.length,
    source: insufficient ? '2025_2024_combined' : '2025_2024_combined_full',
    insufficient,
    supplementalCount: results2024.length > 0 ? results2024.length : 0
  };
}

// 超时保护
function withTimeout(promise, timeoutMs = 15000) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`执行超时（${timeoutMs/1000}秒），请稍后重试`)), timeoutMs)
    )
  ]);
}

exports.main = async (event, context) => {
  // 修复：同时接收 electives 和 querySubjects
  const {
    keyword = '',
    province = '',
    category = '',
    minScore,
    maxScore,
    electives = [],
    querySubjects = [],  // 前端实际发送的参数名
    page = 1,
    pageSize = 100
  } = event;

  console.log('[queryzhuanke] ========== 入参 ==========');
  console.log('[queryzhuanke] 完整event:', JSON.stringify(event));
  console.log('[queryzhuanke] keyword:', keyword, 'province:', province, 'category:', category);
  console.log('[queryzhuanke] minScore:', minScore, 'maxScore:', maxScore);
  console.log('[queryzhuanke] electives:', JSON.stringify(electives), 'querySubjects:', JSON.stringify(querySubjects));
  console.log('[queryzhuanke] page:', page, 'pageSize:', pageSize);
  console.log('[queryzhuanke] ============================');

  try {
    const baseQuery = buildBaseQuery(event);

    // 修复：同时传递 electives 和 querySubjects
    const { subjectCondition, subjectNote } = buildZhuankeSubjectCondition(electives, querySubjects);
    if (subjectCondition) {
      baseQuery.subject_require = subjectCondition;
    }

    console.log('[queryzhuanke] baseQuery:', JSON.stringify(baseQuery));
    console.log('[queryzhuanke] subjectNote:', subjectNote);

    // 确保分数有效
    const safeMinScore = getNumber(minScore, 0);
    const safeMaxScore = getNumber(maxScore, 999);

    console.log('[queryzhuanke] 安全分数范围:', safeMinScore, '-', safeMaxScore);

    const scoreResult = await withTimeout(
      queryWithScoreFallback(event, baseQuery, safeMinScore, safeMaxScore),
      15000
    );

    const limitSize = Math.min(pageSize, 100);
    const skipSize = (page - 1) * limitSize;
    const paginatedList = scoreResult.list.slice(skipSize, skipSize + limitSize);
    const totalAfterFilter = scoreResult.list.length;

    console.log('[queryzhuanke] 查询成功，返回:', totalAfterFilter, '条');

    return {
      success: true,
      total: totalAfterFilter,
      rawTotal: scoreResult.total,
      page: page,
      pageSize: limitSize,
      list: paginatedList,
      subjectNote: subjectNote,
      source: scoreResult.source,
      insufficient: scoreResult.insufficient,
      insufficientFlag: totalAfterFilter < 100,
      message: totalAfterFilter < 100
        ? `结果不足100条（${totalAfterFilter}条），建议扩大搜索范围`
        : `成功返回 ${paginatedList.length} 条数据`
    };

  } catch (err) {
    console.error('[queryzhuanke] 查询失败:', err.message, err.stack || '');

    return {
      success: false,
      message: `查询失败: ${err.message}`,
      total: 0,
      list: [],
      insufficientFlag: true,
      errorType: err.message.includes('超时') ? 'timeout' : 'database_error'
    };
  }
};
