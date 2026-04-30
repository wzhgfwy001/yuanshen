/**
 * Multi-Model API Client
 * 
 * 统一的多模型AI API调用客户端，支持多种Provider的接入和管理。
 * 
 * @version 1.0.0
 * @module api
 */

import EventEmitter from 'events';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

// ============================================================================
// Type Definitions
// ============================================================================

export type ProviderType = 'openai' | 'anthropic' | 'azure' | 'google' | 'local';
export type ModelSelectionStrategy = 'cost-optimized' | 'latency-optimized' | 'quality-first' | 'balanced';

export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;
}

export interface Tool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, any>;
  };
}

export interface ToolCall {
  id: string;
  name: string;
  args: any;
  result?: any;
}

export interface APIRequest {
  model: string;
  messages: Message[];
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stream?: boolean;
  tools?: Tool[];
  toolChoice?: 'auto' | 'none' | { type: 'function'; function: { name: string } };
  timeout?: number;
  strategy?: ModelSelectionStrategy;
  minQuality?: string;
}

export interface APIResponse {
  id: string;
  model: string;
  content: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  finishReason: 'stop' | 'length' | 'tool_calls' | 'error';
  toolCalls?: ToolCall[];
  raw?: any;
}

export interface EmbeddingRequest {
  text: string | string[];
  model?: string;
  provider?: ProviderType;
}

export interface EmbeddingResponse {
  vector: number[];
  model: string;
  provider: ProviderType;
}

export interface ImageRequest {
  prompt: string;
  model?: string;
  size?: '256x256' | '512x512' | '1024x1024';
  quality?: 'standard' | 'hd';
  style?: 'vivid' | 'natural';
}

export interface ImageResponse {
  url?: string;
  base64?: string;
  revisedPrompt?: string;
}

export interface ModelInfo {
  id: string;
  name: string;
  provider: ProviderType;
  contextWindow: number;
  inputCostPer1K: number;
  outputCostPer1K: number;
  capabilities: string[];
  quality: number;  // 0-1
  speed: number;    // 0-1
}

export interface CostRecord {
  requestId: string;
  model: string;
  provider: ProviderType;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  timestamp: number;
  duration: number;
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeout: number;
  halfOpenRequests: number;
}

// ============================================================================
// Provider Adapters
// ============================================================================

abstract class ProviderAdapter {
  abstract type: ProviderType;
  protected config: any;

  constructor(config: any) {
    this.config = config;
  }

  abstract chat(request: APIRequest): Promise<APIResponse>;
  abstract embed(text: string, model?: string): Promise<number[]>;
  abstract getModelInfo(model: string): ModelInfo | null;
  abstract isAvailable(): boolean;
}

class OpenAIAdapter extends ProviderAdapter {
  type: ProviderType = 'openai';
  private client: OpenAI;

  constructor(config: any) {
    super(config);
    this.client = new OpenAI({
      apiKey: config.apiKey,
      organization: config.organization,
      baseURL: config.baseURL,
    });
  }

