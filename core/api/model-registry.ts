/**
 * Model Registry - 模型注册表
 * 
 * 管理所有可用AI模型和Provider配置的注册表。
 * 
 * @version 1.0.0
 * @module api
 */

import { ProviderType, ModelInfo } from './api-client';

// ============================================================================
// Provider Configuration
// ============================================================================

export interface ProviderConfig {
  type: ProviderType;
  apiKey?: string;
  baseURL?: string;
  organization?: string;
  endpoint?: string;
  apiVersion?: string;
  defaultModel: string;
  enabled: boolean;
}

export interface ModelRegistryConfig {
  providers: ProviderConfig[];
  models: ModelInfo[];
  defaultStrategy: 'cost-optimized' | 'latency-optimized' | 'quality-first' | 'balanced';
  rateLimits: Record<string, { rpm: number; tpm: number }>;
}

// ============================================================================
// Provider Definitions
// ============================================================================

export const DEFAULT_PROVIDERS: ProviderConfig[] = [
  {
    type: 'openai',
    apiKey: process.env.OPENAI_API_KEY,
    organization: process.env.OPENAI_ORG_ID,
    baseURL: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4-turbo-preview',
    enabled: !!process.env.OPENAI_API_KEY,
  },
  {
    type: 'anthropic',
    apiKey: process.env.ANTHROPIC_API_KEY,
    baseURL: 'https://api.anthropic.com',
    defaultModel: 'claude-3-opus-20240229',
    enabled: !!process.env.ANTHROPIC_API_KEY,
  },
  {
    type: 'azure',
    apiKey: process.env.AZURE_API_KEY,
    endpoint: process.env.AZURE_ENDPOINT,
    apiVersion: '2024-02-01',
    defaultModel: 'gpt-4-turbo',
    enabled: !!process.env.AZURE_API_KEY && !!process.env.AZURE_ENDPOINT,
  },
  {
    type: 'google',
    apiKey: process.env.GOOGLE_API_KEY,
    baseURL: 'https://generativelanguage.googleapis.com',
    defaultModel: 'gemini-pro',
    enabled: !!process.env.GOOGLE_API_KEY,
  },
  {
    type: 'local',
    apiKey: 'ollama',
    baseURL: process.env.LOCAL_MODEL_URL || 'http://localhost:11434/v1',
    defaultModel: 'llama2',
    enabled: true,
  },
];

// ============================================================================
// Model Registry
// ============================================================================

class ModelRegistry {
  private models: Map<string, ModelInfo> = new Map();
  private providers: Map<ProviderType, ProviderConfig> = new Map();

  constructor() {
    // Initialize default models
    this.initializeDefaultModels();
    // Initialize providers
    this.initializeProviders(DEFAULT_PROVIDERS);
  }

  private initializeDefaultModels(): void {
    const defaultModels: ModelInfo[] = [
      // OpenAI Models
      {
        id: 'gpt-4-turbo-preview',
        name: 'GPT-4 Turbo',
        provider: 'openai',
        contextWindow: 128000,
        inputCostPer1K: 0.01,
        outputCostPer1K: 0.03,
        capabilities: ['chat', 'vision', 'function-calling', 'json-mode', 'streaming'],
        quality: 0.95,
        speed: 0.6,
      },
      {
        id: 'gpt-4',
        name: 'GPT-4',
        provider: 'openai',
        contextWindow: 8192,
        inputCostPer1K: 0.03,
        outputCostPer1K: 0.06,
        capabilities: ['chat', 'vision', 'function-calling'],
        quality: 0.95,
        speed: 0.4,
      },
      {
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        provider: 'openai',
        contextWindow: 16385,
        inputCostPer1K: 0.0005,
        outputCostPer1K: 0.0015,
        capabilities: ['chat', 'function-calling', 'streaming'],
        quality: 0.8,
        speed: 0.9,
      },
      // Anthropic Models
      {
        id: 'claude-3-opus-20240229',
        name: 'Claude 3 Opus',
        provider: 'anthropic',
        contextWindow: 200000,
        inputCostPer1K: 0.015,
        outputCostPer1K: 0.075,
        capabilities: ['chat', 'vision', 'function-calling', 'long-context', 'streaming'],
        quality: 0.98,
        speed: 0.4,
      },
      {
        id: 'claude-3-sonnet-20240229',
        name: 'Claude 3 Sonnet',
        provider: 'anthropic',
        contextWindow: 200000,
        inputCostPer1K: 0.003,
        outputCostPer1K: 0.015,
        capabilities: ['chat', 'vision', 'function-calling', 'long-context', 'streaming'],
        quality: 0.9,
        speed: 0.7,
      },
      {
        id: 'claude-3-haiku-20240307',
        name: 'Claude 3 Haiku',
        provider: 'anthropic',
        contextWindow: 200000,
        inputCostPer1K: 0.00025,
        outputCostPer1K: 0.00125,
        capabilities: ['chat', 'vision', 'fast', 'streaming'],
        quality: 0.75,
        speed: 0.95,
      },
      // Google Models
      {
        id: 'gemini-pro',
        name: 'Gemini Pro',
        provider: 'google',
        contextWindow: 32768,
        inputCostPer1K: 0.00025,
        outputCostPer1K: 0.00125,
        capabilities: ['chat', 'vision', 'multimodal'],
        quality: 0.82,
        speed: 0.85,
      },
      {
        id: 'gemini-pro-vision',
        name: 'Gemini Pro Vision',
        provider: 'google',
        contextWindow: 32768,
        inputCostPer1K: 0.00025,
        outputCostPer1K: 0.00125,
        capabilities: ['chat', 'vision', 'image-understanding'],
        quality: 0.82,
        speed: 0.8,
      },
      // Local Models
      {
        id: 'llama2',
        name: 'Llama 2',
        provider: 'local',
        contextWindow: 4096,
        inputCostPer1K: 0,
        outputCostPer1K: 0,
        capabilities: ['chat', 'streaming'],
        quality: 0.7,
        speed: 0.5,
      },
      {
        id: 'codellama',
        name: 'Code Llama',
        provider: 'local',
        contextWindow: 16384,
        inputCostPer1K: 0,
        outputCostPer1K: 0,
        capabilities: ['code-generation', 'code-completion', 'chat'],
        quality: 0.75,
        speed: 0.5,
      },
    ];

    defaultModels.forEach(model => this.register(model));
  }

