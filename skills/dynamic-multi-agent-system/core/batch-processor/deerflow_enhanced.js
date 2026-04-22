/**
 * DeerFlow增强版批处理器
 * 
 * 借鉴DeerFlow的设计：
 * 1. 批量任务处理
 * 2. 并发控制
 * 3. 错误收集
 * 4. 进度追踪
 */

const { EventEmitter } = require('events');

// ============== 批处理结果类 ==============
class BatchResult {
  constructor(total) {
    this.total = total;
    this.processed = 0;
    this.succeeded = 0;
    this.failed = 0;
    this.errors = [];
    this.results = [];
    this.startTime = Date.now();
    this.endTime = null;
  }

  addSuccess(result) {
    this.processed++;
    this.succeeded++;
    this.results.push(result);
  }

  addFailure(error) {
    this.processed++;
    this.failed++;
    this.errors.push(error);
  }

  complete() {
    this.endTime = Date.now();
  }

  getDuration() {
    if (!this.endTime) return null;
    return this.endTime - this.startTime;
  }

  getSuccessRate() {
    return this.total > 0 ? (this.succeeded / this.total) * 100 : 0;
  }
}

// ============== BatchProcessor 主类 ==============
class BatchProcessor extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      concurrency: config.concurrency || 5,
      retryCount: config.retryCount || 0,
      retryDelay: config.retryDelay || 1000,
      continueOnError: config.continueOnError !== false,
      timeout: config.timeout || 60000,
      ...config
    };
  }

  /**
   * 处理批量任务
   */
  async process(items, processorFn, options = {}) {
    const result = new BatchResult(items.length);
    
    this.emit('batch_started', { total: items.length });

    // 分组建队
    const batches = this._createBatches(items, this.config.concurrency);

    for (const batch of batches) {
      const promises = batch.map(async (item, index) => {
        const globalIndex = items.indexOf(item);
        
        try {
          const processedResult = await this._processWithRetry(
            item, 
            processorFn, 
            options
          );
          
          result.addSuccess(processedResult);
          this.emit('item_succeeded', { 
            index: globalIndex, 
            result: processedResult 
          });
          
          return processedResult;
          
        } catch (error) {
          result.addFailure(error);
          this.emit('item_failed', { 
            index: globalIndex, 
            error: error.message 
          });

          if (!this.config.continueOnError) {
            throw error;
          }
          
          return null;
        }
      });

      await Promise.all(promises);

      // 进度报告
      this.emit('batch_progress', {
        processed: result.processed,
        total: result.total,
        percent: (result.processed / result.total) * 100
      });
    }

    result.complete();
    this.emit('batch_completed', result);

    return result;
  }

  /**
   * 带重试的处理
   */
  async _processWithRetry(item, processorFn, options = {}) {
    const maxRetries = options.retryCount !== undefined 
      ? options.retryCount 
      : this.config.retryCount;
    
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this._processWithTimeout(item, processorFn);
        
      } catch (error) {
        lastError = error;
        
        if (attempt < maxRetries) {
          const delay = (options.retryDelay || this.config.retryDelay) * Math.pow(2, attempt);
          this.emit('retry_scheduled', { 
            attempt: attempt + 1, 
            delay 
          });
          await this._delay(delay);
        }
      }
    }
    
    throw lastError;
  }

  /**
   * 超时处理
   */
  async _processWithTimeout(item, processorFn) {
    return Promise.race([
      Promise.resolve(processorFn(item)),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Processing timeout')), this.config.timeout)
      )
    ]);
  }

  /**
   * 分批
   */
  _createBatches(items, batchSize) {
    const batches = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    
    return batches;
  }

  /**
   * 延迟
   */
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 流水线处理
   */
  async pipeline(stages, initialItems) {
    let currentItems = initialItems;

    for (let i = 0; i < stages.length; i++) {
      const stage = stages[i];
      this.emit('pipeline_stage_started', { 
        stage: i + 1, 
        total: stages.length,
        stageName: stage.name 
      });

      const result = await this.process(currentItems, stage.processor, stage.options || {});
      
      if (!this.config.continueOnError && result.failed > 0) {
        throw new Error(`Pipeline stage ${i + 1} failed with ${result.failed} errors`);
      }

      currentItems = result.results.filter(r => r !== null);
      
      this.emit('pipeline_stage_completed', { 
        stage: i + 1, 
        succeeded: result.succeeded,
        failed: result.failed
      });
    }

    return currentItems;
  }
}

// ============== 导出 ==============
module.exports = {
  BatchProcessor,
  BatchResult
};
