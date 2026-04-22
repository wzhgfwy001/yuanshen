/**
 * DeerFlow增强版渐进处理器
 * 
 * 借鉴DeerFlow的设计：
 * 1. 渐进式输出 - 流式处理
 * 2. 分块处理 - 大任务分解
 * 3. 中间结果保存
 * 4. 可恢复执行
 */

const { EventEmitter } = require('events');

// ============== 处理块类 ==============
class ProcessingChunk {
  constructor(index, data, metadata = {}) {
    this.index = index;
    this.data = data;
    this.metadata = metadata;
    this.status = 'pending'; // pending, processing, completed, failed
    this.result = null;
    this.error = null;
    this.startedAt = null;
    this.completedAt = null;
  }

  getDuration() {
    if (!this.startedAt || !this.completedAt) return null;
    return this.completedAt - this.startedAt;
  }
}

// ============== ProgressiveProcessor 主类 ==============
class ProgressiveProcessor extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      chunkSize: config.chunkSize || 1000,
      maxConcurrency: config.maxConcurrency || 3,
      enableCheckpointing: config.enableCheckpointing !== false,
      checkpointInterval: config.checkpointInterval || 5,
      ...config
    };
    
    this.chunks = [];
    this.results = [];
    this.currentIndex = 0;
    this.checkpoints = new Map();
    this.status = 'idle'; // idle, processing, paused, completed, failed
  }

  /**
   * 处理数据
   */
  async process(data, options = {}) {
    const {
      processorFn,
      aggregatorFn = null,
      onProgress = null,
      onChunkComplete = null,
      resumeFromCheckpoint = false
    } = options;

    this.status = 'processing';
    this.chunks = [];
    this.results = [];

    // 分割数据
    if (Array.isArray(data)) {
      this.chunks = this._createChunks(data);
    } else {
      this.chunks = this._chunkData(data, this.config.chunkSize);
    }

    // 恢复检查点
    if (resumeFromCheckpoint && this.checkpoints.has('lastProcessed')) {
      this.currentIndex = this.checkpoints.get('lastProcessed') + 1;
      this.emit('resumed', { fromIndex: this.currentIndex });
    }

    const totalChunks = this.chunks.length;
    const completedChunks = [];

    try {
      for (let i = this.currentIndex; i < totalChunks; i++) {
        if (this.status === 'paused') {
          this.checkpoints.set('lastProcessed', i - 1);
          break;
        }

        const chunk = this.chunks[i];
        chunk.status = 'processing';
        chunk.startedAt = Date.now();

        this.emit('chunk_started', {
          index: i,
          total: totalChunks,
          chunk
        });

        try {
          const result = await processorFn(chunk.data, i, totalChunks);
          chunk.status = 'completed';
          chunk.result = result;
          chunk.completedAt = Date.now();

          completedChunks.push(result);
          this.results.push(result);

          if (onChunkComplete) {
            await onChunkComplete(chunk, completedChunks);
          }

          // 检查点保存
          if (this.config.enableCheckpointing && 
              (i + 1) % this.config.checkpointInterval === 0) {
            await this._saveCheckpoint(i, this.results);
          }

          this.emit('chunk_completed', {
            index: i,
            duration: chunk.getDuration(),
            result
          });

          // 进度回调
          if (onProgress) {
            await onProgress({
              current: i + 1,
              total: totalChunks,
              percent: ((i + 1) / totalChunks) * 100,
              result
            });
          }

        } catch (error) {
          chunk.status = 'failed';
          chunk.error = error;
          chunk.completedAt = Date.now();

          this.emit('chunk_failed', {
            index: i,
            error: error.message
          });

          // 继续处理还是停止
          if (!this.config.continueOnError) {
            throw error;
          }
        }
      }

      // 聚合结果
      let finalResult = this.results;
      if (aggregatorFn && completedChunks.length > 0) {
        finalResult = await aggregatorFn(completedChunks);
      }

      this.status = 'completed';
      this.emit('processing_completed', {
        totalChunks,
        successful: completedChunks.length,
        failed: this.chunks.filter(c => c.status === 'failed').length,
        result: finalResult
      });

      return finalResult;

    } catch (error) {
      this.status = 'failed';
      this.emit('processing_failed', { error: error.message });
      throw error;
    }
  }

  /**
   * 暂停处理
   */
  pause() {
    this.status = 'paused';
    this.emit('paused', { 
      lastProcessed: this.currentIndex - 1 
    });
  }

  /**
   * 恢复处理
   */
  resume() {
    if (this.status !== 'paused') {
      throw new Error('Can only resume from paused state');
    }
    return this.status === 'paused';
  }

  /**
   * 获取进度
   */
  getProgress() {
    const total = this.chunks.length;
    const completed = this.chunks.filter(c => c.status === 'completed').length;
    const failed = this.chunks.filter(c => c.status === 'failed').length;
    const processing = this.chunks.filter(c => c.status === 'processing').length;

    return {
      status: this.status,
      total,
      completed,
      failed,
      processing,
      pending: total - completed - failed - processing,
      percent: total > 0 ? (completed / total) * 100 : 0
    };
  }

  /**
   * 获取检查点
   */
  getCheckpoint(name = 'default') {
    return this.checkpoints.get(name);
  }

  /**
   * 保存检查点
   */
  async _saveCheckpoint(index, results) {
    this.checkpoints.set('lastProcessed', index);
    this.checkpoints.set('results', [...results]);
    
    this.emit('checkpoint_saved', {
      index,
      checkpointTime: Date.now()
    });
  }

  /**
   * 创建块
   */
  _createChunks(data) {
    return data.map((item, index) => new ProcessingChunk(index, item));
  }

  /**
   * 分块数据
   */
  _chunkData(data, size) {
    const chunks = [];
    const keys = Object.keys(data);
    
    for (let i = 0; i < keys.length; i += size) {
      const chunkData = {};
      const chunkKeys = keys.slice(i, i + size);
      
      for (const key of chunkKeys) {
        chunkData[key] = data[key];
      }
      
      chunks.push(new ProcessingChunk(Math.floor(i / size), chunkData));
    }
    
    return chunks;
  }
}

// ============== 流式处理器 ==============
class StreamingProcessor extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = config;
    this.buffer = [];
    this.bufferSize = config.bufferSize || 10;
    this.flushInterval = config.flushInterval || 1000;
    this.processorFn = null;
    this.timer = null;
  }

  /**
   * 开始流处理
   */
  start(processorFn) {
    this.processorFn = processorFn;
    
    this.timer = setInterval(() => {
      this._flush();
    }, this.flushInterval);
  }

  /**
   * 推送数据
   */
  push(data) {
    this.buffer.push(data);
    
    if (this.buffer.length >= this.bufferSize) {
      this._flush();
    }
  }

  /**
   * 刷新缓冲区
   */
  async _flush() {
    if (this.buffer.length === 0 || !this.processorFn) return;

    const toProcess = [...this.buffer];
    this.buffer = [];

    try {
      const results = await this.processorFn(toProcess);
      this.emit('batch_processed', {
        count: toProcess.length,
        results
      });
    } catch (error) {
      this.emit('batch_failed', {
        count: toProcess.length,
        error: error.message
      });
    }
  }

  /**
   * 停止
   */
  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    
    // 最后一次刷新
    return this._flush();
  }
}

// ============== 导出 ==============
module.exports = {
  ProgressiveProcessor,
  StreamingProcessor,
  ProcessingChunk
};
