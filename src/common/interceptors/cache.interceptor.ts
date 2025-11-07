import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { CacheService } from '../services/cache.service';

/**
 * Decorator to mark endpoints as cacheable
 * @param ttlMs - Time to live in milliseconds (default: 5 minutes)
 */
export const Cacheable = (ttlMs: number = 5 * 60 * 1000) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata('cacheable', true, descriptor.value);
    Reflect.defineMetadata('cacheTTL', ttlMs, descriptor.value);
  };
};

/**
 * Cache interceptor for GET requests
 * Automatically caches responses and serves from cache when available
 */
@Injectable()
export class CacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CacheInterceptor.name);

  constructor(private readonly cacheService: CacheService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    if (request.method !== 'GET' || !request.path.startsWith('/api/analytics')) {
      return next.handle();
    }

    const cacheKey = this.generateCacheKey(request);
    const cachedData = this.cacheService.get(cacheKey);

    if (cachedData) {
      response.setHeader('X-Cache', 'HIT');
      response.setHeader('Cache-Control', 'public, max-age=300');
      this.logger.debug(`Serving from cache: ${cacheKey}`);
      return of(cachedData);
    }

    response.setHeader('X-Cache', 'MISS');
    response.setHeader('Cache-Control', 'public, max-age=300');

    return next.handle().pipe(
      tap((data) => {
        this.cacheService.set(cacheKey, data, 5 * 60 * 1000);
        this.logger.debug(`Cached response for: ${cacheKey}`);
      }),
    );
  }

  /**
   * Generate cache key from request
   * @private
   */
  private generateCacheKey(request: Request): string {
    const path = request.path.replace('/api', '');
    const query = new URLSearchParams(request.query as any).toString();
    const key = query ? `${path}?${query}` : path;
    return `analytics:${key}`;
  }
}

