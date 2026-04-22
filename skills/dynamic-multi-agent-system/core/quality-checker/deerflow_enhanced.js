/**
 * DeerFlow增强版质量检查器
 * 
 * 借鉴DeerFlow的设计：
 * 1. 多格式报告生成 - Markdown/HTML/JSON
 * 2. 专业输出格式化 - 借鉴DeerFlow的报告模板
 * 3. 质量评分系统 - 多维度评估
 * 4. 渐进式报告 - 分段输出
 */

const { EventEmitter } = require('events');

// ============== 质量维度定义 ==============
const QUALITY_DIMENSIONS = {
  ACCURACY: 'accuracy',           // 准确性
  COMPLETENESS: 'completeness',   // 完整性
  COHERENCE: 'coherence',         // 连贯性
  RELEVANCE: 'relevance',         // 相关性
  PROFESSIONALISM: 'professionalism', // 专业性
  READABILITY: 'readability'       // 可读性
};

const QUALITY_LEVELS = {
  EXCELLENT: { label: '优秀', minScore: 90, emoji: '🌟' },
  GOOD: { label: '良好', minScore: 75, emoji: '✅' },
  ACCEPTABLE: { label: '合格', minScore: 60, emoji: '⚠️' },
  POOR: { label: '较差', minScore: 40, emoji: '❌' },
  FAIL: { label: '不及格', minScore: 0, emoji: '🚫' }
};

// ============== 报告模板 ==============
const REPORT_TEMPLATES = {
  // 借鉴DeerFlow的报告格式
  EXECUTIVE_SUMMARY: {
    name: 'Executive Summary',
    sections: ['overview', 'key_findings', 'recommendations', 'next_steps'],
    style: 'concise'
  },
  DETAILED_REPORT: {
    name: 'Detailed Report',
    sections: ['introduction', 'methodology', 'findings', 'analysis', 'conclusion', 'references'],
    style: 'comprehensive'
  },
  TECHNICAL_REPORT: {
    name: 'Technical Report',
    sections: ['abstract', 'introduction', 'implementation', 'results', 'discussion', 'appendix'],
    style: 'technical'
  },
  CREATIVE_CONTENT: {
    name: 'Creative Content Review',
    sections: ['concept', 'structure', 'style', 'creativity', 'market_potential'],
    style: 'creative'
  },
  DATA_ANALYSIS: {
    name: 'Data Analysis Report',
    sections: ['executive_summary', 'data_overview', 'methodology', 'key_insights', 'visualizations', 'recommendations'],
    style: 'data_centric'
  }
};

