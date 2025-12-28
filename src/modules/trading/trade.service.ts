import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Trade } from '../../entities/trade.entity';
import Decimal from 'decimal.js-light';

interface CreateTradeDto {
  buyOrderId: string;
  sellOrderId: string;
  symbol: string;
  price: string;
  quantity: string;
  notionalValue: string;
}

@Injectable()
export class TradeService {
  constructor(
    @InjectRepository(Trade)
    private tradeRepository: Repository<Trade>,
  ) {}

  async createTrade(createTradeDto: CreateTradeDto): Promise<Trade> {
    const notionalValue = new Decimal(createTradeDto.price)
      .times(new Decimal(createTradeDto.quantity))
      .toString();

    const trade = this.tradeRepository.create({
      buyOrderId: createTradeDto.buyOrderId,
      sellOrderId: createTradeDto.sellOrderId,
      symbol: createTradeDto.symbol,
      price: createTradeDto.price,
      quantity: createTradeDto.quantity,
      notionalValue,
    });

    return this.tradeRepository.save(trade);
  }

  async findTradeById(tradeId: string): Promise<Trade | null> {
    return this.tradeRepository.findOne({ 
      where: { id: tradeId },
      relations: ['buyOrder', 'sellOrder'],
    });
  }

  async getTradeHistory(
    symbol?: string,
    limit = 50,
    offset = 0,
  ) {
    const query = this.tradeRepository.createQueryBuilder('trade')
      .leftJoinAndSelect('trade.buyOrder', 'buyOrder')
      .leftJoinAndSelect('trade.sellOrder', 'sellOrder')
      .orderBy('trade.createdAt', 'DESC')
      .limit(limit)
      .offset(offset);

    if (symbol) {
      query.andWhere('trade.symbol = :symbol', { symbol });
    }

    return query.getManyAndCount();
  }

  async getUserTrades(
    userId: string,
    symbol?: string,
    limit = 50,
    offset = 0,
  ) {
    const query = this.tradeRepository.createQueryBuilder('trade')
      .leftJoinAndSelect('trade.buyOrder', 'buyOrder')
      .leftJoinAndSelect('trade.sellOrder', 'sellOrder')
      .where('buyOrder.userId = :userId OR sellOrder.userId = :userId', { userId })
      .orderBy('trade.createdAt', 'DESC')
      .limit(limit)
      .offset(offset);

    if (symbol) {
      query.andWhere('trade.symbol = :symbol', { symbol });
    }

    return query.getManyAndCount();
  }

  async getMarketStats(symbol: string, timeframe = '24h') {
    const now = new Date();
    let fromDate: Date;

    switch (timeframe) {
      case '1h':
        fromDate = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
        fromDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      default:
        fromDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    const trades = await this.tradeRepository
      .createQueryBuilder('trade')
      .where('trade.symbol = :symbol', { symbol })
      .andWhere('trade.createdAt >= :fromDate', { fromDate })
      .orderBy('trade.createdAt', 'ASC')
      .getMany();

    if (trades.length === 0) {
      return {
        symbol,
        timeframe,
        volume: '0',
        high: '0',
        low: '0',
        open: '0',
        close: '0',
        change: '0',
        changePercent: '0',
        tradeCount: 0,
        lastPrice: '0',
        timestamp: now,
      };
    }

    const prices = trades.map(trade => new Decimal(trade.price));
    const volumes = trades.map(trade => new Decimal(trade.quantity));
    
    const totalVolume = volumes.reduce((sum, vol) => sum.plus(vol), new Decimal(0));
    const high = prices.reduce((max, price) => price.greaterThan(max) ? price : max, prices[0]);
    const low = prices.reduce((min, price) => price.lessThan(min) ? price : min, prices[0]);
    const open = prices[0];
    const close = prices[prices.length - 1];
    const change = close.minus(open);
    const changePercent = open.greaterThan(0) 
      ? change.dividedBy(open).times(100) 
      : new Decimal(0);

    return {
      symbol,
      timeframe,
      volume: totalVolume.toString(),
      high: high.toString(),
      low: low.toString(),
      open: open.toString(),
      close: close.toString(),
      change: change.toString(),
      changePercent: changePercent.toFixed(2),
      tradeCount: trades.length,
      lastPrice: close.toString(),
      timestamp: now,
    };
  }

  async getVolumeProfile(symbol: string, timeframe = '24h') {
    const now = new Date();
    let fromDate: Date;

    switch (timeframe) {
      case '1h':
        fromDate = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
        fromDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      default:
        fromDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    const result = await this.tradeRepository
      .createQueryBuilder('trade')
      .select('trade.price', 'price')
      .addSelect('SUM(CAST(trade.quantity AS decimal))', 'volume')
      .addSelect('COUNT(*)', 'count')
      .where('trade.symbol = :symbol', { symbol })
      .andWhere('trade.createdAt >= :fromDate', { fromDate })
      .groupBy('trade.price')
      .orderBy('CAST(trade.price AS decimal)', 'ASC')
      .getRawMany();

    return result.map(row => ({
      price: row.price,
      volume: row.volume,
      count: parseInt(row.count),
    }));
  }

  async getRecentTrades(symbol: string, limit = 20) {
    return this.tradeRepository.find({
      where: { symbol },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}