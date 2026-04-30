/**
 * CausalAnalyzer - 因果分析器
 * 
 * 分析轨迹数据，识别失败模式，生成改进建议
 * 
 * 使用方式：
 *   const analyzer = new CausalAnalyzer();
 *   const result = analyzer.analyzeFailure(trajectory);
 *   console.log(result.pattern, result.recommendations);
 */

const fs = require('fs');
const path = require('path');

// 失败模式定义
const FailurePatterns = {
  FILE_PATH_ISSUE: 'file_path_issue',
  PERMISSION_ISSUE: 'permission_issue',
  TIMEOUT_ISSUE: 'timeout_issue',
  NPM_INSTALL_ISSUE: 'npm_installation_issue',
  NETWORK_ISSUE: 'network_issue',
  JSON_PARSE_ISSUE: 'json_parse_issue',
  MISSING_DEPENDENCY: 'missing_dependency',
  INVALID_INPUT: 'invalid_input',
  UNKNOWN: 'unknown'
};

// 错误关键词映射到模式
const ErrorKeywordPatterns = [
  {
    pattern: FailurePatterns.FILE_PATH_ISSUE,
    keywords: ['not found', 'does not exist', 'no such file', 'ENOENT', 'Path does not exist', '文件不存在', '路径错误']
  },
  {
    pattern: FailurePatterns.PERMISSION_ISSUE,
    keywords: ['permission', 'EPERM', 'access denied', '权限', '拒绝访问']
  },
  {
    pattern: FailurePatterns.TIMEOUT_ISSUE,
    keywords: ['timeout', 'ETIMEDOUT', 'Timed out', '超时']
  },
  {
    pattern: FailurePatterns.NPM_INSTALL_ISSUE,
    keywords: ['npm install', 'npm ERR', 'node_modules', 'peer dep', 'ERESOLVE']
  },
  {
    pattern: FailurePatterns.NETWORK_ISSUE,
    keywords: ['ECONNREFUSED', 'ENOTFOUND', 'getaddrinfo', 'network', 'fetch failed', '网络']
  },
  {
    pattern: FailurePatterns.JSON_PARSE_ISSUE,
    keywords: ['JSON.parse', 'Unexpected token', 'SyntaxError', 'json', '解析']
  },
  {
    pattern: FailurePatterns.MISSING_DEPENDENCY,
    keywords: ['require', 'cannot find module', 'No module', 'import', 'ERESOLVE']
  },
  {
    pattern: FailurePatterns.INVALID_INPUT,
    keywords: ['invalid', 'must be', 'expected', '类型错误', '参数错误']
  }
];

// 模式对应的改进建议
const PatternRecommendations = {
  [FailurePatterns.FILE_PATH_ISSUE]: [
    '使用前先检查文件/目录是否存在',
    '使用绝对路径而非相对路径',
    '确保父目录存在，必要时先创建',
    '使用 path.resolve() 处理相对路径',
    '在调用前添加存在性检查'
  ],
  [FailurePatterns.PERMISSION_ISSUE]: [
    '检查文件/目录权限设置',
    '确认当前用户有足够权限',
    'Windows: 以管理员身份运行',
    '使用 chmod 调整权限（Unix系统）'
  ],
  [FailurePatterns.TIMEOUT_ISSUE]: [
    '增加超时时间配置',
    '检查网络连接稳定性',
    '考虑分步骤执行减少单次耗时',
    '添加重试机制',
    '使用增量处理避免大文件'
  ],
  [FailurePatterns.NPM_INSTALL_ISSUE]: [
    '先运行 npm install 安装依赖',
    '清除 node_modules 后重新安装',
    '使用 npm cache clean --force',
    '检查 package.json 依赖版本',
    '添加 --legacy-peer-deps 解决冲突'
  ],
  [FailurePatterns.NETWORK_ISSUE]: [
    '检查网络连接',
    '确认API地址正确',
    '添加重试机制',
    '检查防火墙设置',
    '使用代理如果需要'
  ],
  [FailurePatterns.JSON_PARSE_ISSUE]: [
    '确保JSON格式正确',
    '使用 try-catch 捕获解析错误',
    '在解析前验证输入格式',
    '使用 JSON.parse(value.trim()) 处理空白'
  ],
  [FailurePatterns.MISSING_DEPENDENCY]: [
    '检查并安装缺失的依赖',
    '使用 require() 前先检查模块是否存在',
    '阅读错误信息确认缺失的包',
    '运行 npm install 或 pip install'
  ],
  [FailurePatterns.INVALID_INPUT]: [
    '验证输入参数格式和类型',
    '添加输入校验逻辑',
    '提供清晰的错误信息给用户',
    '使用默认值增加鲁棒性'
  ]
};

