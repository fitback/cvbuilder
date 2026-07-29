import { Injectable, Inject } from "@nestjs/common";
import Redis from "ioredis";

export const REDIS_CLIENT = "REDIS_CLIENT";

@Injectable()
export class CacheService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async getOrSet<T>(key: string, ttlSeconds: number, factory: () => Promise<T>): Promise<T> {
    try {
      const cached = await this.redis.get(key);
      if (cached) {
        try { return JSON.parse(cached); } catch { /* corrupt cache, fall through */ }
      }
    } catch { /* Redis unavailable, fall through to factory */ }
    const data = await factory();
    try { await this.redis.setex(key, ttlSeconds, JSON.stringify(data)); } catch { /* best-effort */ }
    return data;
  }

  async del(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length) await this.redis.del(keys);
    } catch {
      // Cache layer failure is non-critical — stale cache is better than broken business logic
    }
  }
}
