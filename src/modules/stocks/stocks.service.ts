import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface StockPrice {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap?: number;
  lastUpdate: string;
}

@Injectable()
export class StocksService {
  private readonly logger = new Logger(StocksService.name);
  private readonly httpClient: AxiosInstance;
  private priceCache = new Map<string, { data: StockPrice; timestamp: number }>();
  private readonly cacheTimeout = 60000; // 1 minute

  constructor(private configService: ConfigService) {
    this.httpClient = axios.create({
      timeout: 10000,
      headers: {
        'User-Agent': 'PennyWeis-Trading-Platform/1.0',
      },
    });
  }

  async getStockPrice(symbol: string): Promise<StockPrice | null> {
    const cacheKey = symbol.toUpperCase();
    const cached = this.priceCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    try {
      // In a real implementation, you would use a stock market API like Alpha Vantage, IEX Cloud, etc.
      // For now, we'll simulate with mock data
      const mockPrice = this.generateMockStockPrice(symbol);
      
      this.priceCache.set(cacheKey, {
        data: mockPrice,
        timestamp: Date.now(),
      });
      
      return mockPrice;
    } catch (error) {
      this.logger.error(`Failed to fetch stock price for ${symbol}:`, error.message);
      return cached?.data ?? null;
    }
  }

  async getStockPrices(symbols: string[]): Promise<Record<string, StockPrice | null>> {
    const prices: Record<string, StockPrice | null> = {};
    
    // Fetch prices concurrently
    const pricePromises = symbols.map(async (symbol) => {
      const price = await this.getStockPrice(symbol);
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

  async getPopularStocks(): Promise<StockPrice[]> {
    const popularSymbols = [
      'AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 
      'META', 'NVDA', 'NFLX', 'DIS', 'PYPL'
    ];

    const prices = await this.getStockPrices(popularSymbols);
    
    return popularSymbols
      .map(symbol => prices[symbol])
      .filter((price): price is StockPrice => price !== null);
  }

  async searchStocks(query: string): Promise<StockPrice[]> {
    // In a real implementation, this would search a stock database
    // For now, return a filtered list of common stocks
    const commonStocks = [
      'AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX', 
      'DIS', 'PYPL', 'ADBE', 'CRM', 'ORCL', 'INTC', 'IBM', 'CSCO',
      'V', 'MA', 'JPM', 'BAC', 'WFC', 'GS', 'MS', 'C', 'AXP',
      'JNJ', 'PFE', 'MRNA', 'ABBV', 'UNH', 'CVS', 'WMT', 'TGT',
      'HD', 'LOW', 'NKE', 'SBUX', 'MCD', 'KO', 'PEP'
    ];

    const filteredSymbols = commonStocks
      .filter(symbol => 
        symbol.toLowerCase().includes(query.toLowerCase()) ||
        this.getCompanyName(symbol).toLowerCase().includes(query.toLowerCase())
      )
      .slice(0, 10);

    const prices = await this.getStockPrices(filteredSymbols);
    
    return filteredSymbols
      .map(symbol => prices[symbol])
      .filter((price): price is StockPrice => price !== null);
  }

  async getMarketSummary() {
    const indexSymbols = ['SPY', 'QQQ', 'IWM', 'DIA']; // Major ETFs representing indices
    const prices = await this.getStockPrices(indexSymbols);
    
    return {
      indices: indexSymbols.map(symbol => ({
        symbol,
        name: this.getIndexName(symbol),
        ...prices[symbol],
      })).filter(item => item.price),
      timestamp: new Date().toISOString(),
    };
  }

  async isMarketOpen(): Promise<boolean> {
    // Simplified market hours check (US markets)
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday
    
    // Markets closed on weekends
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return false;
    }
    
    // Convert to EST (market timezone)
    const estTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
    const hour = estTime.getHours();
    const minute = estTime.getMinutes();
    const totalMinutes = hour * 60 + minute;
    
    // Market hours: 9:30 AM to 4:00 PM EST
    const marketOpen = 9 * 60 + 30; // 9:30 AM
    const marketClose = 16 * 60; // 4:00 PM
    
    return totalMinutes >= marketOpen && totalMinutes < marketClose;
  }

  clearCache(): void {
    this.priceCache.clear();
    this.logger.log('Stock price cache cleared');
  }

  getCacheStats() {
    return {
      size: this.priceCache.size,
      entries: Array.from(this.priceCache.entries()).map(([symbol, data]) => ({
        symbol,
        age: Date.now() - data.timestamp,
        price: data.data.price,
      })),
    };
  }

  private generateMockStockPrice(symbol: string): StockPrice {
    // Generate realistic mock data for demonstration
    const basePrice = this.getBaseMockPrice(symbol);
    const randomChange = (Math.random() - 0.5) * 0.1; // ±5% daily change
    const change = basePrice * randomChange;
    const changePercent = (change / basePrice) * 100;
    
    return {
      symbol: symbol.toUpperCase(),
      price: +(basePrice + change).toFixed(2),
      change: +change.toFixed(2),
      changePercent: +changePercent.toFixed(2),
      volume: Math.floor(Math.random() * 10000000) + 1000000, // Random volume
      marketCap: basePrice * 1000000000, // Mock market cap
      lastUpdate: new Date().toISOString(),
    };
  }

  private getBaseMockPrice(symbol: string): number {
    // Mock base prices for common stocks
    const mockPrices: Record<string, number> = {
      'AAPL': 175.00,
      'GOOGL': 125.00,
      'MSFT': 350.00,
      'AMZN': 140.00,
      'TSLA': 250.00,
      'META': 320.00,
      'NVDA': 450.00,
      'NFLX': 400.00,
      'DIS': 90.00,
      'PYPL': 65.00,
      'SPY': 450.00,
      'QQQ': 375.00,
      'IWM': 200.00,
      'DIA': 350.00,
    };
    
    return mockPrices[symbol.toUpperCase()] || 100.00;
  }

  private getCompanyName(symbol: string): string {
    const companyNames: Record<string, string> = {
      'AAPL': 'Apple Inc.',
      'GOOGL': 'Alphabet Inc.',
      'MSFT': 'Microsoft Corporation',
      'AMZN': 'Amazon.com Inc.',
      'TSLA': 'Tesla Inc.',
      'META': 'Meta Platforms Inc.',
      'NVDA': 'NVIDIA Corporation',
      'NFLX': 'Netflix Inc.',
      'DIS': 'The Walt Disney Company',
      'PYPL': 'PayPal Holdings Inc.',
    };
    
    return companyNames[symbol.toUpperCase()] || symbol.toUpperCase();
  }

  private getIndexName(symbol: string): string {
    const indexNames: Record<string, string> = {
      'SPY': 'S&P 500',
      'QQQ': 'NASDAQ-100',
      'IWM': 'Russell 2000',
      'DIA': 'Dow Jones',
    };
    
    return indexNames[symbol.toUpperCase()] || symbol.toUpperCase();
  }
}