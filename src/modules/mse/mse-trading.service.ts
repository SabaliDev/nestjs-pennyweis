import { Injectable, BadRequestException } from '@nestjs/common';
import { OrderService } from '../trading/order.service';
import { WalletService } from '../wallet/wallet.service';
import { MSEService } from './mse.service';
import { OrderSide, OrderType, OrderStatus } from '../../entities/order.entity';
import Decimal from 'decimal.js-light';

@Injectable()
export class MSETradingService {
    constructor(
        private orderService: OrderService,
        private walletService: WalletService,
        private mseService: MSEService,
    ) { }

    async placeOrder(params: {
        userId: string;
        symbol: string;
        side: OrderSide;
        orderType: OrderType;
        quantity: string;
        price?: string;
    }) {
        const { userId, symbol, side, orderType, quantity, price } = params;

        // Normalize symbol (remove /MWK if present)
        const baseSymbol = symbol.split('/')[0].toUpperCase();
        const stock = this.mseService.getStock(baseSymbol);

        if (!stock) {
            throw new BadRequestException(`Invalid MSE stock symbol: ${baseSymbol}`);
        }

        const fullSymbol = `${baseSymbol}/MWK`;

        // 1. Balance Check & Locking
        await this.validateBalance(userId, fullSymbol, side, orderType, quantity, price || stock.price);

        // 2. Create Order in DB
        const order = await this.orderService.createOrder({
            userId,
            symbol: fullSymbol,
            side,
            orderType,
            quantity,
            price: orderType === OrderType.LIMIT ? price : undefined,
        });

        // 3. Status Transition to OPEN
        const updatedOrder = await this.orderService.updateOrderStatus(order.id, OrderStatus.OPEN);

        return updatedOrder;
    }

    private async validateBalance(userId: string, symbol: string, side: OrderSide, type: OrderType, qty: string, price: string) {
        const baseSymbol = symbol.split('/')[0];

        if (side === OrderSide.BUY) {
            const rate = new Decimal(price);
            const totalCost = new Decimal(qty).times(rate);

            const balance = await this.walletService.getAvailableBalance(userId, 'MWK');
            if (new Decimal(balance).lessThan(totalCost)) {
                throw new BadRequestException(`Insufficient MWK balance. Needed: ${totalCost}, Have: ${balance}`);
            }

            // Lock funds (both Market and Limit for simplicity in this simulated low-liquidity environment)
            await this.walletService.lockBalance(userId, 'MWK', totalCost.toString());
        } else {
            // Sell: Check Asset balance
            const balance = await this.walletService.getAvailableBalance(userId, baseSymbol);
            if (new Decimal(balance).lessThan(qty)) {
                throw new BadRequestException(`Insufficient ${baseSymbol} balance. Needed: ${qty}, Have: ${balance}`);
            }

            // Lock Asset
            await this.walletService.lockBalance(userId, baseSymbol, qty);
        }
    }
}
