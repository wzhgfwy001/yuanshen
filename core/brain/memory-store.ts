/**
 * Memory Store - 分层记忆存储模块
 * 
 * 提供分层记忆存储，支持工作记忆、情景记忆、长期记忆和程序记忆。
 * 实现记忆的存取、压缩、巩固和遗忘机制。
 * 
 * @version 1.0.0
 * @module brain
 */

import { v4 as uuidv4 } from 'uuid';
import { MemoryItem, MemoryType, MemoryQuery, MemoryContent } from './brain';

// ============================================================================
// Memory Store Configuration
// ============================================================================

export interface MemoryStoreConfig {
  workingMemorySize: number;
  episodicMaxSize: number;
  longtermMaxSize: number;
  proceduralMaxSize: number;
  defaultTTL: number;
  compressionThreshold: number;
  consolidationInterval: number;
}

// ============================================================================
// Memory Index for Fast Lookup
// ============================================================================

interface MemoryIndex {
  byId: Map<string, MemoryItem>;
  byType: Map<MemoryType, Set<string>>;
  byTag: Map<string, Set<string>>;
  byTime: string[];  // Sorted by timestamp
}

// ============================================================================
// Memory Store Class
// ============================================================================

export class MemoryStore {
  private items: Map<string, MemoryItem> = new Map();
  private index: MemoryIndex = {
    byId: new Map(),
    byType: new Map([
      ['working', new Set()],
      ['episodic', new Set()],
      ['longterm', new Set()],
      ['procedural', new Set()],
    ]),
    byTag: new Map(),
    byTime: [],
  };
  private config: MemoryStoreConfig;

  constructor(config?: Partial<MemoryStoreConfig>) {
    this.config = {
      workingMemorySize: 7,
      episodicMaxSize: 1000,
      longtermMaxSize: 100000,
      proceduralMaxSize: 10000,
      defaultTTL: 5 * 60 * 1000,
      compressionThreshold: 100,
      consolidationInterval: 60 * 60 * 1000,
      ...config,
    };
  }

  // ==========================================================================
  // Core Operations
  // ==========================================================================

  /**
   * 存储记忆
   */
  store(content: MemoryContent, type?: MemoryType): MemoryItem {
    const memoryType = type || this.decideType(content);
    const importance = content.importance ?? 0.5;

    const item: MemoryItem = {
      id: uuidv4(),
      type: memoryType,
      content: content.content,
      importance,
      relevance: 1.0,
      timestamp: Date.now(),
      expiresAt: this.calculateExpiry(memoryType),
      tags: content.tags || [],
      metadata: content.metadata || {},
      accessCount: 0,
      lastAccessed: Date.now(),
    };

    // Add to storage
    this.items.set(item.id, item);
    this.indexById(item);
    this.indexByType(item);
    this.indexByTags(item);
    this.indexByTime(item);

    return item;
  }

  /**
   * 检索记忆
   */
  retrieve(query: MemoryQuery): MemoryItem[] {
    let candidates = Array.from(this.items.values());

    // Filter by type
    if (query.type && query.type.length > 0) {
      candidates = candidates.filter(item => query.type!.includes(item.type));
    }

    // Filter by tags
    if (query.tags && query.tags.length > 0) {
      candidates = candidates.filter(item =>
        query.tags!.some(tag => item.tags.includes(tag))
      );
    }

    // Filter by time range
    if (query.timeRange) {
      candidates = candidates.filter(item =>
        item.timestamp >= query.timeRange!.start &&
        item.timestamp <= query.timeRange!.end
      );
    }

    // Filter by relevance
    if (query.query) {
      candidates = candidates
        .map(item => ({
          ...item,
          relevance: this.calculateRelevance(item, query.query!),
        }))
        .filter(item => item.relevance >= (query.minRelevance || 0));
    }

    // Filter by metadata
    if (query.metadata) {
      candidates = candidates.filter(item =>
        Object.entries(query.metadata!).every(([k, v]) => item.metadata[k] === v)
      );
    }

    // Sort by relevance and importance
    candidates.sort((a, b) => {
      const scoreA = a.relevance * 0.6 + a.importance * 0.4;
      const scoreB = b.relevance * 0.6 + b.importance * 0.4;
      return scoreB - scoreA;
    });

    // Update access stats
    candidates.slice(0, query.limit || 10).forEach(item => {
      item.accessCount++;
      item.lastAccessed = Date.now();
    });

    return candidates.slice(0, query.limit);
  }

  /**
   * 获取单个记忆
   */
  get(id: string): MemoryItem | undefined {
    const item = this.items.get(id);
    if (item) {
      item.accessCount++;
      item.lastAccessed = Date.now();
    }
    return item;
  }

