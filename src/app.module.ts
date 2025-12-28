import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';

import { DatabaseConfig } from './config/database.config';
import { AppConfig } from './config/app.config';
import { RedisConfig } from './config/redis.config';

import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { TradingModule } from './modules/trading/trading.module';
import { BinanceModule } from './modules/binance/binance.module';
import { StocksModule } from './modules/stocks/stocks.module';
import { PortfolioModule } from './modules/portfolio/portfolio.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [AppConfig, DatabaseConfig, RedisConfig],
      envFilePath: ['.env.local', '.env'],
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => configService.get('database'),
      inject: [ConfigService],
    }),

    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => configService.get('redis'),
      inject: [ConfigService],
    }),

    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),

    ScheduleModule.forRoot(),

    // Feature modules
    HealthModule,
    AuthModule,
    UsersModule,
    WalletModule,
    TradingModule,
    BinanceModule,
    StocksModule,
    PortfolioModule,
  ],
})
export class AppModule { }