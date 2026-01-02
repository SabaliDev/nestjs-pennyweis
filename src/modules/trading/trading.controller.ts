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
import { OrderSide, OrderType, Order, OrderStatus } from '../../entities/order.entity';
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

  // Inject OrderService for new endpoints
  @InjectRepository(Order)
  private orderRepo: Repository<Order>;

  private resolveSymbol(pairOrSymbol: string): string {
    if (!pairOrSymbol) return null;

    // Check if it's a mapped pair like "BTC/USDT"
    if (PAIRS[pairOrSymbol]) {
      return PAIRS[pairOrSymbol];
    }

    // Check if it's already a raw symbol like "BTCUSDT" (exists as a value in PAIRS)
    const rawSymbols = Object.values(PAIRS);
    if (rawSymbols.includes(pairOrSymbol)) {
      return pairOrSymbol;
    }

    // Attempt to handle cases where frontend might send "BTC-USDT" or similar
    const normalized = pairOrSymbol.replace(/[^a-zA-Z]/g, '');
    if (rawSymbols.includes(normalized)) {
      return normalized;
    }

    return null;
  }

  @Get('pairs')
  @ApiOperation({ summary: 'Get supported trading pairs' })
  getPairs() {
    return Object.keys(PAIRS);
  }

  @Get('price')
  @ApiOperation({ summary: 'Handle missing pair for price' })
  handleMissingPrice() {
    throw new HttpException('Pair parameter is required (e.g., /price/BTCUSDT)', HttpStatus.BAD_REQUEST);
  }

  @Get('price/:pair')
  @ApiOperation({ summary: 'Get current price for a pair' })
  @ApiParam({ name: 'pair', example: 'BTC/USDT' })
  async getPrice(@Param('pair') pair: string) {
    const symbol = this.resolveSymbol(pair);
    if (!symbol) {
      throw new HttpException(`Invalid pair or symbol: ${pair}`, HttpStatus.BAD_REQUEST);
    }
    return this.binance.getPrice(symbol);
  }

  @Get('candles')
  @ApiOperation({ summary: 'Handle missing pair for candles' })
  handleMissingCandles() {
    throw new HttpException('Pair parameter is required (e.g., /candles/BTCUSDT)', HttpStatus.BAD_REQUEST);
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
    const symbol = this.resolveSymbol(pair);
    if (!symbol) {
      throw new HttpException(`Invalid pair or symbol: ${pair}`, HttpStatus.BAD_REQUEST);
    }

    // Validate interval - default to '1m' if invalid or undefined
    const validIntervals = ['1s', '1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '8h', '12h', '1d', '3d', '1w', '1M'];
    const safeInterval = (interval && validIntervals.includes(interval)) ? interval : '1m';
    const safeLimit = (limit && limit > 0 && limit <= 1000) ? +limit : 500;

    return this.binance.getCandles(symbol, safeInterval, safeLimit);
  }

  @Get('depth')
  @ApiOperation({ summary: 'Handle missing pair for depth' })
  handleMissingDepth() {
    throw new HttpException('Pair parameter is required (e.g., /depth/BTCUSDT)', HttpStatus.BAD_REQUEST);
  }

  @Get('depth/:pair')
  @ApiOperation({ summary: 'Get order book depth' })
  @ApiParam({ name: 'pair', example: 'BTC/USDT' })
  @ApiQuery({ name: 'limit', required: false, example: 100, description: 'Depth limit (default 20, max 5000)' })
  async getDepth(
    @Param('pair') pair: string,
    @Query('limit') limit = 100,
  ) {
    const symbol = this.resolveSymbol(pair);
    if (!symbol) {
      throw new HttpException(`Invalid pair or symbol: ${pair}`, HttpStatus.BAD_REQUEST);
    }
    return this.binance.getDepth(symbol, +limit);
  }

  @Post('market-order')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Execute a persistent market order' })
  @ApiBody({ type: CreateMarketOrderDto })
  async marketOrder(@Request() req, @Body() body: CreateMarketOrderDto) {
    const symbol = this.resolveSymbol(body.pair);
    if (!symbol) {
      throw new HttpException(`Invalid pair or symbol: ${body.pair}`, HttpStatus.BAD_REQUEST);
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
    const symbol = this.resolveSymbol(body.pair);
    if (!symbol) {
      throw new HttpException(`Invalid pair or symbol: ${body.pair}`, HttpStatus.BAD_REQUEST);
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

  @Post('place-order')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unified endpoint for placing orders' })
  async placeOrder(@Request() req, @Body() body: { pair: string; side: OrderSide; size: any; price?: any; type: 'market' | 'limit' }) {
    const { type, ...orderParams } = body;

    // Convert size and price to numbers if they are strings
    const size = typeof body.size === 'string' ? parseFloat(body.size) : body.size;
    const price = typeof body.price === 'string' && body.price !== '' ? parseFloat(body.price) : body.price;

    if (type === 'market') {
      return this.marketOrder(req, { ...orderParams, size });
    } else {
      return this.limitOrder(req, { ...orderParams, size, price });
    }
  }

  @Get('positions')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current positions (asset holdings)' })
  async getPositions(@Request() req) {
    const positions = await this.trading.getPositions(req.user.id);
    return {
      success: true,
      data: positions,
    };
  }

  @Get('orders')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all user orders' })
  @ApiQuery({ name: 'symbol', required: false, description: 'Filter by symbol' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of orders to return' })
  @ApiQuery({ name: 'offset', required: false, description: 'Offset for pagination' })
  async getOrders(
    @Request() req,
    @Query('symbol') symbol?: string,
    @Query('status') status?: OrderStatus,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const [orders, total] = await this.orderRepo.createQueryBuilder('order')
      .where('order.userId = :userId', { userId: req.user.id })
      .orderBy('order.createdAt', 'DESC')
      .limit(limit ? parseInt(limit) : 50)
      .offset(offset ? parseInt(offset) : 0)
      .getManyAndCount();

    return {
      success: true,
      data: {
        orders,
        total,
        limit: limit ? parseInt(limit) : 50,
        offset: offset ? parseInt(offset) : 0,
      },
    };
  }

  @Get('orders/active')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get active orders (NEW, OPEN, PARTIALLY_FILLED)' })
  @ApiQuery({ name: 'symbol', required: false, description: 'Filter by symbol' })
  async getActiveOrders(
    @Request() req,
    @Query('symbol') symbol?: string,
  ) {
    const query = this.orderRepo.createQueryBuilder('order')
      .where('order.userId = :userId', { userId: req.user.id })
      .andWhere('order.status IN (:...statuses)', {
        statuses: [OrderStatus.NEW, OrderStatus.OPEN, OrderStatus.PARTIALLY_FILLED]
      })
      .orderBy('order.createdAt', 'DESC');

    if (symbol) {
      query.andWhere('order.symbol = :symbol', { symbol });
    }

    const orders = await query.getMany();

    return {
      success: true,
      data: orders,
    };
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