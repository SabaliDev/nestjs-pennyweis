import { Module } from '@nestjs/common';
import { TradingController } from './trading.controller';
import { TradingService } from './trading.service';
import { BinanceModule } from '../binance/binance.module';
import { TradingGateway } from './trading.gateway';

@Module({
  imports: [BinanceModule],
  controllers: [TradingController],
  providers: [TradingService, TradingGateway],
})
export class TradingModule { }