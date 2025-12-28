import { Controller, Get, Post, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import { IsString } from 'class-validator';

class CreateWalletDto {
  @IsString()
  currency: string;
  @IsString()
  initialBalance?: string;
}

@ApiTags('Wallets')
@Controller('wallets')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class WalletController {
  constructor(private walletService: WalletService) {}

  @Get()
  @ApiOperation({ summary: 'Get all user wallets' })
  @ApiResponse({ status: 200, description: 'Wallets retrieved successfully' })
  async getUserWallets(@Request() req) {
    try {
      const wallets = await this.walletService.getUserWallets(req.user.id);
      return {
        success: true,
        data: wallets,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Get(':currency')
  @ApiOperation({ summary: 'Get wallet by currency' })
  @ApiResponse({ status: 200, description: 'Wallet retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
  async getWalletByCurrency(@Request() req, @Param('currency') currency: string) {
    try {
      const wallet = await this.walletService.getWalletByCurrency(req.user.id, currency);
      return {
        success: true,
        data: wallet,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Post()
  @ApiOperation({ summary: 'Create a new wallet' })
  @ApiResponse({ status: 201, description: 'Wallet created successfully' })
  @ApiResponse({ status: 400, description: 'Wallet already exists or invalid data' })
  async createWallet(@Request() req, @Body() createWalletDto: CreateWalletDto) {
    try {
      const wallet = await this.walletService.createWallet(
        req.user.id,
        createWalletDto.currency,
        createWalletDto.initialBalance,
      );
      return {
        success: true,
        data: wallet,
        message: 'Wallet created successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Get(':currency/balance')
  @ApiOperation({ summary: 'Get available balance for currency' })
  @ApiResponse({ status: 200, description: 'Balance retrieved successfully' })
  async getAvailableBalance(@Request() req, @Param('currency') currency: string) {
    try {
      const balance = await this.walletService.getAvailableBalance(req.user.id, currency);
      return {
        success: true,
        data: {
          currency,
          availableBalance: balance,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Get('transactions/history')
  @ApiOperation({ summary: 'Get transaction history' })
  @ApiResponse({ status: 200, description: 'Transaction history retrieved successfully' })
  @ApiQuery({ name: 'currency', required: false, description: 'Filter by currency' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of transactions to return' })
  @ApiQuery({ name: 'offset', required: false, description: 'Offset for pagination' })
  async getTransactionHistory(
    @Request() req,
    @Query('currency') currency?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    try {
      const [transactions, total] = await this.walletService.getTransactionHistory(
        req.user.id,
        currency,
        limit ? parseInt(limit) : 50,
        offset ? parseInt(offset) : 0,
      );

      return {
        success: true,
        data: {
          transactions,
          total,
          limit: limit ? parseInt(limit) : 50,
          offset: offset ? parseInt(offset) : 0,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Get(':currency/transactions')
  @ApiOperation({ summary: 'Get transactions for specific currency' })
  @ApiResponse({ status: 200, description: 'Transactions retrieved successfully' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of transactions to return' })
  @ApiQuery({ name: 'offset', required: false, description: 'Offset for pagination' })
  async getCurrencyTransactions(
    @Request() req,
    @Param('currency') currency: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    try {
      const [transactions, total] = await this.walletService.getTransactionHistory(
        req.user.id,
        currency,
        limit ? parseInt(limit) : 50,
        offset ? parseInt(offset) : 0,
      );

      return {
        success: true,
        data: {
          currency,
          transactions,
          total,
          limit: limit ? parseInt(limit) : 50,
          offset: offset ? parseInt(offset) : 0,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}