  async chat(request: APIRequest): Promise<APIResponse> {
    const startTime = Date.now();
    try {
      const params: any = {
        model: request.model,
        messages: request.messages.map(m => ({ role: m.role, content: m.content })),
        temperature: request.temperature,
        max_tokens: request.maxTokens,
        top_p: request.topP,
        stream: request.stream,
        tools: request.tools?.map(t => ({
          type: 'function',
          function: t.function,
        })),
        tool_choice: request.toolChoice,
      };

      if (request.stream) {
        const stream = await this.client.chat.completions.create(params);
        let fullContent = '';
        let toolCalls: ToolCall[] = [];

        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta;
          if (delta?.content) fullContent += delta.content;
          if (delta?.tool_calls) {
            for (const tc of delta.tool_calls) {
              if (tc.id) {
                toolCalls.push({
                  id: tc.id,
                  name: tc.function?.name || '',
                  args: tc.function?.arguments || '',
                });
              }
            }
          }
        }

        return {
          id: `openai-${Date.now()}`,
          model: request.model,
          content: fullContent,
          usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
          finishReason: 'stop',
          toolCalls,
        };
      }

      const response = await this.client.chat.completions.create(params);
      const choice = response.choices[0];
      const msg = choice.message;

      return {
        id: response.id,
        model: response.model,
        content: msg.content || '',
        usage: {
          inputTokens: response.usage?.prompt_tokens || 0,
          outputTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0,
        },
        finishReason: choice.finish_reason || 'stop',
        raw: response,
      };
    } finally {
      CostTracker.track(this.type, request.model, 0, 0, Date.now() - startTime);
    }
  }

  async embed(text: string | string[], model: string = 'text-embedding-3-small'): Promise<number[]> {
    const response = await this.client.embeddings.create({
      model,
      input: text,
    });
    return response.data[0].embedding;
  }

  getModelInfo(model: string): ModelInfo | null {
    const models: Record<string, ModelInfo> = {
      'gpt-4-turbo-preview': {
        id: 'gpt-4-turbo-preview',
        name: 'GPT-4 Turbo',
        provider: 'openai',
        contextWindow: 128000,
        inputCostPer1K: 0.01,
        outputCostPer1K: 0.03,
        capabilities: ['chat', 'vision', 'function-calling', 'json-mode'],
        quality: 0.95,
        speed: 0.6,
      },
      'gpt-4': {
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
      'gpt-3.5-turbo': {
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        provider: 'openai',
        contextWindow: 16385,
        inputCostPer1K: 0.0005,
        outputCostPer1K: 0.0015,
        capabilities: ['chat', 'function-calling'],
        quality: 0.8,
        speed: 0.9,
      },
    };
    return models[model] || null;
  }

  isAvailable(): boolean {
    return !!this.config.apiKey;
  }
}

class AnthropicAdapter extends ProviderAdapter {
  type: ProviderType = 'anthropic';
  private client: Anthropic;

  constructor(config: any) {
    super(config);
    this.client = new Anthropic({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
    });
  }

  async chat(request: APIRequest): Promise<APIResponse> {
    const startTime = Date.now();
    try {
      const systemMessage = request.messages.find(m => m.role === 'system');
      const conversationMessages = request.messages.filter(m => m.role !== 'system');

      const params: any = {
        model: request.model,
        messages: conversationMessages.map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
        temperature: request.temperature,
        max_tokens: request.maxTokens || 4096,
        system: systemMessage?.content,
      };

      if (request.stream) {
        const stream = await this.client.messages.stream(params);
        let fullContent = '';

        for await (const chunk of stream) {
          if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
            fullContent += chunk.delta.text;
          }
        }

        return {
          id: `anthropic-${Date.now()}`,
          model: request.model,
          content: fullContent,
          usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
          finishReason: 'stop',
        };
      }

      const response = await this.client.messages.create(params);
      const content = response.content[0];
      const text = content.type === 'text' ? content.text : '';

      return {
        id: response.id,
        model: response.model,
        content: text,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
          totalTokens: response.usage.input_tokens + response.usage.output_tokens,
        },
        finishReason: response.stop_reason === 'end_turn' ? 'stop' : 'length',
        raw: response,
      };
    } finally {
      CostTracker.track(this.type, request.model, 0, 0, Date.now() - startTime);
    }
  }

  async embed(text: string | string[], model: string = 'claude-embedding-v1'): Promise<number[]> {
    const texts = Array.isArray(text) ? text : [text];
    const response = await this.client.beta.promptCaching.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [{ role: 'user', content: texts.join('\n') }],
    });
    return [];
  }

  getModelInfo(model: string): ModelInfo | null {
    const models: Record<string, ModelInfo> = {
      'claude-3-opus-20240229': {
        id: 'claude-3-opus-20240229',
        name: 'Claude 3 Opus',
        provider: 'anthropic',
        contextWindow: 200000,
        inputCostPer1K: 0.015,
        outputCostPer1K: 0.075,
        capabilities: ['chat', 'vision', 'function-calling', 'long-context'],
        quality: 0.98,
        speed: 0.4,
      },
      'claude-3-sonnet-20240229': {
        id: 'claude-3-sonnet-20240229',
        name: 'Claude 3 Sonnet',
        provider: 'anthropic',
        contextWindow: 200000,
        inputCostPer1K: 0.003,
        outputCostPer1K: 0.015,
        capabilities: ['chat', 'vision', 'function-calling', 'long-context'],
        quality: 0.9,
        speed: 0.7,
      },
      'claude-3-haiku-20240307': {
        id: 'claude-3-haiku-20240307',
        name: 'Claude 3 Haiku',
        provider: 'anthropic',
        contextWindow: 200000,
        inputCostPer1K: 0.00025,
        outputCostPer1K: 0.00125,
        capabilities: ['chat', 'vision', 'fast'],
        quality: 0.75,
        speed: 0.95,
      },
    };
    return models[model] || null;
  }

  isAvailable(): boolean {
    return !!this.config.apiKey;
  }
}

