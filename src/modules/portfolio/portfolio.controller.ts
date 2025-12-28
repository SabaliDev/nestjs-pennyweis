import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PortfolioService } from './portfolio.service';

@ApiTags('Portfolio')
@Controller('portfolio')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class PortfolioController {
  constructor(private portfolioService: PortfolioService) {}

  @Get()
  @ApiOperation({ summary: 'Get user portfolio' })
  @ApiResponse({ status: 200, description: 'Portfolio retrieved successfully' })
  async getPortfolio(@Request() req) {
    try {
      const portfolio = await this.portfolioService.getUserPortfolio(req.user.id);
      return {
        success: true,
        data: portfolio,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get portfolio summary with asset breakdown' })
  @ApiResponse({ status: 200, description: 'Portfolio summary retrieved successfully' })
  async getPortfolioSummary(@Request() req) {
    try {
      const summary = await this.portfolioService.getPortfolioSummary(req.user.id);
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

  @Get('performance')
  @ApiOperation({ summary: 'Get portfolio performance metrics' })
  @ApiResponse({ status: 200, description: 'Performance metrics retrieved successfully' })
  @ApiQuery({ name: 'period', required: false, description: 'Time period for metrics', example: '30d' })
  async getPerformanceMetrics(
    @Request() req,
    @Query('period') period = '30d',
  ) {
    try {
      const metrics = await this.portfolioService.getPerformanceMetrics(req.user.id, period);
      return {
        success: true,
        data: metrics,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Get('allocation')
  @ApiOperation({ summary: 'Get asset allocation breakdown' })
  @ApiResponse({ status: 200, description: 'Asset allocation retrieved successfully' })
  async getAssetAllocation(@Request() req) {
    try {
      const allocation = await this.portfolioService.getAssetAllocation(req.user.id);
      return {
        success: true,
        data: allocation,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Get('refresh')
  @ApiOperation({ summary: 'Refresh portfolio values with latest prices' })
  @ApiResponse({ status: 200, description: 'Portfolio refreshed successfully' })
  async refreshPortfolio(@Request() req) {
    try {
      const portfolio = await this.portfolioService.getUserPortfolio(req.user.id);
      const updatedPortfolio = await this.portfolioService.updatePortfolioValues(portfolio);
      
      return {
        success: true,
        data: updatedPortfolio,
        message: 'Portfolio values refreshed with latest prices',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}