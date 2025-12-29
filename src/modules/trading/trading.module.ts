import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TradingController } from './trading.controller';
import { TradingService } from './trading.service';
import { BinanceModule } from '../binance/binance.module';
import { TradingGateway } from './trading.gateway';
import { WalletModule } from '../wallet/wallet.module';
import { OrderService } from './order.service';
import { TradeService } from './trade.service';
import { Order } from '../../entities/order.entity';
import { Trade } from '../../entities/trade.entity';
import { User } from '../../entities/user.entity';
import { TradingEngineService } from './trading-engine.service';

@Module({
  imports: [
    BinanceModule,
    WalletModule,
    TypeOrmModule.forFeature([Order, Trade, User]),
  ],
  controllers: [TradingController],
  providers: [
    TradingService,
    TradingGateway,
    OrderService,
    TradeService,
    TradingEngineService,
  ],
  exports: [TradingService, OrderService, TradeService, TradingEngineService],
})
export class TradingModule { }