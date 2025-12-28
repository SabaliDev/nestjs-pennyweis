import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { StocksService } from './stocks.service';

@ApiTags('Stocks')
@Controller('stocks')
export class StocksController {
  constructor(private stocksService: StocksService) {}

  @Get('health')
  @ApiOperation({ summary: 'Stocks service health check' })
  @ApiResponse({ status: 200, description: 'Stocks service is healthy' })
  async healthCheck() {
    const isMarketOpen = await this.stocksService.isMarketOpen();
    const cacheStats = this.stocksService.getCacheStats();
    
    return {
      success: true,
      service: 'stocks-service',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      marketOpen: isMarketOpen,
      cacheStats,
    };
  }

  @Get('market-status')
  @ApiOperation({ summary: 'Get market status' })
  @ApiResponse({ status: 200, description: 'Market status retrieved successfully' })
  async getMarketStatus() {
    try {
      const isOpen = await this.stocksService.isMarketOpen();
      return {
        success: true,
        data: {
          isOpen,
          marketHours: 'US Markets: 9:30 AM - 4:00 PM EST, Monday - Friday',
          timezone: 'America/New_York',
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

  @Get('popular')
  @ApiOperation({ summary: 'Get popular stock prices' })
  @ApiResponse({ status: 200, description: 'Popular stocks retrieved successfully' })
  async getPopularStocks() {
    try {
      const stocks = await this.stocksService.getPopularStocks();
      return {
        success: true,
        data: stocks,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Get('search')
  @ApiOperation({ summary: 'Search for stocks' })
  @ApiResponse({ status: 200, description: 'Search results retrieved successfully' })
  @ApiQuery({ name: 'q', description: 'Search query', example: 'AAPL' })
  async searchStocks(@Query('q') query: string) {
    try {
      if (!query || query.trim().length === 0) {
        return {
          success: false,
          error: 'Search query is required',
        };
      }

      const stocks = await this.stocksService.searchStocks(query.trim());
      return {
        success: true,
        data: stocks,
        query: query.trim(),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Get('market-summary')
  @ApiOperation({ summary: 'Get market summary with major indices' })
  @ApiResponse({ status: 200, description: 'Market summary retrieved successfully' })
  async getMarketSummary() {
    try {
      const summary = await this.stocksService.getMarketSummary();
      return {
        success: true,
        data: summary,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Get(':symbol')
  @ApiOperation({ summary: 'Get stock price by symbol' })
  @ApiResponse({ status: 200, description: 'Stock price retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Stock not found' })
  async getStockPrice(@Param('symbol') symbol: string) {
    try {
      const stockPrice = await this.stocksService.getStockPrice(symbol.toUpperCase());
      
      if (!stockPrice) {
        return {
          success: false,
          error: `Stock price not available for ${symbol.toUpperCase()}`,
        };
      }

      return {
        success: true,
        data: stockPrice,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Get('bulk/prices')
  @ApiOperation({ summary: 'Get prices for multiple stocks' })
  @ApiResponse({ status: 200, description: 'Stock prices retrieved successfully' })
  @ApiQuery({ 
    name: 'symbols', 
    description: 'Comma-separated list of stock symbols', 
    example: 'AAPL,GOOGL,MSFT' 
  })
  async getBulkStockPrices(@Query('symbols') symbolsParam: string) {
    try {
      if (!symbolsParam) {
        return {
          success: false,
          error: 'Symbols parameter is required',
        };
      }

      const symbols = symbolsParam
        .split(',')
        .map(s => s.trim().toUpperCase())
        .filter(s => s.length > 0);

      if (symbols.length === 0) {
        return {
          success: false,
          error: 'At least one valid symbol is required',
        };
      }

      if (symbols.length > 50) {
        return {
          success: false,
          error: 'Maximum 50 symbols allowed per request',
        };
      }

      const prices = await this.stocksService.getStockPrices(symbols);
      
      return {
        success: true,
        data: Object.values(prices).filter(price => price !== null),
        requested: symbols,
        found: Object.values(prices).filter(price => price !== null).length,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Get('cache/clear')
  @ApiOperation({ summary: 'Clear stocks cache' })
  @ApiResponse({ status: 200, description: 'Cache cleared successfully' })
  async clearCache() {
    try {
      this.stocksService.clearCache();
      return {
        success: true,
        message: 'Stocks cache cleared successfully',
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
      const stats = this.stocksService.getCacheStats();
      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}