class CausalAnalyzer {
  constructor() {
    this.patternHistory = [];
  }

  /**
   * 分析失败原因
   * @param {object} trajectory - 轨迹数据
   * @returns {object} 分析结果
   */
  analyzeFailure(trajectory) {
    if (!trajectory || !trajectory.steps) {
      return {
        success: false,
        error: 'Invalid trajectory data'
      };
    }

    // 1. 找到失败的步骤
    const failedSteps = trajectory.steps.filter(
      step => step.status === 'failed' || (step.error && step.error.message)
    );

    if (failedSteps.length === 0) {
      return {
        success: true,
        hasFailures: false,
        message: 'No failures found in trajectory'
      };
    }

    // 2. 找到第一个失败（根因）
    const firstFailure = failedSteps[0];

    // 3. 识别失败模式
    const pattern = this._identifyPattern(firstFailure);

    // 4. 检查前置条件
    const missingPreconditions = this._checkPreconditions(firstFailure);

    // 5. 生成建议
    const recommendations = this._generateRecommendations(pattern, firstFailure);

    // 6. 估计影响范围
    const impactScope = this._estimateImpact(pattern, failedSteps.length);

    // 7. 识别因果链中的关键点
    const causalChain = this._extractCausalChain(trajectory, firstFailure);

    return {
      success: true,
      hasFailures: true,
      taskId: trajectory.taskId,
      taskType: trajectory.taskType,
      rootCause: {
        stepId: firstFailure.id,
        tool: firstFailure.tool,
        error: firstFailure.error,
        pattern: pattern
      },
      failedStepCount: failedSteps.length,
      missingPreconditions: missingPreconditions,
      recommendations: recommendations,
      impactScope: impactScope,
      causalChain: causalChain,
      stats: this._calculateStats(trajectory)
    };
  }

  /**
   * 分析成功轨迹（识别潜在的改进点）
   * @param {object} trajectory - 轨迹数据
   * @returns {object} 分析结果
   */
  analyzeSuccess(trajectory) {
    if (!trajectory || !trajectory.steps) {
      return {
        success: false,
        error: 'Invalid trajectory data'
      };
    }

    const steps = trajectory.steps;
    const toolCalls = steps.filter(s => s.type === 'tool_call');
    
    // 分析执行效率
    const efficiency = this._analyzeEfficiency(toolCalls);
    
    // 分析决策质量
    const decisionQuality = this._analyzeDecisionQuality(steps);
    
    // 识别可以优化的点
    const optimizationPoints = this._identifyOptimizationPoints(toolCalls);

    return {
      success: true,
      taskId: trajectory.taskId,
      taskType: trajectory.taskType,
      efficiency: efficiency,
      decisionQuality: decisionQuality,
      optimizationPoints: optimizationPoints,
      stats: this._calculateStats(trajectory)
    };
  }

  /**
   * 批量分析多个轨迹
   * @param {array} trajectories - 轨迹数组
   * @returns {object} 聚合分析结果
   */
  aggregateAnalysis(trajectories) {
    const patterns = {};
    const recommendations = {};
    let totalFailures = 0;

    for (const trajectory of trajectories) {
      const result = this.analyzeFailure(trajectory);
      if (result.hasFailures) {
        totalFailures++;
        
        // 统计模式
        const pattern = result.rootCause.pattern;
        patterns[pattern] = (patterns[pattern] || 0) + 1;
        
        // 聚合建议
        for (const rec of result.recommendations) {
          recommendations[rec] = (recommendations[rec] || 0) + 1;
        }
      }
    }

    // 找出最常见的失败模式
    const topPatterns = Object.entries(patterns)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([pattern, count]) => ({ pattern, count }));

