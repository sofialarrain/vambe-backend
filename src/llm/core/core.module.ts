import { Module } from '@nestjs/common';
import { AnthropicClientService } from './anthropic-client.service';
import { ResponseParserService } from './response-parser.service';

@Module({
  providers: [AnthropicClientService, ResponseParserService],
  exports: [AnthropicClientService, ResponseParserService],
})
export class CoreModule {}

