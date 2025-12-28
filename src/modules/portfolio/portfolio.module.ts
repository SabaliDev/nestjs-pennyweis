import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PortfolioController } from './portfolio.controller';
import { PortfolioService } from './portfolio.service';
import { Portfolio } from '../../entities/portfolio.entity';
import { WalletModule } from '../wallet/wallet.module';
import { BinanceModule } from '../binance/binance.module';


@Module({
  imports: [
    TypeOrmModule.forFeature([Portfolio]),
    WalletModule,
    BinanceModule,
  ],
  controllers: [PortfolioController],
  providers: [PortfolioService],
  exports: [PortfolioService],
})
export class PortfolioModule { }