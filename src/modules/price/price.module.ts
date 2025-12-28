import { Module } from '@nestjs/common';
import { PriceController } from './price.controller';
import { PriceService } from './price.service';
import { CoinGeckoService } from './coingecko.service';
import { CoinGeckoWebsocketService } from './coingeckoPriceStream.service';
import { PriceGateway } from './price.gateway';


@Module({
  controllers: [PriceController],
  providers: [PriceService, CoinGeckoService, CoinGeckoWebsocketService, PriceGateway],
  exports: [PriceService],
})
export class PriceModule { }