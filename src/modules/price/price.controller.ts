import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { PriceService } from './price.service';

@ApiTags('Prices')
@Controller('prices')
export class PriceController {
  constructor(private priceService: PriceService) {}

  @Get('health')
  @ApiOperation({ summary: 'Price service health check' })
  @ApiResponse({ status: 200, description: 'Price service is healthy' })
  async healthCheck() {
    return {
      success: true,
      service: 'price-service',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      cacheStats: {
        size: this.priceService.getCacheSize(),
        cachedPrices: this.priceService.getCachedPrices(),
      },
    };
  }

  @Get(':symbol')
  @ApiOperation({ summary: 'Get price for a specific symbol' })
  @ApiResponse({ status: 200, description: 'Price retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Price not found for symbol' })
  async getPrice(@Param('symbol') symbol: string) {
    try {
      const price = await this.priceService.getPrice(symbol);
      
      if (price === null) {
        return {
          success: false,
          error: `Price not available for ${symbol}`,
        };
      }

      return {
        success: true,
        data: {
          symbol: symbol.toUpperCase(),
          price,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Get()
  @ApiOperation({ summary: 'Get prices for multiple symbols' })
  @ApiResponse({ status: 200, description: 'Prices retrieved successfully' })
  @ApiQuery({ name: 'symbols', description: 'Comma-separated list of symbols', example: 'BTC,ETH,ADA' })
  async getPrices(@Query('symbols') symbolsParam?: string) {
    try {
      if (!symbolsParam) {
        // Return popular cryptocurrencies if no symbols specified
        const defaultSymbols = ['BTC', 'ETH', 'ADA', 'DOT', 'SOL', 'AVAX'];
        const prices = await this.priceService.getPrices(defaultSymbols);
        
        return {
          success: true,
          data: Object.entries(prices).map(([symbol, price]) => ({
            symbol: symbol.toUpperCase(),
            price,
            timestamp: new Date().toISOString(),
          })),
        };
      }

      const symbols = symbolsParam.split(',').map(s => s.trim().toUpperCase());
      const prices = await this.priceService.getPrices(symbols);

      return {
        success: true,
        data: Object.entries(prices).map(([symbol, price]) => ({
          symbol: symbol.toUpperCase(),
          price,
          timestamp: new Date().toISOString(),
        })),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Get(':symbol/market-data')
  @ApiOperation({ summary: 'Get detailed market data for symbol' })
  @ApiResponse({ status: 200, description: 'Market data retrieved successfully' })
  async getMarketData(@Param('symbol') symbol: string) {
    try {
      const marketData = await this.priceService.getMarketData(symbol);
      
      if (!marketData) {
        return {
          success: false,
          error: `Market data not available for ${symbol}`,
        };
      }

      return {
        success: true,
        data: marketData,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Get(':symbol/history')
  @ApiOperation({ summary: 'Get historical prices for symbol' })
  @ApiResponse({ status: 200, description: 'Historical prices retrieved successfully' })
  @ApiQuery({ name: 'days', required: false, description: 'Number of days of history', example: '7' })
  async getHistoricalPrices(
    @Param('symbol') symbol: string,
    @Query('days') days?: string,
  ) {
    try {
      const daysNumber = days ? parseInt(days) : 7;
      const historicalPrices = await this.priceService.getHistoricalPrices(symbol, daysNumber);

      return {
        success: true,
        data: {
          symbol: symbol.toUpperCase(),
          days: daysNumber,
          prices: historicalPrices.map(([timestamp, price]) => ({
            timestamp: new Date(timestamp).toISOString(),
            price,
          })),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Get('cache/clear')
  @ApiOperation({ summary: 'Clear price cache' })
  @ApiResponse({ status: 200, description: 'Cache cleared successfully' })
  async clearCache() {
    try {
      this.priceService.clearCache();
      return {
        success: true,
        message: 'Price cache cleared successfully',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Get('cache/stats')
  @ApiOperation({ summary: 'Get cache statistics' })
  @ApiResponse({ status: 200, description: 'Cache stats retrieved successfully' })
  async getCacheStats() {
    try {
      return {
        success: true,
        data: {
          size: this.priceService.getCacheSize(),
          cachedPrices: this.priceService.getCachedPrices(),
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Get('supported/coins')
  @ApiOperation({ summary: 'Get list of supported coins' })
  @ApiResponse({ status: 200, description: 'Supported coins retrieved successfully' })
  async getSupportedCoins() {
    try {
      const coins = await this.priceService.getSupportedCoins();
      return {
        success: true,
        data: coins.slice(0, 100), // Limit to first 100 for performance
        total: coins.length,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}