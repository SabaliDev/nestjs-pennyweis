import { registerAs } from '@nestjs/config';

export interface ServerConfig {
  host: string;
  port: number;
  corsOrigins: string[];
  requestTimeoutSecs: number;
}

export interface ApiConfig {
  rateLimitRequestsPerMinute: number;
  maxPageSize: number;
  defaultPageSize: number;
}

export interface LoggingConfig {
  level: string;
  format: 'json' | 'pretty' | 'compact';
  filePath?: string;
}

export interface FeatureConfig {
  enableCompetitions: boolean;
  enableLeaderboards: boolean;
  enableSocialFeatures: boolean;
  enablePaperTrading: boolean;
  enablePriceAlerts: boolean;
  enableWebhooks: boolean;
}

export interface CoinGeckoConfig {
  apiKey?: string;
  usePro: boolean;
  baseUrl: string;
  proBaseUrl: string;
  websocketUrl: string;
  rateLimitPerMinute: number;
  timeoutSecs: number;
  retryAttempts: number;
  retryDelayMs: number;
}

export interface BinanceConfig {
  apiBaseUrl: string;
  wsBaseUrl: string;
}

export interface JwtConfig {
  secret: string;
  accessTokenExpiryHours: number;
  refreshTokenExpiryDays: number;
  issuer: string;
  audience: string;
}

export interface AppConfiguration {
  server: ServerConfig;
  api: ApiConfig;
  logging: LoggingConfig;
  features: FeatureConfig;
  coingecko: CoinGeckoConfig;
  jwt: JwtConfig;
  binance: BinanceConfig;
}

export const AppConfig = registerAs('app', (): AppConfiguration => ({
  server: {
    host: (() => {
      const host = process.env.SERVER_HOST || (process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1');
      console.log(`🌐 Server: Host configured as ${host}`);
      return host;
    })(),
    port: (() => {
      const port = parseInt(process.env.PORT || process.env.SERVER_PORT || '3000', 10);
      console.log(`🌐 Server: Port configured as ${port}`);
      return port;
    })(),
    corsOrigins: process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(',')
      : ['http://localhost:3000'],
    requestTimeoutSecs: parseInt(process.env.REQUEST_TIMEOUT_SECS || '30', 10),
  },
  api: {
    rateLimitRequestsPerMinute: parseInt(process.env.RATE_LIMIT_PER_MINUTE || '1000', 10),
    maxPageSize: parseInt(process.env.MAX_PAGE_SIZE || '1000', 10),
    defaultPageSize: parseInt(process.env.DEFAULT_PAGE_SIZE || '50', 10),
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: (process.env.LOG_FORMAT as 'json' | 'pretty' | 'compact') || 'pretty',
    filePath: process.env.LOG_FILE_PATH,
  },
  features: {
    enableCompetitions: process.env.ENABLE_COMPETITIONS === 'true',
    enableLeaderboards: process.env.ENABLE_LEADERBOARDS === 'true',
    enableSocialFeatures: process.env.ENABLE_SOCIAL_FEATURES === 'true',
    enablePaperTrading: process.env.ENABLE_PAPER_TRADING !== 'false',
    enablePriceAlerts: process.env.ENABLE_PRICE_ALERTS === 'true',
    enableWebhooks: process.env.ENABLE_WEBHOOKS === 'true',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
    accessTokenExpiryHours: parseInt(process.env.JWT_ACCESS_TOKEN_EXPIRY_HOURS || '1', 10),
    refreshTokenExpiryDays: parseInt(process.env.JWT_REFRESH_TOKEN_EXPIRY_DAYS || '7', 10),
    issuer: process.env.JWT_ISSUER || 'paper-trading-platform',
    audience: process.env.JWT_AUDIENCE || 'paper-trading-users',
  },
  coingecko: {
    apiKey: process.env.COINGECKO_API_KEY,
    usePro: process.env.COINGECKO_USE_PRO === 'true',
    baseUrl: process.env.COINGECKO_BASE_URL || 'https://api.coingecko.com/api/v3',
    proBaseUrl: process.env.COINGECKO_PRO_BASE_URL || 'https://pro-api.coingecko.com/api/v3',
    websocketUrl: process.env.COINGECKO_WS_URL || 'wss://stream.coingecko.com/v1',
    rateLimitPerMinute: parseInt(
      process.env.COINGECKO_RATE_LIMIT ||
      (process.env.COINGECKO_USE_PRO === 'true' ? '500' : '30'),
      10
    ),
    timeoutSecs: parseInt(process.env.COINGECKO_TIMEOUT_SECS || '10', 10),
    retryAttempts: parseInt(process.env.COINGECKO_RETRY_ATTEMPTS || '3', 10),
    retryDelayMs: parseInt(process.env.COINGECKO_RETRY_DELAY_MS || '1000', 10),
  },
  binance: {
    apiBaseUrl: process.env.BINANCE_API_BASE_URL || 'https://api.binance.com/api/v3',
    wsBaseUrl: process.env.BINANCE_WS_BASE_URL || 'wss://stream.binance.com:9443/ws',
  },
}));