  private initializeProviders(configs: ProviderConfig[]): void {
    configs.forEach(config => {
      if (config.enabled) {
        this.providers.set(config.type, config);
      }
    });
  }

  /**
   * 注册模型
   */
  register(model: ModelInfo): void {
    this.models.set(model.id, model);
  }

  /**
   * 获取模型信息
   */
  getModel(modelId: string): ModelInfo | undefined {
    return this.models.get(modelId);
  }

  /**
   * 获取所有模型
   */
  getAllModels(): ModelInfo[] {
    return Array.from(this.models.values());
  }

  /**
   * 按Provider获取模型
   */
  getModelsByProvider(provider: ProviderType): ModelInfo[] {
    return this.getAllModels().filter(m => m.provider === provider);
  }

  /**
   * 按能力获取模型
   */
  getModelsByCapability(capability: string): ModelInfo[] {
    return this.getAllModels().filter(m => m.capabilities.includes(capability));
  }

  /**
   * 获取Provider配置
   */
  getProvider(type: ProviderType): ProviderConfig | undefined {
    return this.providers.get(type);
  }

  /**
   * 获取所有启用的Provider
   */
  getEnabledProviders(): ProviderConfig[] {
    return Array.from(this.providers.values()).filter(p => p.enabled);
  }

  /**
   * 根据策略选择模型
   */
  selectModel(strategy: 'cost-optimized' | 'quality-first' | 'latency-optimized' | 'balanced'): ModelInfo | null {
    const models = this.getAllModels().filter(m => {
      const provider = this.providers.get(m.provider);
      return provider?.enabled;
    });

    if (models.length === 0) return null;

    switch (strategy) {
      case 'cost-optimized':
        return models.sort((a, b) => 
          (a.inputCostPer1K + a.outputCostPer1K) - (b.inputCostPer1K + b.outputCostPer1K)
        )[0];
      case 'quality-first':
        return models.sort((a, b) => b.quality - a.quality)[0];
      case 'latency-optimized':
        return models.sort((a, b) => b.speed - a.speed)[0];
      case 'balanced':
      default:
        return models.sort((a, b) => 
          (b.quality / (b.inputCostPer1K + b.outputCostPer1K + 0.0001)) - 
          (a.quality / (a.inputCostPer1K + a.outputCostPer1K + 0.0001))
        )[0];
    }
  }

  /**
   * 获取成本排名
   */
  getCostRanking(): ModelInfo[] {
    return this.getAllModels()
      .sort((a, b) => (a.inputCostPer1K + a.outputCostPer1K) - (b.inputCostPer1K + b.outputCostPer1K));
  }

  /**
   * 获取质量排名
   */
  getQualityRanking(): ModelInfo[] {
    return this.getAllModels().sort((a, b) => b.quality - a.quality);
  }

  /**
   * 导出配置
   */
  exportConfig(): { models: ModelInfo[]; providers: ProviderConfig[] } {
    return {
      models: this.getAllModels(),
      providers: this.getEnabledProviders(),
    };
  }

  /**
   * 从配置导入
   */
  importConfig(config: { models?: ModelInfo[]; providers?: ProviderConfig[] }): void {
    if (config.models) {
      config.models.forEach(model => this.register(model));
    }
    if (config.providers) {
      config.providers.forEach(p => {
        if (p.enabled) this.providers.set(p.type, p);
      });
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const modelRegistry = new ModelRegistry();

export default modelRegistry;