// ============================================================================
// Cost Tracker
// ============================================================================

class CostTracker {
  private static records: CostRecord[] = [];

  static track(
    provider: ProviderType,
    model: string,
    inputTokens: number,
    outputTokens: number,
    duration: number
  ): CostRecord {
    const cost = this.calculateCost(provider, model, inputTokens, outputTokens);
    const record: CostRecord = {
      requestId: `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      model,
      provider,
      inputTokens,
      outputTokens,
      cost,
      timestamp: Date.now(),
      duration,
    };
    this.records.push(record);
    return record;
  }

  private static calculateCost(
    provider: ProviderType,
    model: string,
    inputTokens: number,
    outputTokens: number
  ): number {
    const rates: Record<string, { input: number; output: number }> = {
      'openai:gpt-4': { input: 0.03, output: 0.06 },
      'openai:gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
      'anthropic:claude-3-opus': { input: 0.015, output: 0.075 },
      'anthropic:claude-3-sonnet': { input: 0.003, output: 0.015 },
      'anthropic:claude-3-haiku': { input: 0.00025, output: 0.00125 },
    };
    const rate = rates[`${provider}:${model}`] || { input: 0.01, output: 0.03 };
    return (inputTokens / 1000) * rate.input + (outputTokens / 1000) * rate.output;
  }

  static getTotalCost(startDate?: number, endDate?: number): number {
    return this.records
      .filter(r => (!startDate || r.timestamp >= startDate) && (!endDate || r.timestamp <= endDate))
      .reduce((sum, r) => sum + r.cost, 0);
  }

  static getRecords(limit: number = 100): CostRecord[] {
    return this.records.slice(-limit);
  }
}

// ============================================================================
// Circuit Breaker
// ============================================================================

class CircuitBreaker extends EventEmitter {
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private failureCount: number = 0;
  private lastFailureTime: number = 0;
  private halfOpenSuccess: number = 0;

  constructor(private config: CircuitBreakerConfig) {
    super();
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime >= this.config.recoveryTimeout) {
        this.state = 'half-open';
        this.halfOpenSuccess = 0;
        this.emit('state-change', { state: 'half-open' });
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    if (this.state === 'half-open') {
      this.halfOpenSuccess++;
      if (this.halfOpenSuccess >= this.config.halfOpenRequests) {
        this.reset();
      }
    } else {
      this.failureCount = 0;
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === 'half-open' || this.failureCount >= this.config.failureThreshold) {
      this.state = 'open';
      this.emit('state-change', { state: 'open' });
      this.emit('circuit:opened');
    }
  }

  private reset(): void {
    this.state = 'closed';
    this.failureCount = 0;
    this.emit('state-change', { state: 'closed' });
    this.emit('circuit:closed');
  }

  getState(): string {
    return this.state;
  }
}

// ============================================================================
// API Client
// ============================================================================

export class APIClient extends EventEmitter {
  private adapters: Map<ProviderType, ProviderAdapter> = new Map();
  private circuitBreakers: Map<ProviderType, CircuitBreaker> = new Map();
  private costTracker = CostTracker;

  constructor(
    private modelRegistry: Map<string, ModelInfo>,
    config?: { circuitBreaker?: CircuitBreakerConfig; providers?: Record<ProviderType, any> }
  ) {
    super();

    // Initialize providers
    if (config?.providers?.openai) {
      this.registerProvider(new OpenAIAdapter(config.providers.openai));
    }
    if (config?.providers?.anthropic) {
      this.registerProvider(new AnthropicAdapter(config.providers.anthropic));
    }

    // Initialize circuit breakers
    const cbConfig = config?.circuitBreaker || {
      failureThreshold: 5,
      recoveryTimeout: 60000,
      halfOpenRequests: 3,
    };

    this.adapters.forEach((_, type) => {
      this.circuitBreakers.set(type, new CircuitBreaker(cbConfig));
    });
  }

  registerProvider(adapter: ProviderAdapter): void {
    this.adapters.set(adapter.type, adapter);
  }

  async chat(request: APIRequest): Promise<APIResponse> {
    const provider = this.detectProvider(request.model);
    const adapter = this.adapters.get(provider);

    if (!adapter) {
      throw new Error(`Provider not found for model: ${request.model}`);
    }

    const breaker = this.circuitBreakers.get(provider);
    if (breaker) {
      return breaker.execute(() => this.executeChat(adapter, request));
    }

    return this.executeChat(adapter, request);
  }

  private async executeChat(adapter: ProviderAdapter, request: APIRequest): Promise<APIResponse> {
    this.emit('api:request', { model: request.model, messageCount: request.messages.length });

    try {
      const response = await adapter.chat(request);
      this.emit('api:response', { model: request.model, success: true });
      return response;
    } catch (error: any) {
      this.emit('api:error', { model: request.model, error: error.message });
      throw error;
    }
  }

  async embed(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    const provider = request.provider || 'openai';
    const adapter = this.adapters.get(provider);

    if (!adapter) {
      throw new Error(`Provider not found: ${provider}`);
    }

    const vector = await adapter.embed(request.text, request.model);
    return { vector, model: request.model || 'default', provider };
  }

  async image(request: ImageRequest): Promise<ImageResponse> {
    // Simplified - would need DALL-E adapter
    throw new Error('Image generation not implemented');
  }

  private detectProvider(model: string): ProviderType {
    if (model.startsWith('gpt-') || model.startsWith('dall-e')) return 'openai';
    if (model.startsWith('claude-')) return 'anthropic';
    if (model.startsWith('gemini')) return 'google';
    return 'openai';
  }

  selectModel(strategy: ModelSelectionStrategy, requirement?: { minQuality?: number; maxCost?: number }): string {
    const models = Array.from(this.modelRegistry.values());

    switch (strategy) {
      case 'cost-optimized':
        return models.sort((a, b) => a.inputCostPer1K + a.outputCostPer1K - (b.inputCostPer1K + b.outputCostPer1K))[0].id;
      case 'quality-first':
        return models.sort((a, b) => b.quality - a.quality)[0].id;
      case 'latency-optimized':
        return models.sort((a, b) => b.speed - a.speed)[0].id;
      case 'balanced':
      default:
        return models.sort((a, b) => (b.quality / (b.inputCostPer1K + b.outputCostPer1K)) - (a.quality / (a.inputCostPer1K + a.outputCostPer1K)))[0].id;
    }
  }

  getCostSummary(options?: { startDate?: number; endDate?: number; groupBy?: string }): any {
    return {
      totalCost: CostTracker.getTotalCost(options?.startDate, options?.endDate),
      records: CostTracker.getRecords(100),
    };
  }

  getStatus(): Record<ProviderType | 'circuit_breakers', any> {
    const status: any = {};
    this.adapters.forEach((adapter, type) => {
      status[type] = { available: adapter.isAvailable() };
    });
    status.circuit_breakers = {};
    this.circuitBreakers.forEach((breaker, type) => {
      status.circuit_breakers[type] = breaker.getState();
    });
    return status;
  }
}

export default APIClient;