// ============== 质量检查项类 ==============
class QualityCheckItem extends EventEmitter {
  constructor(config) {
    super();
    this.id = config.id || `check-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    this.dimension = config.dimension;
    this.criterion = config.criterion;
    this.weight = config.weight || 1.0;  // 权重
    this.score = null;
    this.passed = null;
    this.issues = [];
    this.suggestions = [];
    this.evidence = [];
    this.timestamp = Date.now();
  }

  setScore(score, issues = [], suggestions = []) {
    this.score = Math.max(0, Math.min(100, score));
    this.issues = issues;
    this.suggestions = suggestions;
    this.passed = this.score >= 60;
    this.emit('score_updated', this.toJSON());
    return this;
  }

  addEvidence(evidence) {
    this.evidence.push({
      text: evidence,
      timestamp: Date.now()
    });
  }

  addIssue(issue) {
    this.issues.push(issue);
  }

  addSuggestion(suggestion) {
    this.suggestions.push(suggestion);
  }

  toJSON() {
    return {
      id: this.id,
      dimension: this.dimension,
      criterion: this.criterion,
      weight: this.weight,
      score: this.score,
      passed: this.passed,
      issues: this.issues,
      suggestions: this.suggestions,
      evidence: this.evidence,
      timestamp: this.timestamp
    };
  }
}

// ============== 质量报告生成器 ==============
class QualityReportGenerator extends EventEmitter {
  constructor(options = {}) {
    super();
    this.options = {
      template: options.template || REPORT_TEMPLATES.EXECUTIVE_SUMMARY,
      format: options.format || 'markdown',  // markdown, html, json
      includeEvidence: options.includeEvidence !== false,
      includeSuggestions: options.includeSuggestions !== false,
      timestamp: options.timestamp || Date.now()
    };
  }

  /**
   * 生成报告 - 借鉴DeerFlow的多格式报告生成
   */
  generate(checkResults, metadata = {}) {
    const template = this.options.template;
    
    switch (this.options.format) {
      case 'markdown':
        return this._generateMarkdown(checkResults, metadata, template);
      case 'html':
        return this._generateHTML(checkResults, metadata, template);
      case 'json':
        return this._generateJSON(checkResults, metadata);
      default:
        return this._generateMarkdown(checkResults, metadata, template);
    }
  }

  _generateMarkdown(checkResults, metadata, template) {
    const { summary, dimensionScores, overallScore, level } = this._calculateSummary(checkResults);
    
    let md = '';
    
    // 报告头部
    md += this._renderHeader(template.name, metadata);
    
    // 执行摘要
    if (template.sections.includes('overview') || template.sections.includes('executive_summary')) {
      md += this._renderExecutiveSummary(summary, overallScore, level, metadata);
    }
    
    // 关键发现
    if (template.sections.includes('key_findings') || template.sections.includes('findings')) {
      md += this._renderKeyFindings(checkResults);
    }
    
    // 维度分析
    if (template.sections.includes('analysis') || dimensionScores) {
      md += this._renderDimensionAnalysis(dimensionScores);
    }
    
    // 问题与建议
    if (template.sections.includes('recommendations') || this.options.includeSuggestions) {
      md += this._renderRecommendations(checkResults);
    }
    
    // 下一步行动
    if (template.sections.includes('next_steps')) {
      md += this._renderNextSteps(checkResults);
    }
    
    // 报告尾部
    md += this._renderFooter(metadata);
    
    return md;
  }

  _generateHTML(checkResults, metadata, template) {
    const markdown = this._generateMarkdown(checkResults, metadata, template);
    return this._markdownToHTML(markdown, metadata);
  }

  _generateJSON(checkResults, metadata) {
    const { summary, dimensionScores, overallScore, level } = this._calculateSummary(checkResults);
    
    return JSON.stringify({
      reportMetadata: {
        generatedAt: new Date(this.options.timestamp).toISOString(),
        template: this.options.template.name,
        format: 'json',
        ...metadata
      },
      summary: {
        overallScore,
        level: level.label,
        levelEmoji: level.emoji,
        totalChecks: summary.totalChecks,
        passedChecks: summary.passedChecks,
        failedChecks: summary.failedChecks,
        passRate: summary.passRate
      },
      dimensions: dimensionScores,
      issues: this._extractIssues(checkResults),
      suggestions: this._extractSuggestions(checkResults),
      details: checkResults.map(r => r.toJSON())
    }, null, 2);
  }

  _calculateSummary(checkResults) {
    const totalChecks = checkResults.length;
    const passedChecks = checkResults.filter(r => r.passed).length;
    const failedChecks = totalChecks - passedChecks;
    const passRate = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 0;
    
    // 加权总分
    const totalWeight = checkResults.reduce((sum, r) => sum + r.weight, 0);
    const weightedScore = totalWeight > 0 ?
      checkResults.reduce((sum, r) => sum + (r.score * r.weight), 0) / totalWeight :
      0;
    const overallScore = Math.round(weightedScore);
    
    // 确定等级
    const level = Object.values(QUALITY_LEVELS).find(
      l => overallScore >= l.minScore
    ) || QUALITY_LEVELS.FAIL;
    
    // 按维度分组
    const dimensionScores = {};
    const dimensionGroups = {};
    
    checkResults.forEach(r => {
      if (!dimensionScores[r.dimension]) {
        dimensionScores[r.dimension] = [];
        dimensionGroups[r.dimension] = { total: 0, weight: 0 };
      }
      dimensionScores[r.dimension].push(r);
      dimensionGroups[r.dimension].total += r.score * r.weight;
      dimensionGroups[r.dimension].weight += r.weight;
    });
    
    const normalizedDimensionScores = {};
    Object.keys(dimensionScores).forEach(dim => {
      const group = dimensionGroups[dim];
      normalizedDimensionScores[dim] = Math.round(group.total / group.weight);
    });
    
    return {
      summary: { totalChecks, passedChecks, failedChecks, passRate },
      dimensionScores: normalizedDimensionScores,
      overallScore,
      level
    };
  }

  _renderHeader(reportName, metadata) {
    let header = '';
    header += `# ${reportName}\n\n`;
    header += `**生成时间**: ${new Date(this.options.timestamp).toLocaleString('zh-CN')}\n\n`;
    
    if (metadata.taskName) {
      header += `**任务名称**: ${metadata.taskName}\n\n`;
    }
    if (metadata.taskType) {
      header += `**任务类型**: ${metadata.taskType}\n\n`;
    }
    
    header += `---\n\n`;
    return header;
  }