    // 找出最有效的建议
    const topRecommendations = Object.entries(recommendations)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([recommendation, count]) => ({ recommendation, count }));

    return {
      totalTrajectories: trajectories.length,
      failedTrajectories: totalFailures,
      failureRate: totalFailures / trajectories.length,
      topPatterns: topPatterns,
      topRecommendations: topRecommendations,
      patterns: patterns,
      recommendations: recommendations
    };
  }

  // ========== 私有方法 ==========

  /**
   * 识别失败模式
   */
  _identifyPattern(failedStep) {
    if (!failedStep.error || !failedStep.error.message) {
      return FailurePatterns.UNKNOWN;
    }

    const errorMessage = failedStep.error.message.toLowerCase();

    for (const { pattern, keywords } of ErrorKeywordPatterns) {
      for (const keyword of keywords) {
        if (errorMessage.includes(keyword.toLowerCase())) {
          // 记录到历史
          this.patternHistory.push({
            pattern: pattern,
            tool: failedStep.tool,
            timestamp: new Date().toISOString()
          });
          return pattern;
        }
      }
    }

    return FailurePatterns.UNKNOWN;
  }

  /**
   * 检查前置条件
   */
  _checkPreconditions(failedStep) {
    const missing = [];
    const tool = failedStep.tool;
    const inputs = failedStep.inputs || {};

    switch (tool) {
      case 'read':
        if (!inputs.path) {
          missing.push('path parameter is required');
        }
        break;
      case 'write':
        if (!inputs.path) {
          missing.push('path parameter is required');
        }
        if (!inputs.content) {
          missing.push('content parameter is required');
        }
        break;
      case 'exec':
        if (!inputs.command) {
          missing.push('command parameter is required');
        }
        break;
      case 'message':
        if (!inputs.action) {
          missing.push('action parameter is required');
        }
        break;
    }

    return missing;
  }

  /**
   * 生成改进建议
   */
  _generateRecommendations(pattern, failedStep) {
    const baseRecommendations = PatternRecommendations[pattern] || [];
    
    // 根据具体错误添加针对性建议
    const specificRecommendations = [];
    
    if (failedStep.error && failedStep.error.message) {
      // 检查是否有具体的文件路径问题
      const errorMsg = failedStep.error.message;
      const pathMatch = errorMsg.match(/['"]([^'"]+)['"]|([A-Za-z]:\\[\w\\]+)/g);
      if (pathMatch) {
        specificRecommendations.push(`注意路径: ${pathMatch[0]} - 确保路径格式正确`);
      }
    }

    return [
      ...specificRecommendations,
      ...baseRecommendations
    ];
  }

  /**
   * 估计影响范围
   */
  _estimateImpact(pattern, failedStepCount) {
    const baseImpact = {
      [FailurePatterns.FILE_PATH_ISSUE]: 3,
      [FailurePatterns.PERMISSION_ISSUE]: 4,
      [FailurePatterns.TIMEOUT_ISSUE]: 2,
      [FailurePatterns.NPM_INSTALL_ISSUE]: 5,
      [FailurePatterns.NETWORK_ISSUE]: 3,
      [FailurePatterns.JSON_PARSE_ISSUE]: 2,
      [FailurePatterns.MISSING_DEPENDENCY]: 4,
      [FailurePatterns.INVALID_INPUT]: 2
    };

    const patternImpact = baseImpact[pattern] || 1;
    return Math.min(patternImpact * failedStepCount, 10);
  }

  /**
   * 提取因果链
   */
  _extractCausalChain(trajectory, firstFailure) {
    const steps = trajectory.steps;
    const failureIndex = steps.findIndex(s => s.id === firstFailure.id);
    
    // 获取失败前的所有步骤
    const precedingSteps = steps.slice(0, failureIndex + 1);
    
    // 分析关键转折点
    const keyPoints = [];
    
    for (let i = 0; i < precedingSteps.length; i++) {
      const step = precedingSteps[i];
      
      if (step.type === 'agent_decision') {
        keyPoints.push({
          type: 'decision',
          agent: step.agent,
          decision: step.decision,
          reason: step.reason
        });
      }
      
      if (step.status === 'failed') {
        keyPoints.push({
          type: 'failure',
          stepId: step.id,
          tool: step.tool,
          error: step.error
        });
      }
    }

    return {
      length: precedingSteps.length,
      keyPoints: keyPoints,
      firstFailureAt: firstFailure.id
    };
  }

  /**
   * 分析效率
   */
  _analyzeEfficiency(toolCalls) {
    const successfulCalls = toolCalls.filter(s => s.status === 'success');
    const totalDuration = toolCalls.reduce((sum, call) => sum + (call.duration || 0), 0);
    const avgDuration = successfulCalls.length > 0 
      ? totalDuration / successfulCalls.length 
      : 0;

    return {
      totalCalls: toolCalls.length,
      successfulCalls: successfulCalls.length,
      successRate: toolCalls.length > 0 ? successfulCalls.length / toolCalls.length : 0,
      avgDuration: Math.round(avgDuration),
      totalDuration: totalDuration
    };
  }

  /**
   * 分析决策质量
   */
  _analyzeDecisionQuality(steps) {
    const decisions = steps.filter(s => s.type === 'agent_decision');
    
    return {
      totalDecisions: decisions.length,
      decisionsWithReason: decisions.filter(d => d.reason).length
    };
  }

  /**
   * 识别优化点
   */
  _identifyOptimizationPoints(toolCalls) {
    const points = [];

    // 检查是否有重复的工具调用
    const toolCounts = {};
    for (const call of toolCalls) {
      toolCounts[call.tool] = (toolCounts[call.tool] || 0) + 1;
    }

    for (const [tool, count] of Object.entries(toolCounts)) {
      if (count > 3) {
        points.push({
          type: 'repeated_calls',
          tool: tool,
          count: count,
          suggestion: `考虑批量处理或缓存结果，减少 ${count} 次 ${tool} 调用`
        });
      }
    }

    // 检查是否有不必要的读操作
    const readCalls = toolCalls.filter(c => c.tool === 'read' && c.status === 'success');
    if (readCalls.length > 5) {
      points.push({
        type: 'many_reads',
        count: readCalls.length,
        suggestion: `检测到 ${readCalls.length} 次文件读取，考虑使用缓存或合并读取`
      });
    }

    return points;
  }

  /**
   * 计算统计信息
   */
  _calculateStats(trajectory) {
    const steps = trajectory.steps || [];
    const toolCalls = steps.filter(s => s.type === 'tool_call');

    return {
      totalSteps: steps.length,
      toolCallCount: toolCalls.length,
      decisionCount: steps.filter(s => s.type === 'agent_decision').length,
      userFeedbackCount: steps.filter(s => s.type === 'user_feedback').length,
      failedCount: toolCalls.filter(s => s.status === 'failed').length,
      successCount: toolCalls.filter(s => s.status === 'success').length
    };
  }

  /**
   * 获取模式历史
   */
  getPatternHistory(limit = 100) {
    return this.patternHistory.slice(-limit);
  }

  /**
   * 清除历史
   */
  clearHistory() {
    this.patternHistory = [];
  }
}

