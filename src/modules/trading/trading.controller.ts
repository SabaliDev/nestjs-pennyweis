import { Controller, Get, Post, Body, Param, HttpException, HttpStatus } from '@nestjs/common';
import { TradingService } from './trading.service';
import { BinanceService } from '../binance/binance.service';
import { BinanceWsService } from '../binance/binance.ws.service';
import { PAIRS } from './pairs.constant';

@Controller('trade')
export class TradingController {
  constructor(
    private trading: TradingService,
    private binance: BinanceService,
    private binanceWs: BinanceWsService
  ) { }

  @Get('pairs')
  getPairs() {
    return Object.keys(PAIRS);
  }

  @Get('price/:pair')
  async getPrice(@Param('pair') pair: string) {
    const symbol = PAIRS[pair];
    if (!symbol) {
      throw new HttpException('Invalid pair', HttpStatus.BAD_REQUEST);
    }
    return this.binance.getPrice(symbol);
  }

  @Post('market-order')
  async marketOrder(@Body() body: { pair: string; side: 'BUY' | 'SELL'; size: number }) {
    const symbol = PAIRS[body.pair];
    if (!symbol) {
      throw new HttpException('Invalid pair', HttpStatus.BAD_REQUEST);
    }

    // Ensure we are connected to receive real-time data or just fetch once
    // For simulation, we fetch current price
    const priceData = await this.binance.getPrice(symbol);
    const price = parseFloat(priceData.price);

    return this.trading.simulateMarketOrder(symbol, body.side, body.size, price);
  }

  @Get('positions')
  getPositions() {
    return this.trading.getPositions();
  }

  @Post('subscribe/:pair')
  subscribe(@Param('pair') pair: string) {
    const symbol = PAIRS[pair];
    if (!symbol) {
      throw new HttpException('Invalid pair', HttpStatus.BAD_REQUEST);
    }
    this.binanceWs.connect(symbol);
    this.binanceWs.connectDepth(symbol);
    return { message: `Subscribed to ${symbol}` };
  }
}