import Anthropic from '@anthropic-ai/sdk';
import { createLogger } from '../utils/logger';

const logger = createLogger('anthropic');

// Initialize Anthropic client
let anthropicClient: Anthropic | null = null;

/**
 * Get or initialize the Anthropic client
 */
export const getAnthropicClient = (): Anthropic | null => {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;

  if (!apiKey) {
    logger.warn('Anthropic API key not found. Set VITE_ANTHROPIC_API_KEY in your .env file.');
    return null;
  }

  if (!anthropicClient) {
    anthropicClient = new Anthropic({
      apiKey: apiKey,
    });
  }

  return anthropicClient;
};

/**
 * Check if Anthropic API is configured
 */
export const isAnthropicConfigured = (): boolean => {
  return !!import.meta.env.VITE_ANTHROPIC_API_KEY;
};

/**
 * Anthropic API Service
 * Provides methods to interact with Claude models
 */
export class AnthropicService {
  private client: Anthropic | null;

  constructor() {
    this.client = getAnthropicClient();
  }

  /**
   * Send a message to Claude and get a response
   * @param message - The user's message
   * @param model - The model to use (default: 'claude-3-5-sonnet-20241022')
   * @param systemPrompt - Optional system prompt
   * @param maxTokens - Maximum tokens in response (default: 1024)
   */
  async sendMessage(
    message: string,
    options: {
      model?: string;
      systemPrompt?: string;
      maxTokens?: number;
      temperature?: number;
    } = {}
  ): Promise<string> {
    if (!this.client) {
      throw new Error('Anthropic API key not configured. Please set VITE_ANTHROPIC_API_KEY in your .env file.');
    }

    const {
      model = 'claude-3-5-sonnet-20241022',
      systemPrompt,
      maxTokens = 1024,
      temperature = 0.7,
    } = options;

    try {
      const response = await this.client.messages.create({
        model,
        max_tokens: maxTokens,
        temperature,
        ...(systemPrompt && { system: systemPrompt }),
        messages: [
          {
            role: 'user',
            content: message,
          },
        ],
      });

      // Extract text content from response
      const textContent = response.content.find(
        (block): block is Anthropic.MessageParam.TextBlock => block.type === 'text'
      );

      if (!textContent) {
        throw new Error('No text content in response');
      }

      return textContent.text;
    } catch (error) {
      logger.error('Error calling Anthropic API:', error);
      throw error;
    }
  }

  /**
   * Send a conversation with multiple messages
   * @param messages - Array of message objects with role and content
   * @param options - Model and other options
   */
  async sendConversation(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    options: {
      model?: string;
      systemPrompt?: string;
      maxTokens?: number;
      temperature?: number;
    } = {}
  ): Promise<string> {
    if (!this.client) {
      throw new Error('Anthropic API key not configured. Please set VITE_ANTHROPIC_API_KEY in your .env file.');
    }

    const {
      model = 'claude-3-5-sonnet-20241022',
      systemPrompt,
      maxTokens = 1024,
      temperature = 0.7,
    } = options;

    try {
      const response = await this.client.messages.create({
        model,
        max_tokens: maxTokens,
        temperature,
        ...(systemPrompt && { system: systemPrompt }),
        messages: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })) as Anthropic.MessageParam[],
      });

      const textContent = response.content.find(
        (block): block is Anthropic.MessageParam.TextBlock => block.type === 'text'
      );

      if (!textContent) {
        throw new Error('No text content in response');
      }

      return textContent.text;
    } catch (error) {
      logger.error('Error calling Anthropic API:', error);
      throw error;
    }
  }

  /**
   * Get available models
   */
  getAvailableModels(): string[] {
    return [
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022',
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307',
    ];
  }
}

// Export singleton instance
export const anthropicService = new AnthropicService();

