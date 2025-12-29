import { Controller, Get, Post, Body, Param, Query, HttpException, HttpStatus, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TradingService } from './trading.service';
import { BinanceService } from '../binance/binance.service';
import { BinanceWsService } from '../binance/binance.ws.service';
import { PAIRS } from './pairs.constant';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { CreateMarketOrderDto } from './dto/create-market-order.dto';
import { TradingGateway } from './trading.gateway';
import { TradingEngineService } from './trading-engine.service';
import { WalletService } from '../wallet/wallet.service';
import { OrderSide, OrderType } from '../../entities/order.entity';
import { TransactionType } from '../../entities/wallet-transaction.entity';
import { User, UserStatus } from '../../entities/user.entity';

@ApiTags('Trading')
@Controller('trade')
export class TradingController {
  constructor(
    private trading: TradingService,
    private binance: BinanceService,
    private binanceWs: BinanceWsService,
    private engine: TradingEngineService,
    private walletService: WalletService,
    @InjectRepository(User)
    private userRepo: Repository<User>
  ) { }

  @Get('pairs')
  @ApiOperation({ summary: 'Get supported trading pairs' })
  getPairs() {
    return Object.keys(PAIRS);
  }

  @Get('price/:pair')
  @ApiOperation({ summary: 'Get current price for a pair' })
  @ApiParam({ name: 'pair', example: 'BTC/USDT' })
  async getPrice(@Param('pair') pair: string) {
    const symbol = PAIRS[pair];
    if (!symbol) {
      throw new HttpException('Invalid pair', HttpStatus.BAD_REQUEST);
    }
    return this.binance.getPrice(symbol);
  }

  @Get('candles/:pair')
  @ApiOperation({ summary: 'Get historical candlestick data' })
  @ApiParam({ name: 'pair', example: 'BTC/USDT' })
  @ApiQuery({ name: 'interval', required: false, example: '1m', description: 'Candle interval (1m, 5m, 1h, 1d)' })
  @ApiQuery({ name: 'limit', required: false, example: 500, description: 'Number of candles' })
  async getCandles(
    @Param('pair') pair: string,
    @Query('interval') interval?: string,
    @Query('limit') limit?: number,
  ) {
    const symbol = PAIRS[pair];
    if (!symbol) {
      throw new HttpException('Invalid pair', HttpStatus.BAD_REQUEST);
    }

    // Validate interval - default to '1m' if invalid or undefined
    const validIntervals = ['1s', '1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '8h', '12h', '1d', '3d', '1w', '1M'];
    const safeInterval = (interval && validIntervals.includes(interval)) ? interval : '1m';
    const safeLimit = (limit && limit > 0 && limit <= 1000) ? +limit : 500;

    return this.binance.getCandles(symbol, safeInterval, safeLimit);
  }

  @Get('depth/:pair')
  @ApiOperation({ summary: 'Get order book depth' })
  @ApiParam({ name: 'pair', example: 'BTC/USDT' })
  @ApiQuery({ name: 'limit', required: false, example: 100, description: 'Depth limit (default 20, max 5000)' })
  async getDepth(
    @Param('pair') pair: string,
    @Query('limit') limit = 100,
  ) {
    const symbol = PAIRS[pair];
    if (!symbol) {
      throw new HttpException('Invalid pair', HttpStatus.BAD_REQUEST);
    }
    return this.binance.getDepth(symbol, +limit);
  }

  @Post('market-order')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Execute a persistent market order' })
  @ApiBody({ type: CreateMarketOrderDto })
  async marketOrder(@Request() req, @Body() body: CreateMarketOrderDto) {
    const symbol = PAIRS[body.pair];
    if (!symbol) {
      throw new HttpException('Invalid pair', HttpStatus.BAD_REQUEST);
    }

    const userId = req.user.id;

    const order = await this.trading.placeOrder({
      userId,
      symbol,
      side: body.side,
      orderType: OrderType.MARKET,
      quantity: body.size.toString(),
    });

    const priceData = await this.binance.getPrice(symbol);
    const executionPrice = parseFloat(priceData.price);

    const result = await this.engine.executeOrder(order.id, executionPrice, true);
    return {
      message: 'Market order executed successfully',
      ...result,
      orderId: order.id
    };
  }

  @Post('limit-order')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Place a persistent limit order' })
  async limitOrder(@Request() req, @Body() body: { pair: string; side: OrderSide; size: number; price: number }) {
    const symbol = PAIRS[body.pair];
    if (!symbol) {
      throw new HttpException('Invalid pair', HttpStatus.BAD_REQUEST);
    }

    const userId = req.user.id;

    const order = await this.trading.placeOrder({
      userId,
      symbol,
      side: body.side,
      orderType: OrderType.LIMIT,
      quantity: body.size.toString(),
      price: body.price.toString(),
    });

    return {
      message: 'Limit order placed successfully',
      orderId: order.id,
      status: order.status
    };
  }

  @Get('positions')
  @ApiOperation({ summary: 'Get current simulated positions (Mocked)' })
  getPositions() {
    return this.trading.getPositions();
  }

  @Post('subscribe/:pair')
  @ApiOperation({ summary: 'Trigger backend to subscribe to Binance WS (Internal Use)' })
  @ApiParam({ name: 'pair', example: 'BTC/USDT' })
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