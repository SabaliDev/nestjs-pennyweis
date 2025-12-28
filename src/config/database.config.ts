import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { User, UserProfile } from '../entities/user.entity';
import { Wallet } from '../entities/wallet.entity';
import { Order } from '../entities/order.entity';
import { Trade } from '../entities/trade.entity';
import { Asset } from '../entities/asset.entity';
import { Portfolio } from '../entities/portfolio.entity';
import { Competition } from '../entities/competition.entity';
import { Notification } from '../entities/notification.entity';
import { TradingPair } from '../entities/trading-pair.entity';
import { WalletTransaction } from '../entities/wallet-transaction.entity';
import { ApiKey } from '../entities/api-key.entity';
import { UserSession } from '../entities/user-session.entity';
import { OAuthProvider } from '../entities/oauth-provider.entity';

export type DatabaseConfiguration = TypeOrmModuleOptions & {
  maxConnections: number;
  acquireTimeoutSecs: number;
  idleTimeoutSecs: number;
  maxLifetimeSecs: number;
}

export const DatabaseConfig = registerAs('database', (): DatabaseConfiguration => {
  const url = process.env.DATABASE_URL;
  let config: Partial<DatabaseConfiguration> = {};

  if (url) {
    const urlObj = new URL(url);
    config = {
      host: urlObj.hostname,
      port: parseInt(urlObj.port || '5432', 10),
      username: urlObj.username,
      password: urlObj.password,
      database: urlObj.pathname.slice(1),
    };
  } else {
    config = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_DATABASE || 'pennyweis_db',
    };
  }

  return {
    type: 'postgres',
    ...config,
    entities: [
      User,
      UserProfile,
      Wallet,
      WalletTransaction,
      Order,
      Trade,
      Asset,
      TradingPair,
      Portfolio,
      Competition,
      Notification,
      ApiKey,
      UserSession,
      OAuthProvider,
    ],
    synchronize: false,
    logging: false,
    migrationsRun: false,
    migrationsTableName: '_sqlx_migrations',
    ssl: false,
    extra: {
      connectionLimit: parseInt(process.env.DB_MAX_CONNECTIONS || '10', 10),
    },
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '100', 10),
    acquireTimeoutSecs: parseInt(process.env.DB_ACQUIRE_TIMEOUT_SECS || '30', 10),
    idleTimeoutSecs: parseInt(process.env.DB_IDLE_TIMEOUT_SECS || '600', 10),
    maxLifetimeSecs: parseInt(process.env.DB_MAX_LIFETIME_SECS || '1800', 10),
  } as DatabaseConfiguration;
});