  /**
   * 更新记忆
   */
  update(id: string, updates: Partial<MemoryItem>): MemoryItem | null {
    const item = this.items.get(id);
    if (!item) return null;

    const oldType = item.type;
    Object.assign(item, updates);

    // If type changed, re-index
    if (updates.type && updates.type !== oldType) {
      this.index.byType.get(oldType)?.delete(id);
      this.index.byType.get(updates.type)?.add(id);
    }

    // Update tag index
    if (updates.tags) {
      // Remove old tag references
      item.tags.forEach(tag => this.index.byTag.get(tag)?.delete(id));
      // Add new tag references
      updates.tags.forEach(tag => this.index.byTag.get(tag)?.add(id));
    }

    return item;
  }

  /**
   * 删除记忆
   */
  delete(id: string): boolean {
    const item = this.items.get(id);
    if (!item) return false;

    // Remove from all indexes
    this.index.byId.delete(id);
    this.index.byType.get(item.type)?.delete(id);
    item.tags.forEach(tag => this.index.byTag.get(tag)?.delete(id));

    const timeIndex = this.index.byTime.indexOf(id);
    if (timeIndex !== -1) {
      this.index.byTime.splice(timeIndex, 1);
    }

    this.items.delete(id);
    return true;
  }

  /**
   * 清空指定类型的记忆
   */
  clear(type: MemoryType): number {
    const ids = Array.from(this.index.byType.get(type) || []);
    ids.forEach(id => this.delete(id));
    return ids.length;
  }

  // ==========================================================================
  // Memory Type Management
  // ==========================================================================

  /**
   * 将记忆提升到长期记忆
   */
  promote(id: string): boolean {
    const item = this.items.get(id);
    if (!item || item.type === 'longterm') return false;

    this.index.byType.get(item.type)?.delete(id);
    item.type = 'longterm';
    item.expiresAt = undefined;  // Long-term doesn't expire
    this.index.byType.get('longterm')?.add(id);

    return true;
  }

  /**
   * 将记忆降级到情景记忆
   */
  demote(id: string): boolean {
    const item = this.items.get(id);
    if (!item || item.type === 'episodic') return false;

    this.index.byType.get(item.type)?.delete(id);
    item.type = 'episodic';
    item.expiresAt = this.calculateExpiry('episodic');
    this.index.byType.get('episodic')?.add(id);

    return true;
  }

  // ==========================================================================
  // Maintenance Operations
  // ==========================================================================

  /**
   * 执行记忆压缩
   */
  compress(options?: { type?: MemoryType; threshold?: number }): number {
    const type = options?.type;
    const threshold = options?.threshold ?? this.config.compressionThreshold;

    let compressed = 0;

    const processItems = (items: MemoryItem[]) => {
      const toCompress: MemoryItem[] = [];

      for (const item of items) {
        // Mark items with low relevance for compression
        if (item.accessCount < 2 && item.importance < 0.5) {
          toCompress.push(item);
        }
      }

      for (const item of toCompress) {
        if (this.compressItem(item)) {
          compressed++;
        }
      }
    };

    if (type) {
      const typeItems = Array.from(this.index.byType.get(type) || [])
        .map(id => this.items.get(id)!)
        .filter(Boolean);
      processItems(typeItems);
    } else {
      for (const type of ['working', 'episodic', 'longterm', 'procedural'] as MemoryType[]) {
        const typeItems = Array.from(this.index.byType.get(type) || [])
          .map(id => this.items.get(id)!)
          .filter(Boolean);
        processItems(typeItems);
      }
    }

    return compressed;
  }

  /**
   * 压缩单个记忆项
   */
  private compressItem(item: MemoryItem): boolean {
    if (typeof item.content !== 'string') {
      // Non-string content can't be compressed
      return false;
    }

    // Simple compression: truncate long content
    if (item.content.length > 500) {
      item.content = item.content.slice(0, 500) + '...[compressed]';
      item.metadata.compressed = true;
      item.metadata.originalLength = item.metadata.originalLength || item.content.length;
      return true;
    }

    return false;
  }

  /**
   * 执行记忆巩固
   */
  consolidate(): { promoted: number; demoted: number; deleted: number } {
    const stats = { promoted: 0, demoted: 0, deleted: 0 };

    for (const item of this.items.values()) {
      // High-importance episodic memories -> longterm
      if (item.type === 'episodic' && item.importance > 0.8 && item.accessCount > 3) {
        if (this.promote(item.id)) stats.promoted++;
      }

      // Old working memories -> episodic
      if (item.type === 'working' && item.expiresAt && Date.now() > item.expiresAt) {
        if (this.demote(item.id)) stats.demoted++;
      }

      // Very low importance -> delete
      if (item.importance < 0.1) {
        if (this.delete(item.id)) stats.deleted++;
      }
    }

    return stats;
  }

