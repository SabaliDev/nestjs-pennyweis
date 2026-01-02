import { registerAs } from '@nestjs/config';
import { CacheModuleOptions } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-store';

export interface RedisConfiguration extends CacheModuleOptions {
  url: string;
  poolSize: number;
  connectionTimeoutSecs: number;
  commandTimeoutSecs: number;
}

export const RedisConfig = registerAs('redis', (): RedisConfiguration => {
  const url = process.env.REDIS_URL || 'redis://localhost:6379';
  const isSsl = url.startsWith('rediss://');

  return {
    store: redisStore,
    url,
    poolSize: parseInt(process.env.REDIS_POOL_SIZE || '10', 10),
    connectionTimeoutSecs: parseInt(process.env.REDIS_CONNECTION_TIMEOUT_SECS || '5', 10),
    commandTimeoutSecs: parseInt(process.env.REDIS_COMMAND_TIMEOUT_SECS || '3', 10),
    ttl: parseInt(process.env.CACHE_TTL || '300', 10), // 5 minutes default
    max: parseInt(process.env.CACHE_MAX_ITEMS || '1000', 10),
  } as RedisConfiguration;
});