import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PolymarketService } from './polymarket.service';
import { PolymarketController } from './polymarket.controller';
import { PredictionTradingService } from './prediction-trading.service';
import { PredictionTradingController } from './prediction-trading.controller';
import { PredictionOrder } from '../../entities/prediction-order.entity';
import { WalletModule } from '../wallet/wallet.module';

@Module({
    imports: [
        HttpModule,
        TypeOrmModule.forFeature([PredictionOrder]),
        WalletModule,
    ],
    controllers: [PolymarketController, PredictionTradingController],
    providers: [PolymarketService, PredictionTradingService],
    exports: [PolymarketService, PredictionTradingService],
})
export class PolymarketModule { }
