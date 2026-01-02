import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Portfolio } from '../../entities/portfolio.entity';
import { WalletService } from '../wallet/wallet.service';
import { BinanceService } from '../binance/binance.service';
import { PredictionTradingService } from '../polymarket/prediction-trading.service';
import Decimal from 'decimal.js-light';

@Injectable()
export class PortfolioService {
  constructor(
    @InjectRepository(Portfolio)
    private portfolioRepository: Repository<Portfolio>,
    private walletService: WalletService,
    private binanceService: BinanceService,
    private predictionTradingService: PredictionTradingService,
  ) { }

  async getUserPortfolio(userId: string): Promise<Portfolio> {
    let portfolio = await this.portfolioRepository.findOne({
      where: { userId },
    });

    if (!portfolio) {
      portfolio = await this.createPortfolio(userId);
    }

    return this.updatePortfolioValues(portfolio);
  }

  async createPortfolio(userId: string): Promise<Portfolio> {
    const portfolio = this.portfolioRepository.create({
      userId,
      totalValue: '0',
      availableBalance: '0',
      lockedBalance: '0',
      pnlRealized: '0',
      pnlUnrealized: '0',
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      totalFeesPaid: '0',
    });

    return this.portfolioRepository.save(portfolio);
  }

  async updatePortfolioValues(portfolio: Portfolio): Promise<Portfolio> {
    try {
      const wallets = await this.walletService.getUserWallets(portfolio.userId);

      let totalValue = new Decimal(0);
      let availableBalance = new Decimal(0);
      let lockedBalance = new Decimal(0);

      // Calculate total portfolio value by getting USD value of all assets
      for (const wallet of wallets) {
        const balance = new Decimal(wallet.balance);
        const locked = new Decimal(wallet.lockedBalance);

        if (wallet.currency === 'USD' || wallet.currency === 'USDT' || wallet.currency === 'USDC') {
          // Stable coins count as 1:1 with USD
          totalValue = totalValue.plus(balance);
          availableBalance = availableBalance.plus(balance.minus(locked));
          lockedBalance = lockedBalance.plus(locked);
        } else {
          // Get USD price for other assets using Binance
          try {
            // Assume USDT pair for simplicity
            const symbol = `${wallet.currency}USDT`;
            const ticker = await this.binanceService.getPrice(symbol);
            if (ticker && ticker.price) {
              const price = ticker.price;
              const usdValue = balance.times(new Decimal(price));
              const lockedUsdValue = locked.times(new Decimal(price));

              totalValue = totalValue.plus(usdValue);
              availableBalance = availableBalance.plus(usdValue.minus(lockedUsdValue));
              lockedBalance = lockedBalance.plus(lockedUsdValue);
            }
          } catch (e) {
            // Ignore if price not found
          }
        }
      }

      // Add Prediction Market Positions Value
      try {
        const predictionPositions = await this.predictionTradingService.getUserPredictionPositions(portfolio.userId);
        for (const pos of predictionPositions) {
          totalValue = totalValue.plus(new Decimal(pos.currentValue));
          // Note: Prediction order cost is already deducted from USDT wallet,
          // so we add the full current value as "unrealized" asset value.
          // However, to avoid double counting 'cost' (which was USDT), we need to be careful.
          // The USDT was SPENT, so it's gone from wallets.
          // So adding currentValue here correctly represents the asset value replacing the cash.
        }
      } catch (error) {
        console.warn('Failed to fetch prediction positions for portfolio update', error);
      }

      // Update portfolio values
      portfolio.totalValue = totalValue.toString();
      portfolio.availableBalance = availableBalance.toString();
      portfolio.lockedBalance = lockedBalance.toString();
      portfolio.lastUpdatedPricesAt = new Date();

      return this.portfolioRepository.save(portfolio);
    } catch (error) {
      // Return portfolio as-is if update fails
      return portfolio;
    }
  }

  async getPortfolioSummary(userId: string) {
    const portfolio = await this.getUserPortfolio(userId);
    const wallets = await this.walletService.getUserWallets(userId);

    // Calculate asset breakdown
    const assetBreakdown = [];
    let totalValueDecimal = new Decimal(0);

    for (const wallet of wallets) {
      const balance = new Decimal(wallet.balance);

      if (balance.greaterThan(0)) {
        let usdValue = balance;

        if (wallet.currency !== 'USD' && wallet.currency !== 'USDT' && wallet.currency !== 'USDC') {
          try {
            const symbol = `${wallet.currency}USDT`;
            const ticker = await this.binanceService.getPrice(symbol);
            if (ticker && ticker.price) {
              usdValue = balance.times(new Decimal(ticker.price));
            } else {
              usdValue = new Decimal(0);
            }
          } catch (e) {
            usdValue = new Decimal(0);
          }
        }

        if (usdValue.greaterThan(0)) {
          assetBreakdown.push({
            currency: wallet.currency,
            balance: balance.toString(),
            usdValue: usdValue.toString(),
            percentage: 0, // Will be calculated after getting total
          });

          totalValueDecimal = totalValueDecimal.plus(usdValue);
        }
      }
    }

    // Calculate percentages
    assetBreakdown.forEach(asset => {
      if (totalValueDecimal.greaterThan(0)) {
        asset.percentage = +new Decimal(asset.usdValue)
          .dividedBy(totalValueDecimal)
          .times(100)
          .toFixed(2);
      }
    });

    return {
      portfolio,
      assetBreakdown,
      summary: {
        totalAssets: wallets.length,
        assetsWithBalance: assetBreakdown.length,
        totalValueUsd: totalValueDecimal.toString(),
        topAsset: assetBreakdown.length > 0 ? assetBreakdown[0].currency : null,
        diversificationScore: this.calculateDiversificationScore(assetBreakdown),
      },
    };
  }