  /**
   * 清理过期记忆
   */
  cleanup(): number {
    let cleaned = 0;
    const now = Date.now();

    for (const [id, item] of this.items.entries()) {
      if (item.expiresAt && now > item.expiresAt) {
        if (this.delete(id)) cleaned++;
      }
    }

    return cleaned;
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  /**
   * 获取统计信息
   */
  getStats(): {
    total: number;
    byType: Record<MemoryType, number>;
    avgImportance: number;
    oldestItem: number;
    newestItem: number;
  } {
    const items = Array.from(this.items.values());
    const byType: Record<MemoryType, number> = {
      working: 0,
      episodic: 0,
      longterm: 0,
      procedural: 0,
    };

    let totalImportance = 0;
    let oldest = Infinity;
    let newest = 0;

    for (const item of items) {
      byType[item.type]++;
      totalImportance += item.importance;
      if (item.timestamp < oldest) oldest = item.timestamp;
      if (item.timestamp > newest) newest = item.timestamp;
    }

    return {
      total: items.length,
      byType,
      avgImportance: items.length > 0 ? totalImportance / items.length : 0,
      oldestItem: oldest === Infinity ? 0 : oldest,
      newestItem: newest,
    };
  }

  /**
   * 导出所有记忆
   */
  export(): MemoryItem[] {
    return Array.from(this.items.values());
  }

  /**
   * 导入记忆
   */
  import(items: MemoryItem[]): number {
    let imported = 0;
    for (const item of items) {
      this.items.set(item.id, item);
      this.indexById(item);
      this.indexByType(item);
      this.indexByTags(item);
      this.indexByTime(item);
      imported++;
    }
    return imported;
  }

  // ==========================================================================
  // Private Helper Methods
  // ==========================================================================

  private decideType(content: MemoryContent): MemoryType {
    if (content.type) return content.type;

    // Procedural if has skill/procedure metadata
    if (content.metadata?.skill || content.metadata?.procedure) {
      return 'procedural';
    }

    // High importance -> longterm
    if ((content.importance ?? 0.5) > 0.8) {
      return 'longterm';
    }

    // Default to episodic
    return 'episodic';
  }

  private calculateExpiry(type: MemoryType): number | undefined {
    switch (type) {
      case 'working':
        return Date.now() + this.config.defaultTTL;
      case 'episodic':
        return Date.now() + this.config.consolidationInterval * 24;
      case 'longterm':
      case 'procedural':
        return undefined;
    }
  }

  private calculateRelevance(item: MemoryItem, query: string): number {
    let score = 0;
    const queryLower = query.toLowerCase();

    // Content match
    if (typeof item.content === 'string') {
      const contentLower = item.content.toLowerCase();
      if (contentLower.includes(queryLower)) {
        score += 0.6;
        if (contentLower === queryLower) score += 0.2;
      }
    }

    // Tag match
    const tagMatches = item.tags.filter(tag =>
      tag.toLowerCase().includes(queryLower)
    ).length;
    score += tagMatches * 0.1;

    // Recency bonus
    const hoursSince = (Date.now() - item.lastAccessed) / (1000 * 60 * 60);
    if (hoursSince < 1) score += 0.1;
    else if (hoursSince < 24) score += 0.05;

    // Access count bonus
    if (item.accessCount > 5) score += 0.1;

    return Math.min(1, score);
  }

  private indexById(item: MemoryItem): void {
    this.index.byId.set(item.id, item);
  }

  private indexByType(item: MemoryItem): void {
    this.index.byType.get(item.type)?.add(item.id);
  }

  private indexByTags(item: MemoryItem): void {
    for (const tag of item.tags) {
      if (!this.index.byTag.has(tag)) {
        this.index.byTag.set(tag, new Set());
      }
      this.index.byTag.get(tag)!.add(item.id);
    }
  }

  private indexByTime(item: MemoryItem): void {
    // Insert in sorted order
    const idx = this.index.byTime.findIndex(id => {
      const other = this.items.get(id);
      return other && other.timestamp > item.timestamp;
    });

    if (idx === -1) {
      this.index.byTime.push(item.id);
    } else {
      this.index.byTime.splice(idx, 0, item.id);
    }
  }
}

export default MemoryStore;