  _renderExecutiveSummary(summary, overallScore, level, metadata) {
    let section = '';
    section += `## 📊 执行摘要\n\n`;
    section += `| 指标 | 数值 |\n`;
    section += `|------|------|\n`;
    section += `| **总体评分** | ${overallScore}/100 ${level.emoji} ${level.label} |\n`;
    section += `| **通过检查** | ${summary.passedChecks}/${summary.totalChecks} |\n`;
    section += `| **通过率** | ${summary.passRate}% |\n`;
    section += `| **状态** | ${summary.failedChecks > 0 ? '⚠️ 需要改进' : '✅ 达标'} |\n\n`;
    return section;
  }

  _renderKeyFindings(checkResults) {
    let section = '';
    section += `## 🔍 关键发现\n\n`;
    
    const failedChecks = checkResults.filter(r => !r.passed);
    const passedChecks = checkResults.filter(r => r.passed);
    
    if (failedChecks.length > 0) {
      section += `### ❌ 需要改进 (${failedChecks.length}项)\n\n`;
      failedChecks.forEach(check => {
        section += `#### ${check.criterion}\n`;
        section += `- **维度**: ${check.dimension}\n`;
        section += `- **评分**: ${check.score}/100\n`;
        if (check.issues.length > 0) {
          section += `- **问题**:\n`;
          check.issues.forEach(issue => {
            section += `  - ${issue}\n`;
          });
        }
        section += '\n';
      });
    }
    
    if (passedChecks.length > 0) {
      section += `### ✅ 达标项 (${passedChecks.length}项)\n\n`;
      passedChecks.forEach(check => {
        section += `- **${check.criterion}**: ${check.score}/100\n`;
      });
      section += '\n';
    }
    
    return section;
  }

  _renderDimensionAnalysis(dimensionScores) {
    let section = '';
    section += `## 📈 维度分析\n\n`;
    
    const dimensionLabels = {
      [QUALITY_DIMENSIONS.ACCURACY]: '准确性',
      [QUALITY_DIMENSIONS.COMPLETENESS]: '完整性',
      [QUALITY_DIMENSIONS.COHERENCE]: '连贯性',
      [QUALITY_DIMENSIONS.RELEVANCE]: '相关性',
      [QUALITY_DIMENSIONS.PROFESSIONALISM]: '专业性',
      [QUALITY_DIMENSIONS.READABILITY]: '可读性'
    };
    
    section += `| 维度 | 评分 | 等级 |\n`;
    section += `|------|------|------|\n`;
    
    Object.keys(dimensionScores).forEach(dim => {
      const score = dimensionScores[dim];
      const level = this._getLevelForScore(score);
      const label = dimensionLabels[dim] || dim;
      section += `| ${label} | ${score}/100 | ${level.emoji} ${level.label} |\n`;
    });
    
    section += '\n';
    return section;
  }