/**
 * 创建分析结果的可读描述
 */
function formatAnalysisResult(result) {
  if (!result.success) {
    return `分析失败: ${result.error}`;
  }

  if (!result.hasFailures) {
    return `任务成功完成，无失败步骤`;
  }

  let output = `📊 分析结果 (任务: ${result.taskId})\n`;
  output += `━━━━━━━━━━━━━━━━━━━━\n`;
  output += `❌ 失败步骤: ${result.failedStepCount} 个\n`;
  output += `🔍 根因模式: ${result.rootCause.pattern}\n`;
  output += `⚠️ 影响范围: ${result.impactScope}/10\n\n`;
  
  output += `📝 失败步骤:\n`;
  output += `  工具: ${result.rootCause.tool}\n`;
  output += `  错误: ${result.rootCause.error?.message || 'unknown'}\n\n`;

  if (result.recommendations.length > 0) {
    output += `💡 改进建议:\n`;
    result.recommendations.forEach((rec, i) => {
      output += `  ${i + 1}. ${rec}\n`;
    });
  }

  return output;
}

module.exports = {
  CausalAnalyzer,
  formatAnalysisResult,
  FailurePatterns,
  TRAJECTORY_DIR: path.join(
    process.env.USERPROFILE || process.env.HOME || '',
    '.openclaw', 'workspace', 'skills', 'skills-evolution', 'trajectory', 'records'
  )
};