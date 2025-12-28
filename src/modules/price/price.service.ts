import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CoinGeckoService } from './coingecko.service';

@Injectable()
export class PriceService {
  private readonly logger = new Logger(PriceService.name);
  private priceCache = new Map<string, { price: number; timestamp: number }>();
  private readonly cacheTimeout = 30000; // 30 seconds

  constructor(
    private configService: ConfigService,
    private coinGeckoService: CoinGeckoService,
  ) {}

  async getPrice(symbol: string): Promise<number | null> {
    const cacheKey = symbol.toLowerCase();
    const cached = this.priceCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.price;
    }

    try {
      const price = await this.coinGeckoService.getPrice(symbol);
      
      if (price !== null) {
        this.priceCache.set(cacheKey, {
          price,
          timestamp: Date.now(),
        });
      }
      
      return price;
    } catch (error) {
      this.logger.error(`Failed to fetch price for ${symbol}:`, error);
      return cached?.price ?? null;
    }
  }

  async getPrices(symbols: string[]): Promise<Record<string, number | null>> {
    const prices: Record<string, number | null> = {};
    
    // Use Promise.all to fetch prices concurrently
    const pricePromises = symbols.map(async (symbol) => {
      const price = await this.getPrice(symbol);
      return { symbol, price };
    });

    const results = await Promise.allSettled(pricePromises);
    
    results.forEach((result, index) => {
      const symbol = symbols[index];
      if (result.status === 'fulfilled') {
        prices[symbol] = result.value.price;
      } else {
        this.logger.error(`Failed to fetch price for ${symbol}:`, result.reason);
        prices[symbol] = null;
      }
    });

    return prices;
  }

  async getMarketData(symbol: string) {
    try {
      return await this.coinGeckoService.getMarketData(symbol);
    } catch (error) {
      this.logger.error(`Failed to fetch market data for ${symbol}:`, error);
      return null;
    }
  }

  async getHistoricalPrices(symbol: string, days = 7) {
    try {
      return await this.coinGeckoService.getHistoricalPrices(symbol, days);
    } catch (error) {
      this.logger.error(`Failed to fetch historical prices for ${symbol}:`, error);
      return [];
    }
  }

  async getSupportedCoins() {
    try {
      return await this.coinGeckoService.getSupportedCoins();
    } catch (error) {
      this.logger.error('Failed to fetch supported coins:', error);
      return [];
    }
  }

  clearCache() {
    this.priceCache.clear();
    this.logger.log('Price cache cleared');
  }

  getCacheSize(): number {
    return this.priceCache.size;
  }

  getCachedPrices(): Record<string, { price: number; age: number }> {
    const cached: Record<string, { price: number; age: number }> = {};
    const now = Date.now();
    
    this.priceCache.forEach((value, key) => {
      cached[key] = {
        price: value.price,
        age: now - value.timestamp,
      };
    });
    
    return cached;
  }
}