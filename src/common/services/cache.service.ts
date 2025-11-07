import { Injectable, Logger } from '@nestjs/common';

/**
 * In-memory cache service for analytics data
 * Provides TTL-based caching and cache invalidation
 */
@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly cache = new Map<string, { data: any; expiresAt: number }>();

  /**
   * Get cached data if it exists and hasn't expired
   * @param key - Cache key
   * @returns Cached data or null if not found/expired
   */
  get<T>(key: string): T | null {
    const cached = this.cache.get(key);
    
    if (!cached) {
      return null;
    }

    if (Date.now() > cached.expiresAt) {
      this.cache.delete(key);
      this.logger.debug(`Cache expired for key: ${key}`);
      return null;
    }

    this.logger.debug(`Cache hit for key: ${key}`);
    return cached.data as T;
  }

  /**
   * Set cached data with TTL
   * @param key - Cache key
   * @param data - Data to cache
   * @param ttlMs - Time to live in milliseconds (default: 5 minutes)
   */
  set(key: string, data: any, ttlMs: number = 5 * 60 * 1000): void {
    const expiresAt = Date.now() + ttlMs;
    this.cache.set(key, { data, expiresAt });
    this.logger.debug(`Cache set for key: ${key}, expires in ${ttlMs}ms`);
  }

  /**
   * Delete specific cache entry
   * @param key - Cache key to delete
   */
  delete(key: string): void {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.logger.debug(`Cache deleted for key: ${key}`);
    }
  }

  /**
   * Clear all cache entries matching a pattern
   * @param pattern - Pattern to match (supports wildcard *)
   */
  clearPattern(pattern: string): void {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    let count = 0;
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }
    
    if (count > 0) {
      this.logger.log(`Cleared ${count} cache entries matching pattern: ${pattern}`);
    }
  }

  /**
   * Clear all analytics cache
   * Called when data changes (processing with AI, upload, delete)
   */
  clearAnalyticsCache(): void {
    this.clearPattern('analytics:*');
    this.logger.log('Analytics cache cleared');
  }

  /**
   * Clear all cache
   */
  clearAll(): void {
    const count = this.cache.size;
    this.cache.clear();
    this.logger.log(`Cleared all cache (${count} entries)`);
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

