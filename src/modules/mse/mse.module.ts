import { Module } from '@nestjs/common';
import { MSEService } from './mse.service';
import { MSETradingService } from './mse-trading.service';
import { MSEEngineService } from './mse-engine.service';
import { MSEController } from './mse.controller';
import { TradingModule } from '../trading/trading.module';
import { WalletModule } from '../wallet/wallet.module';

@Module({
    imports: [
        TradingModule,
        WalletModule,
    ],
    controllers: [MSEController],
    providers: [
        MSEService,
        MSETradingService,
        MSEEngineService,
    ],
    exports: [MSEService],
})
export class MSEModule { }
