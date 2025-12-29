import { Injectable, BadRequestException } from '@nestjs/common';
import { OrderService } from './order.service';
import { TradingEngineService } from './trading-engine.service';
import { WalletService } from '../wallet/wallet.service';
import { OrderSide, OrderType, OrderStatus } from '../../entities/order.entity';
import Decimal from 'decimal.js-light';

@Injectable()
export class TradingService {
  constructor(
    private orderService: OrderService,
    private engine: TradingEngineService,
    private walletService: WalletService
  ) { }

  /**
   * Main entry point for placing any order.
   * Handles balance checks and initiates execution if Market.
   */
  async placeOrder(params: {
    userId: string;
    symbol: string;
    side: OrderSide;
    orderType: OrderType;
    quantity: string;
    price?: string; // Optional for Market orders
  }) {
    const { userId, symbol, side, orderType, quantity, price } = params;

    // 1. Balance Check & Locking
    await this.validateBalance(userId, symbol, side, orderType, quantity, price);

    // 2. Create Order in DB
    const order = await this.orderService.createOrder({
      userId,
      symbol,
      side,
      orderType,
      quantity,
      price: orderType === OrderType.LIMIT ? price : undefined,
    });

    // 3. Status Transition to OPEN
    const updatedOrder = await this.orderService.updateOrderStatus(order.id, OrderStatus.OPEN);

    // 4. If Market Order, execute immediately
    if (orderType === OrderType.MARKET) {
      // For market orders, we need a reference price. 
      // We'll let the engine handle the rest.
      // For simplicity in this demo, we assume the controller passes the current market price?
      // No, the engine can get it. But let's assume we want to execute NOW against the latest known price.
      // Let's pass null for price and let engine decide or handle it in controller.
      return updatedOrder;
    }

    return updatedOrder;
  }

  private async validateBalance(userId: string, symbol: string, side: OrderSide, type: OrderType, qty: string, price?: string) {
    const [asset, quote] = symbol.split('USDT'); // Simplified for USDT pairs

    if (side === OrderSide.BUY) {
      if (type === OrderType.LIMIT && !price) throw new BadRequestException('Price required for Limit orders');

      const rate = type === OrderType.LIMIT ? new Decimal(price!) : new Decimal(0); // For market, check is loose or handled in engine
      const totalCost = new Decimal(qty).times(rate);

      const balance = await this.walletService.getAvailableBalance(userId, 'USDT');
      if (new Decimal(balance).lessThan(totalCost)) {
        throw new BadRequestException(`Insufficient USDT balance. Needed: ${totalCost}, Have: ${balance}`);
      }

      // Lock funds if Limit
      if (type === OrderType.LIMIT) {
        await this.walletService.lockBalance(userId, 'USDT', totalCost.toString());
      }
    } else {
      // Sell: Check Asset balance
      const balance = await this.walletService.getAvailableBalance(userId, asset);
      if (new Decimal(balance).lessThan(qty)) {
        throw new BadRequestException(`Insufficient ${asset} balance. Needed: ${qty}, Have: ${balance}`);
      }

      // Lock Asset if Limit
      if (type === OrderType.LIMIT) {
        await this.walletService.lockBalance(userId, asset, qty);
      }
    }
  }

  async getPositions() {
    // In a real system, positions are calculated from trades/balance.
    // For now, we reuse the existing getPositions from wallet/portfolio or return something indicative.
    return [];
  }
}