  _renderRecommendations(checkResults) {
    let section = '';
    section += `## 💡 改进建议\n\n`;
    
    const allSuggestions = [];
    checkResults.forEach(check => {
      if (check.suggestions.length > 0) {
        check.suggestions.forEach(suggestion => {
          allSuggestions.push({
            criterion: check.criterion,
            suggestion
          });
        });
      }
    });
    
    if (allSuggestions.length === 0) {
      section += `_暂无改进建议_ ✨\n\n`;
    } else {
      allSuggestions.forEach((item, index) => {
        section += `${index + 1}. **${item.criterion}**: ${item.suggestion}\n`;
      });
      section += '\n';
    }
    
    return section;
  }

  _renderNextSteps(checkResults) {
    let section = '';
    section += `## 🔄 下一步行动\n\n`;
    
    const failedChecks = checkResults.filter(r => !r.passed);
    
    if (failedChecks.length === 0) {
      section += `✅ **任务已完成，质量达标！**\n\n`;
      section += `- 可以进入下一阶段\n`;
      section += `- 准备交付最终成果\n`;
    } else {
      section += `⚠️ **需要处理以下问题后继续**:\n\n`;
      
      // 按优先级排序
      const sorted = failedChecks.sort((a, b) => {
        const priorityA = this._getPriority(a.dimension);
        const priorityB = this._getPriority(b.dimension);
        return priorityA - priorityB;
      });
      
      sorted.forEach((check, index) => {
        section += `${index + 1}. **${check.criterion}** (${check.dimension})\n`;
        section += `   - 当前: ${check.score}/100\n`;
        section += `   - 目标: 60+/100\n`;
        if (check.suggestions.length > 0) {
          section += `   - 建议: ${check.suggestions[0]}\n`;
        }
      });
    }
    
    section += '\n';
    return section;
  }

  _renderFooter(metadata) {
    let footer = '';
    footer += `---\n\n`;
    footer += `*本报告由元神质量检查系统生成*\n`;
    footer += `*生成时间: ${new Date(this.options.timestamp).toISOString()}*\n`;
    return footer;
  }

  _getLevelForScore(score) {
    return Object.values(QUALITY_LEVELS).find(
      l => score >= l.minScore
    ) || QUALITY_LEVELS.FAIL;
  }

  _getPriority(dimension) {
    const priorityMap = {
      [QUALITY_DIMENSIONS.ACCURACY]: 1,
      [QUALITY_DIMENSIONS.COMPLETENESS]: 2,
      [QUALITY_DIMENSIONS.RELEVANCE]: 3,
      [QUALITY_DIMENSIONS.COHERENCE]: 4,
      [QUALITY_DIMENSIONS.PROFESSIONALISM]: 5,
      [QUALITY_DIMENSIONS.READABILITY]: 6
    };
    return priorityMap[dimension] || 99;
  }

  _extractIssues(checkResults) {
    const issues = [];
    checkResults.forEach(check => {
      if (check.issues.length > 0) {
        issues.push({
          criterion: check.criterion,
          dimension: check.dimension,
          score: check.score,
          issues: check.issues
        });
      }
    });
    return issues;
  }

  _extractSuggestions(checkResults) {
    const suggestions = [];
    checkResults.forEach(check => {
      if (check.suggestions.length > 0) {
        suggestions.push({
          criterion: check.criterion,
          dimension: check.dimension,
          suggestions: check.suggestions
        });
      }
    });
    return suggestions;
  }

