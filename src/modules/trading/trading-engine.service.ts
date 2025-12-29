import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { BinanceWsService } from '../binance/binance.ws.service';
import { OrderService } from './order.service';
import { TradeService } from './trade.service';
import { WalletService } from '../wallet/wallet.service';
import { OrderStatus, OrderSide, OrderType } from '../../entities/order.entity';
import { TransactionType } from '../../entities/wallet-transaction.entity';
import Decimal from 'decimal.js-light';
import { PAIRS } from './pairs.constant';

@Injectable()
export class TradingEngineService implements OnModuleInit {
    private readonly logger = new Logger(TradingEngineService.name);

    constructor(
        private binanceWs: BinanceWsService,
        private orderService: OrderService,
        private tradeService: TradeService,
        private walletService: WalletService
    ) { }

    onModuleInit() {
        this.logger.log('Trading Engine initialized. Monitoring prices for order matching...');
        this.subscribeToPrices();
    }

    private subscribeToPrices() {
        // Monitor standard trade streams for price updates
        this.binanceWs.tradeStream$.subscribe(async (trade) => {
            await this.processPriceTick(trade.s, parseFloat(trade.p));
        });
    }

    /**
     * Called whenever a new price comes in for a symbol.
     * Matches OPEN limit and stop orders.
     */
    private async processPriceTick(symbol: string, currentPrice: number) {
        // Find open orders for this symbol
        const openOrders = await this.orderService.getActiveOrders(symbol);

        for (const order of openOrders) {
            let shouldExecute = false;

            if (order.orderType === OrderType.LIMIT) {
                const limitPrice = new Decimal(order.price);
                if (order.side === OrderSide.BUY && limitPrice.greaterThanOrEqualTo(currentPrice)) {
                    shouldExecute = true;
                } else if (order.side === OrderSide.SELL && limitPrice.lessThanOrEqualTo(currentPrice)) {
                    shouldExecute = true;
                }
            }
            // Stop orders would have trigger logic here... (Simplified for now)

            if (shouldExecute) {
                try {
                    await this.executeOrder(order.id, currentPrice);
                } catch (error) {
                    this.logger.error(`Failed to automatic fill order ${order.id}`, error);
                }
            }
        }
    }

    /**
     * Executes an order at a specific price.
     * Handles wallet updates and trade recording.
     */
    async executeOrder(orderId: string, basePrice: number, isMarket = false) {
        const order = await this.orderService.findOrderById(orderId);

        if (order.status !== OrderStatus.OPEN && order.status !== OrderStatus.NEW) {
            return;
        }

        // 1. Simulate Slippage for realism (only for market orders)
        let executedPrice = basePrice;
        if (isMarket) {
            const slippageScale = 0.001; // 0.1% max slippage
            const randomSlippage = (Math.random() * 2 - 1) * slippageScale;
            executedPrice = basePrice * (1 + randomSlippage);
        }

        this.logger.log(`Executing ${order.side} order ${order.id} for ${order.symbol} at ${executedPrice}`);

        const userId = order.userId;
        const [asset, quote] = order.symbol.split('USDT'); // Assuming USDT pairs for now
        const currencyPair = { asset, quote: 'USDT' };

        // 2. Settlement Logic
        try {
            const quantity = new Decimal(order.quantity);
            const price = new Decimal(executedPrice);
            const totalValue = quantity.times(price);
            const fee = totalValue.times(0.001); // 0.1% fee

            if (order.side === OrderSide.BUY) {
                // Deduct USDT (Quote), Add Asset (Base)
                const cost = totalValue.plus(fee);

                // If it was a limit order, it was already locked
                if (order.orderType === OrderType.LIMIT) {
                    await this.walletService.unlockBalance(userId, 'USDT', totalValue.toString());
                }

                try {
                    await this.walletService.updateBalance(userId, 'USDT', cost.negated().toString(), TransactionType.TRADE_BUY, `Buy ${order.symbol}`);
                } catch (e) {
                    if (e instanceof BadRequestException) {
                        const balance = await this.walletService.getAvailableBalance(userId, 'USDT');
                        throw new BadRequestException(`Insufficient USDT balance for ${order.symbol} buy. Required (inc. fee): ${cost.toFixed(2)}, Available: ${balance}`);
                    }
                    throw e;
                }
                await this.walletService.updateBalance(userId, asset, quantity.toString(), TransactionType.TRADE_BUY, `Bought ${order.symbol}`);
            } else {
                // Deduct Asset, Add USDT
                const proceed = totalValue.minus(fee);

                if (order.orderType === OrderType.LIMIT) {
                    await this.walletService.unlockBalance(userId, asset, quantity.toString());
                }

                try {
                    await this.walletService.updateBalance(userId, asset, quantity.negated().toString(), TransactionType.TRADE_SELL, `Sell ${order.symbol}`);
                } catch (e) {
                    if (e instanceof BadRequestException) {
                        const balance = await this.walletService.getAvailableBalance(userId, asset);
                        throw new BadRequestException(`Insufficient ${asset} balance for ${order.symbol} sell. Required: ${quantity.toString()}, Available: ${balance}`);
                    }
                    throw e;
                }
                await this.walletService.updateBalance(userId, 'USDT', proceed.toString(), TransactionType.TRADE_SELL, `Sold ${order.symbol}`);
            }

            // 3. Record Trade and Update Order
            await this.tradeService.createTrade({
                buyOrderId: order.side === OrderSide.BUY ? order.id : null,
                sellOrderId: order.side === OrderSide.SELL ? order.id : null,
                symbol: order.symbol,
                price: executedPrice.toString(),
                quantity: order.quantity,
                notionalValue: totalValue.toString()
            });

            await this.orderService.updateOrderStatus(order.id, OrderStatus.FILLED);

            return { success: true, executedPrice, orderId: order.id };
        } catch (error) {
            this.logger.error(`Settlement failed for order ${order.id}: ${error.message}`);
            // Fix: Transition to REJECTED is now allowed from OPEN
            await this.orderService.updateOrderStatus(order.id, OrderStatus.REJECTED).catch(e => {
                this.logger.error(`Failed to reject order ${order.id} after settlement failure: ${e.message}`);
            });
            throw error;
        }
    }
}
