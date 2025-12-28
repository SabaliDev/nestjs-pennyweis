import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

interface CoinGeckoPrice {
  [key: string]: {
    usd: number;
    usd_market_cap?: number;
    usd_24h_vol?: number;
    usd_24h_change?: number;
  };
}

export interface CoinGeckoMarketData {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  total_volume: number;
  price_change_percentage_24h: number;
  circulating_supply: number;
  total_supply: number;
  max_supply: number;
}

@Injectable()
export class CoinGeckoService {
  private readonly logger = new Logger(CoinGeckoService.name);
  private readonly httpClient: AxiosInstance;
  private readonly baseUrl: string;
  private readonly apiKey?: string;

  constructor(private configService: ConfigService) {
    const usePro = this.configService.get<boolean>('app.coingecko.usePro', false);
    this.baseUrl = usePro 
      ? this.configService.get<string>('app.coingecko.proBaseUrl', 'https://pro-api.coingecko.com/api/v3')
      : this.configService.get<string>('app.coingecko.baseUrl', 'https://api.coingecko.com/api/v3');
    
    this.apiKey = this.configService.get<string>('app.coingecko.apiKey');

    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      timeout: this.configService.get<number>('app.coingecko.timeoutSecs', 10) * 1000,
      headers: {
        'User-Agent': 'PennyWeis-Trading-Platform/1.0',
        ...(this.apiKey && { 'x-cg-pro-api-key': this.apiKey }),
      },
    });

    // Add request interceptor for rate limiting
    this.httpClient.interceptors.request.use((config) => {
      this.logger.debug(`Making request to: ${config.url}`);
      return config;
    });

    // Add response interceptor for error handling
    this.httpClient.interceptors.response.use(
      (response) => response,
      (error) => {
        this.logger.error(`CoinGecko API error: ${error.message}`);
        if (error.response?.status === 429) {
          this.logger.warn('Rate limit exceeded, request failed');
        }
        throw error;
      },
    );
  }

  async getPrice(symbol: string): Promise<number | null> {
    try {
      const coinId = this.mapSymbolToCoinId(symbol);
      const response = await this.httpClient.get<CoinGeckoPrice>('/simple/price', {
        params: {
          ids: coinId,
          vs_currencies: 'usd',
          include_24hr_change: true,
        },
      });

      const priceData = response.data[coinId];
      return priceData?.usd ?? null;
    } catch (error) {
      this.logger.error(`Failed to fetch price for ${symbol}:`, error.message);
      return null;
    }
  }

  async getPrices(symbols: string[]): Promise<Record<string, number | null>> {
    try {
      const coinIds = symbols.map(symbol => this.mapSymbolToCoinId(symbol));
      const response = await this.httpClient.get<CoinGeckoPrice>('/simple/price', {
        params: {
          ids: coinIds.join(','),
          vs_currencies: 'usd',
          include_24hr_change: true,
        },
      });

      const prices: Record<string, number | null> = {};
      symbols.forEach((symbol, index) => {
        const coinId = coinIds[index];
        const priceData = response.data[coinId];
        prices[symbol] = priceData?.usd ?? null;
      });

      return prices;
    } catch (error) {
      this.logger.error('Failed to fetch multiple prices:', error.message);
      return symbols.reduce((acc, symbol) => {
        acc[symbol] = null;
        return acc;
      }, {} as Record<string, number | null>);
    }
  }

  

  async getMarketData(symbol: string): Promise<CoinGeckoMarketData | null> {
    try {
      const coinId = this.mapSymbolToCoinId(symbol);
      const response = await this.httpClient.get<CoinGeckoMarketData[]>('/coins/markets', {
        params: {
          vs_currency: 'usd',
          ids: coinId,
          order: 'market_cap_desc',
          per_page: 1,
          page: 1,
          sparkline: false,
        },
      });

      return response.data[0] ?? null;
    } catch (error) {
      this.logger.error(`Failed to fetch market data for ${symbol}:`, error.message);
      return null;
    }
  }

  async getHistoricalPrices(symbol: string, days = 7): Promise<Array<[number, number]>> {
    try {
      const coinId = this.mapSymbolToCoinId(symbol);
      const response = await this.httpClient.get(`/coins/${coinId}/market_chart`, {
        params: {
          vs_currency: 'usd',
          days,
        },
      });

      return response.data.prices ?? [];
    } catch (error) {
      this.logger.error(`Failed to fetch historical prices for ${symbol}:`, error.message);
      return [];
    }
  }

  async getSupportedCoins() {
    try {
      const response = await this.httpClient.get('/coins/list', {
        params: {
          include_platform: false,
        },
      });

      return response.data;
    } catch (error) {
      this.logger.error('Failed to fetch supported coins:', error.message);
      return [];
    }
  }

  async ping(): Promise<boolean> {
    try {
      await this.httpClient.get('/ping');
      return true;
    } catch (error) {
      this.logger.error('CoinGecko API ping failed:', error.message);
      return false;
    }
  }

  private mapSymbolToCoinId(symbol: string): string {
    // Map trading symbols to CoinGecko coin IDs
    const symbolMap: Record<string, string> = {
      'BTC': 'bitcoin',
      'ETH': 'ethereum',
      'ADA': 'cardano',
      'DOT': 'polkadot',
      'SOL': 'solana',
      'AVAX': 'avalanche-2',
      'MATIC': 'matic-network',
      'LINK': 'chainlink',
      'UNI': 'uniswap',
      'AAVE': 'aave',
      'COMP': 'compound-governance-token',
      'MKR': 'maker',
      'SNX': 'havven',
      'SUSHI': 'sushi',
      'YFI': 'yearn-finance',
      'CRV': 'curve-dao-token',
      'BAL': 'balancer',
      'USDT': 'tether',
      'USDC': 'usd-coin',
      'DAI': 'dai',
    };

    return symbolMap[symbol.toUpperCase()] || symbol.toLowerCase();
  }
}