import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { LLM_CONSTANTS } from '../../common/constants';

export interface AnthropicMessageRequest {
  prompt: string;
  model?: string;
  maxTokens?: number;
}

@Injectable()
export class AnthropicClientService {
  private readonly logger = new Logger(AnthropicClientService.name);
  private anthropic: Anthropic | null = null;

  constructor(private configService: ConfigService) {
    this.initializeClient();
  }

  private initializeClient(): void {
    const apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    if (!apiKey || apiKey === 'your-api-key-here') {
      this.logger.warn('ANTHROPIC_API_KEY not configured. LLM features will not work.');
    } else {
      this.anthropic = new Anthropic({ apiKey });
      this.logger.log('Anthropic client initialized successfully');
    }
  }

  isConfigured(): boolean {
    return this.anthropic !== null;
  }

  async sendMessage(request: AnthropicMessageRequest): Promise<string> {
    if (!this.anthropic) {
      throw new Error('Anthropic API not configured');
    }

    try {
      const message = await this.anthropic.messages.create({
        model: request.model || LLM_CONSTANTS.DEFAULT_MODEL,
        max_tokens: request.maxTokens || LLM_CONSTANTS.MAX_TOKENS.DEFAULT,
        messages: [
          {
            role: 'user',
            content: request.prompt,
          },
        ],
      });

      const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
      return responseText;
    } catch (error) {
      this.logger.error('Error sending message to Anthropic API:', error);
      throw error;
    }
  }
}