  async getPerformanceMetrics(userId: string, period = '30d') {
    const portfolio = await this.getUserPortfolio(userId);

    // In a real implementation, you would calculate these from historical data
    // For now, returning mock performance metrics

    const mockMetrics = {
      period,
      totalReturn: new Decimal(portfolio.pnlRealized).plus(new Decimal(portfolio.pnlUnrealized)).toString(),
      totalReturnPercent: '5.25',
      realizedPnl: portfolio.pnlRealized,
      unrealizedPnl: portfolio.pnlUnrealized,
      totalTrades: portfolio.totalTrades,
      winningTrades: portfolio.winningTrades,
      losingTrades: portfolio.losingTrades,
      winRate: portfolio.totalTrades > 0
        ? +((portfolio.winningTrades / portfolio.totalTrades) * 100).toFixed(2)
        : 0,
      totalFees: portfolio.totalFeesPaid,
      sharpeRatio: '1.35', // Mock Sharpe ratio
      maxDrawdown: '-2.15', // Mock max drawdown
      averageWin: portfolio.winningTrades > 0 ? '125.50' : '0',
      averageLoss: portfolio.losingTrades > 0 ? '-85.25' : '0',
    };

    return mockMetrics;
  }

  async updateTradingStats(
    userId: string,
    isWinningTrade: boolean,
    pnlAmount: string,
    feeAmount: string,
  ) {
    const portfolio = await this.getUserPortfolio(userId);

    portfolio.totalTrades += 1;

    if (isWinningTrade) {
      portfolio.winningTrades += 1;
    } else {
      portfolio.losingTrades += 1;
    }

    portfolio.pnlRealized = new Decimal(portfolio.pnlRealized)
      .plus(new Decimal(pnlAmount))
      .toString();

    portfolio.totalFeesPaid = new Decimal(portfolio.totalFeesPaid)
      .plus(new Decimal(feeAmount))
      .toString();

    return this.portfolioRepository.save(portfolio);
  }

  async getAssetAllocation(userId: string) {
    const wallets = await this.walletService.getUserWallets(userId);
    const allocation = {
      crypto: new Decimal(0),
      stablecoins: new Decimal(0),
      stocks: new Decimal(0),
      cash: new Decimal(0),
    };

    let totalValue = new Decimal(0);

    for (const wallet of wallets) {
      const balance = new Decimal(wallet.balance);

      if (balance.greaterThan(0)) {
        let usdValue = balance;

        // Get USD value
        if (!['USD', 'USDT', 'USDC', 'DAI'].includes(wallet.currency)) {
          try {
            const symbol = `${wallet.currency}USDT`;
            const ticker = await this.binanceService.getPrice(symbol);
            if (ticker && ticker.price) {
              usdValue = balance.times(new Decimal(ticker.price));
            } else {
              continue;
            }
          } catch (e) {
            continue;
          }
        }

        // Categorize asset
        if (['USD'].includes(wallet.currency)) {
          allocation.cash = allocation.cash.plus(usdValue);
        } else if (['USDT', 'USDC', 'DAI'].includes(wallet.currency)) {
          allocation.stablecoins = allocation.stablecoins.plus(usdValue);
        } else if (['AAPL', 'GOOGL', 'MSFT', 'TSLA'].includes(wallet.currency)) {
          allocation.stocks = allocation.stocks.plus(usdValue);
        } else {
          allocation.crypto = allocation.crypto.plus(usdValue);
        }

        totalValue = totalValue.plus(usdValue);
      }
    }

    // Calculate percentages
    const result = {
      crypto: {
        value: allocation.crypto.toString(),
        percentage: totalValue.greaterThan(0)
          ? +allocation.crypto.dividedBy(totalValue).times(100).toFixed(2)
          : 0,
      },
      stablecoins: {
        value: allocation.stablecoins.toString(),
        percentage: totalValue.greaterThan(0)
          ? +allocation.stablecoins.dividedBy(totalValue).times(100).toFixed(2)
          : 0,
      },
      stocks: {
        value: allocation.stocks.toString(),
        percentage: totalValue.greaterThan(0)
          ? +allocation.stocks.dividedBy(totalValue).times(100).toFixed(2)
          : 0,
      },
      cash: {
        value: allocation.cash.toString(),
        percentage: totalValue.greaterThan(0)
          ? +allocation.cash.dividedBy(totalValue).times(100).toFixed(2)
          : 0,
      },
      totalValue: totalValue.toString(),
    };

    return result;
  }

  private calculateDiversificationScore(assetBreakdown: any[]): number {
    if (assetBreakdown.length === 0) return 0;
    if (assetBreakdown.length === 1) return 1;

    // Calculate Herfindahl-Hirschman Index for diversification
    const hhi = assetBreakdown.reduce((sum, asset) => {
      const weight = asset.percentage / 100;
      return sum + (weight * weight);
    }, 0);

    // Convert to diversification score (inverse of concentration)
    // Score ranges from 0 (completely concentrated) to 10 (well diversified)
    const maxHhi = 1; // Maximum HHI (all in one asset)
    const diversificationScore = (1 - hhi) * 10;

    return +Math.max(0, Math.min(10, diversificationScore)).toFixed(1);
  }
}