  _markdownToHTML(markdown, metadata) {
    // 简单的Markdown到HTML转换
    let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${metadata.taskName || 'Quality Report'}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
           max-width: 900px; margin: 0 auto; padding: 20px; }
    h1 { color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
    h2 { color: #555; margin-top: 30px; }
    h3 { color: #666; }
    table { border-collapse: collapse; width: 100%; margin: 15px 0; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f8f9fa; }
    code { background-color: #f4f4f4; padding: 2px 6px; border-radius: 3px; }
    pre { background-color: #f4f4f4; padding: 15px; border-radius: 5px; overflow-x: auto; }
    .header { background-color: #007bff; color: white; padding: 20px; border-radius: 5px; }
    .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin: 20px 0; }
    .summary-card { background: #f8f9fa; padding: 15px; border-radius: 5px; text-align: center; }
    .summary-card .value { font-size: 24px; font-weight: bold; color: #007bff; }
    .summary-card .label { font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${metadata.taskName || 'Quality Report'}</h1>
    <p>Generated: ${new Date(this.options.timestamp).toLocaleString('zh-CN')}</p>
  </div>
  <div class="content">
    ${markdown.replace(/^# (.*)/gm, '<h1>$1</h1>')
              .replace(/^## (.*)/gm, '<h2>$1</h2>')
              .replace(/^### (.*)/gm, '<h3>$1</h3>')
              .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
              .replace(/^- (.*)/gm, '<li>$1</li>')
              .replace(/^\| (.*) \|$/gm, (match) => {
                const cells = match.split('|').filter(c => c.trim());
                const isHeader = cells.some(c => c.includes('---'));
                if (isHeader) return '';
                const tag = 'td';
                return '<tr>' + cells.map(c => `<${tag}>${c.trim()}</${tag}>`).join('') + '</tr>';
              })}
  </div>
</body>
</html>`;
    return html;
  }
}

// ============== 主质量检查器 ==============
class EnhancedQualityChecker extends EventEmitter {
  constructor(options = {}) {
    super();
    this.checks = [];
    this.options = options;
    this.criteria = this._loadDefaultCriteria();
  }

  _loadDefaultCriteria() {
    return {
      [QUALITY_DIMENSIONS.ACCURACY]: [
        { criterion: '事实准确性', weight: 2.0 },
        { criterion: '数据可靠性', weight: 1.5 },
        { criterion: '逻辑正确性', weight: 1.5 }
      ],
      [QUALITY_DIMENSIONS.COMPLETENESS]: [
        { criterion: '需求覆盖度', weight: 1.5 },
        { criterion: '内容完整度', weight: 1.0 },
        { criterion: '交付物齐全', weight: 1.0 }
      ],
      [QUALITY_DIMENSIONS.COHERENCE]: [
        { criterion: '结构连贯性', weight: 1.0 },
        { criterion: '逻辑一致性', weight: 1.5 },
        { criterion: '过渡自然性', weight: 0.5 }
      ],
      [QUALITY_DIMENSIONS.RELEVANCE]: [
        { criterion: '切题程度', weight: 1.5 },
        { criterion: '内容相关性', weight: 1.0 },
        { criterion: '用户需求匹配', weight: 2.0 }
      ],
      [QUALITY_DIMENSIONS.PROFESSIONALISM]: [
        { criterion: '专业术语使用', weight: 0.5 },
        { criterion: '格式规范性', weight: 1.0 },
        { criterion: '表达专业度', weight: 1.0 }
      ],
      [QUALITY_DIMENSIONS.READABILITY]: [
        { criterion: '语言清晰度', weight: 1.0 },
        { criterion: '结构清晰度', weight: 1.0 },
        { criterion: '可读性评分', weight: 0.5 }
      ]
    };
  }

  /**
   * 添加检查项
   */
  addCheck(dimension, criterion, weight) {
    const check = new QualityCheckItem({ dimension, criterion, weight });
    this.checks.push(check);
    return check;
  }

  /**
   * 批量添加检查项
   */
  addChecks(dimension, criteria) {
    criteria.forEach(c => {
      this.addCheck(dimension, c.criterion, c.weight);
    });
  }

  /**
   * 执行质量检查 - 借鉴DeerFlow的质量审查流程
   */
  async check(content, context = {}) {
    const results = [];
    
    for (const check of this.checks) {
      const result = await this._evaluateCheck(check, content, context);
      results.push(result);
    }
    
    // 计算总体评分
    const { overallScore, level } = this._calculateOverallScore(results);
    
    // 生成报告
    const reportGenerator = new QualityReportGenerator({
      template: this.options.template || REPORT_TEMPLATES.EXECUTIVE_SUMMARY,
      format: this.options.format || 'markdown',
      includeEvidence: this.options.includeEvidence !== false,
      includeSuggestions: this.options.includeSuggestions !== false
    });
    
    const report = reportGenerator.generate(results, {
      taskName: context.taskName,
      taskType: context.taskType,
      ...context.metadata
    });
    
    return {
      results,
      overallScore,
      level,
      report,
      metadata: {
        checkedAt: Date.now(),
        contentLength: content.length,
        checksPerformed: results.length
      }
    };
  }

  async _evaluateCheck(check, content, context) {
    // 根据维度执行不同的评估逻辑
    let score = 70;  // 默认分数
    const issues = [];
    const suggestions = [];
    
    switch (check.dimension) {
      case QUALITY_DIMENSIONS.ACCURACY:
        ({ score, issues, suggestions } = this._evaluateAccuracy(content, context));
        break;
      case QUALITY_DIMENSIONS.COMPLETENESS:
        ({ score, issues, suggestions } = this._evaluateCompleteness(content, context));
        break;
      case QUALITY_DIMENSIONS.COHERENCE:
        ({ score, issues, suggestions } = this._evaluateCoherence(content, context));
        break;
      case QUALITY_DIMENSIONS.RELEVANCE:
        ({ score, issues, suggestions } = this._evaluateRelevance(content, context));
        break;
      case QUALITY_DIMENSIONS.PROFESSIONALISM:
        ({ score, issues, suggestions } = this._evaluateProfessionalism(content, context));
        break;
      case QUALITY_DIMENSIONS.READABILITY:
        ({ score, issues, suggestions } = this._evaluateReadability(content, context));
        break;
      default:
        // 自定义维度，给出基础分数
        break;
    }
    
    check.setScore(score, issues, suggestions);
    return check;
  }

  _evaluateAccuracy(content, context) {
    let score = 85;
    const issues = [];
    const suggestions = [];
    
    // 检查是否有明显的错误指示
    if (content.includes('错误') || content.includes('不确定')) {
      issues.push('内容包含错误或不确定的表述');
      score -= 10;
    }
    
    // 检查数据引用
    if (!content.match(/\d+%|数据来源|根据|引用/)) {
      issues.push('缺少数据支撑或引用');
      suggestions.push('添加具体数据或引用来源');
      score -= 15;
    }
    
    return { score, issues, suggestions };
  }

  _evaluateCompleteness(content, context) {
    let score = 80;
    const issues = [];
    const suggestions = [];
    
    // 检查长度是否足够
    const minLength = context.minLength || 500;
    if (content.length < minLength) {
      issues.push(`内容过短 (${content.length} < ${minLength}字符)`);
      suggestions.push('扩展内容以达到最低要求');
      score -= 20;
    }
    
    // 检查是否有明确的结构
    if (!content.match(/^#{1,3}\s/m)) {
      issues.push('缺少结构化标题');
      suggestions.push('使用标题分层组织内容');
      score -= 10;
    }
    
    return { score, issues, suggestions };
  }

  _evaluateCoherence(content, context) {
    let score = 75;
    const issues = [];
    const suggestions = [];
    
    // 检查段落过渡
    if (content.includes('然而') || content.includes('但是') || content.includes('不过')) {
      // 有过渡性词语，可能结构良好
      score += 10;
    }
    
    // 检查是否有明显的跳跃
    if (content.match(/\n\n\n/)) {
      issues.push('段落之间可能有跳跃');
      suggestions.push('确保段落之间有流畅的过渡');
      score -= 10;
    }
    
    return { score, issues, suggestions };
  }

  _evaluateRelevance(content, context) {
    let score = 80;
    const issues = [];
    const suggestions = [];
    
    // 检查是否切题
    if (context.keywords) {
      const keywordCount = context.keywords.filter(k => content.includes(k)).length;
      const relevanceRatio = keywordCount / context.keywords.length;
      if (relevanceRatio < 0.5) {
        issues.push('关键词覆盖率过低');
        suggestions.push('确保核心关键词得到充分讨论');
        score -= 20;
      }
    }
    
    return { score, issues, suggestions };
  }

  _evaluateProfessionalism(content, context) {
    let score = 75;
    const issues = [];
    const suggestions = [];
    
    // 检查专业术语
    const professionalTerms = ['分析', '研究', '评估', '结论', '数据', '方法', '结果'];
    const termCount = professionalTerms.filter(t => content.includes(t)).length;
    if (termCount < 2) {
      suggestions.push('增加专业术语使用以提升专业度');
      score -= 10;
    }
    
    // 检查格式规范性
    if (!content.match(/^#{1,3}\s/m) && !content.match(/\n- /)) {
      issues.push('格式不够规范');
      suggestions.push('使用标题或列表来组织内容');
      score -= 15;
    }
    
    return { score, issues, suggestions };
  }

  _evaluateReadability(content, context) {
    let score = 80;
    const issues = [];
    const suggestions = [];
    
    // 句子长度检查
    const sentences = content.split(/[.。!！?？]/);
    const longSentences = sentences.filter(s => s.length > 50);
    if (longSentences.length > sentences.length * 0.3) {
      issues.push('句子过长，影响阅读');
      suggestions.push('将长句拆分为短句');
      score -= 15;
    }
    
    // 段落长度检查
    const paragraphs = content.split(/\n\n/);
    const longParagraphs = paragraphs.filter(p => p.length > 300);
    if (longParagraphs.length > paragraphs.length * 0.5) {
      issues.push('段落过长');
      suggestions.push('将长段落拆分为多个短段落');
      score -= 10;
    }
    
    return { score, issues, suggestions };
  }

  _calculateOverallScore(results) {
    const totalWeight = results.reduce((sum, r) => sum + r.weight, 0);
    const weightedScore = totalWeight > 0 ?
      results.reduce((sum, r) => sum + (r.score * r.weight), 0) / totalWeight :
      0;
    const overallScore = Math.round(weightedScore);
    
    const level = Object.values(QUALITY_LEVELS).find(
      l => overallScore >= l.minScore
    ) || QUALITY_LEVELS.FAIL;
    
    return { overallScore, level };
  }

  /**
   * 快速质量评分
   */
  quickScore(content) {
    const score = Math.min(100, Math.round(
      (content.length > 500 ? 20 : content.length / 25) +
      (content.match(/^#{1,3}\s/m) ? 20 : 0) +
      (content.match(/\d+%|数据|研究|分析/gi) ? 30 : 0) +
      (content.includes('结论') || content.includes('总结') ? 15 : 0) +
      15
    ));
    
    const level = this._getLevelForScore(score);
    
    return { score, level, label: level.label };
  }
}

// ============== 导出 ==============
module.exports = {
  EnhancedQualityChecker,
  QualityReportGenerator,
  QualityCheckItem,
  QUALITY_DIMENSIONS,
  QUALITY_LEVELS,
  REPORT_TEMPLATES
};
