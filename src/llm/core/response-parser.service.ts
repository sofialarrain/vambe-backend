import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ResponseParserService {
  private readonly logger = new Logger(ResponseParserService.name);

  parseJsonResponse<T>(response: string, fallback: T): T {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        this.logger.warn('No JSON found in response, using fallback');
        return fallback;
      }

      const parsed = JSON.parse(jsonMatch[0]);
      return parsed as T;
    } catch (error) {
      this.logger.error('Error parsing JSON response:', error);
      return fallback;
    }
  }

  parseArrayResponse<T>(response: string, fallback: T[]): T[] {
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        const lines = response.split('\n').filter(line => 
          line.trim().startsWith('-') || line.trim().startsWith('•')
        );
        if (lines.length > 0) {
          return lines.map(line => 
            line.replace(/^[-•]\s*/, '').trim() as T
          );
        }
        this.logger.warn('No array found in response, using fallback');
        return fallback;
      }

      const parsed = JSON.parse(jsonMatch[0]);
      return Array.isArray(parsed) ? parsed : fallback;
    } catch (error) {
      this.logger.error('Error parsing array response:', error);
      return fallback;
    }
  }

  extractValue<T>(response: string, pattern: RegExp, fallback: T): T {
    try {
      const match = response.match(pattern);
      if (!match || !match[1]) {
        return fallback;
      }
      return match[1].trim() as T;
    } catch (error) {
      this.logger.error('Error extracting value from response:', error);
      return fallback;
    }
  }
}

