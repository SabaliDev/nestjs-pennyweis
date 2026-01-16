import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { MSEService, MSEStock } from './mse.service';
import { OrderService } from '../trading/order.service';
import { TradeService } from '../trading/trade.service';
import { WalletService } from '../wallet/wallet.service';
import { OrderStatus, OrderSide, OrderType } from '../../entities/order.entity';
import { TransactionType } from '../../entities/wallet-transaction.entity';
import Decimal from 'decimal.js-light';

@Injectable()
export class MSEEngineService implements OnModuleInit {
    private readonly logger = new Logger(MSEEngineService.name);

    constructor(
        private mseService: MSEService,
        private orderService: OrderService,
        private tradeService: TradeService,
        private walletService: WalletService,
    ) { }

    onModuleInit() {
        this.logger.log('MSE Engine initialized. Monitoring price updates...');
        this.mseService.priceUpdate$.subscribe(async (stock) => {
            await this.processPriceUpdate(stock);
        });
    }

    private async processPriceUpdate(stock: MSEStock) {
        const symbol = `${stock.symbol}/MWK`;
        const currentPrice = new Decimal(stock.price);

        // Find all OPEN orders for this symbol
        const openOrders = await this.orderService.getActiveOrders(symbol);

        this.logger.log(`Processing ${openOrders.length} open orders for ${symbol} at price ${stock.price}`);

        for (const order of openOrders) {
            let shouldExecute = false;

            if (order.orderType === OrderType.MARKET) {
                shouldExecute = true;
            } else if (order.orderType === OrderType.LIMIT) {
                const limitPrice = new Decimal(order.price);
                if (order.side === OrderSide.BUY && limitPrice.greaterThanOrEqualTo(currentPrice)) {
                    shouldExecute = true;
                } else if (order.side === OrderSide.SELL && limitPrice.lessThanOrEqualTo(currentPrice)) {
                    shouldExecute = true;
                }
            }

            if (shouldExecute) {
                try {
                    await this.executeOrder(order.id, stock.price);
                } catch (error) {
                    this.logger.error(`Failed to execute MSE order ${order.id}: ${error.message}`);
                }
            }
        }
    }

    private async executeOrder(orderId: string, executedPrice: string) {
        const order = await this.orderService.findOrderById(orderId);
        if (!order || order.status !== OrderStatus.OPEN) return;

        this.logger.log(`Executing ${order.side} order ${order.id} for ${order.symbol} at ${executedPrice} MWK`);

        const userId = order.userId;
        const baseAsset = order.symbol.split('/')[0];
        const qty = new Decimal(order.quantity);
        const price = new Decimal(executedPrice);
        const totalValue = qty.times(price);
        const fee = totalValue.times(0.005); // 0.5% higher fee for low liquidity market

        try {
            if (order.side === OrderSide.BUY) {
                // Unlock MWK (since it was locked earlier)
                // Note: For market orders, we locked the price at placement, but executed price might differ.
                // For simplicity, we unlock what was locked and deduct actual cost.
                // Usually we'd lock a buffer for market orders.

                const lockedAmount = order.orderType === OrderType.LIMIT
                    ? new Decimal(order.price!).times(qty)
                    : new Decimal(order.quantity).times(price); // Market order locked amount (simulated)

                await this.walletService.unlockBalance(userId, 'MWK', lockedAmount.toString());

                const cost = totalValue.plus(fee);
                await this.walletService.updateBalance(userId, 'MWK', cost.negated().toString(), TransactionType.TRADE_BUY, `Buy ${order.symbol}`);
                await this.walletService.updateBalance(userId, baseAsset, qty.toString(), TransactionType.TRADE_BUY, `Bought ${order.symbol}`);
            } else {
                // Sell
                await this.walletService.unlockBalance(userId, baseAsset, qty.toString());

                const proceed = totalValue.minus(fee);
                await this.walletService.updateBalance(userId, baseAsset, qty.negated().toString(), TransactionType.TRADE_SELL, `Sell ${order.symbol}`);
                await this.walletService.updateBalance(userId, 'MWK', proceed.toString(), TransactionType.TRADE_SELL, `Sold ${order.symbol}`);
            }

            // Record Trade
            await this.tradeService.createTrade({
                buyOrderId: order.side === OrderSide.BUY ? order.id : null,
                sellOrderId: order.side === OrderSide.SELL ? order.id : null,
                symbol: order.symbol,
                price: executedPrice,
                quantity: order.quantity,
                notionalValue: totalValue.toString()
            });

            await this.orderService.updateOrderStatus(order.id, OrderStatus.FILLED);
        } catch (error) {
            this.logger.error(`Settlement failed for MSE order ${order.id}: ${error.message}`);
            await this.orderService.updateOrderStatus(order.id, OrderStatus.REJECTED);
            throw error;
        }
    }
}
