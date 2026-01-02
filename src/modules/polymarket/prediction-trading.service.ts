import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Decimal from 'decimal.js-light';
import { PredictionOrder } from '../../entities/prediction-order.entity';
import { PolymarketService } from './polymarket.service';
import { WalletService } from '../wallet/wallet.service';
import { TransactionType } from '../../entities/wallet-transaction.entity';

@Injectable()
export class PredictionTradingService {
    constructor(
        @InjectRepository(PredictionOrder)
        private orderRepo: Repository<PredictionOrder>,
        private polymarketService: PolymarketService,
        private walletService: WalletService,
    ) { }

    async placePredictionOrder(
        userId: string,
        eventSlug: string,
        tokenId: string,
        outcome: string,
        shares: number // Raw number of shares
    ) {
        if (shares <= 0) {
            throw new BadRequestException('Shares must be positive');
        }

        // 1. Get Event & Market Data
        let event;
        try {
            event = await this.polymarketService.getEventBySlug(eventSlug);
        } catch {
            throw new NotFoundException('Event not found');
        }

        // Find the market containing this token
        const market = event.markets.find(m => m.clobTokenIds.includes(tokenId));
        if (!market) {
            throw new BadRequestException('Token ID not found in event markets');
        }

        // 2. Get Real-time Price
        const priceData = await this.polymarketService.getMarketPrice(tokenId, 'buy');
        if (!priceData || !priceData.price) {
            throw new BadRequestException('Could not fetch current market price');
        }

        const pricePerShare = new Decimal(priceData.price);
        const totalCost = pricePerShare.times(shares);

        // 3. Check & Deduct Balance (USDT)
        // Using simple deduction for now. In real trading, we might lock funds or swap.
        // Assuming 1 USDT per 1$ value for simplicity in this simulation.

        // Check balance first
        const balance = await this.walletService.getAvailableBalance(userId, 'USDT');
        if (new Decimal(balance).lessThan(totalCost)) {
            throw new BadRequestException(`Insufficient USDT balance. Cost: ${totalCost}, Available: ${balance}`);
        }

        // Deduct funds
        await this.walletService.updateBalance(
            userId,
            'USDT',
            totalCost.negated().toString(),
            TransactionType.TRADE_BUY,
            `Prediction Market Buy: ${event.title} (${outcome})`
        );

        // 4. Create Order Record
        const order = this.orderRepo.create({
            userId,
            eventId: event.id,
            eventSlug: event.slug,
            eventTitle: event.title,
            marketId: market.id,
            marketQuestion: market.question,
            tokenId,
            outcome,
            price: pricePerShare.toString(),
            shares: shares.toString(),
            totalCost: totalCost.toString(),
            status: 'open',
        });

        return this.orderRepo.save(order);
    }

    async getUserPredictionOrders(userId: string, status?: string) {
        const query = this.orderRepo.createQueryBuilder('order')
            .where('order.userId = :userId', { userId })
            .orderBy('order.createdAt', 'DESC');

        if (status) {
            query.andWhere('order.status = :status', { status });
        }

        const orders = await query.getMany();

        // Ideally we'd fetch current prices to show current value, but for list we skip for perf
        return orders;
    }

    async getUserPredictionPositions(userId: string) {
        // Get all open orders
        const orders = await this.orderRepo.find({
            where: { userId, status: 'open' },
        });

        // Group by Market (or Token)
        const positions = new Map<string, any>();

        for (const order of orders) {
            const key = order.tokenId;
            if (!positions.has(key)) {
                positions.set(key, {
                    eventTitle: order.eventTitle,
                    outcome: order.outcome,
                    shares: new Decimal(0),
                    totalCost: new Decimal(0),
                    tokenId: order.tokenId,
                });
            }

            const pos = positions.get(key);
            pos.shares = pos.shares.plus(order.shares);
            pos.totalCost = pos.totalCost.plus(order.totalCost);
        }

        // Fetch current prices and calculate P&L
        const result = [];
        for (const [tokenId, pos] of positions.entries()) {
            let currentPrice = '0';
            try {
                const data = await this.polymarketService.getMarketPrice(tokenId, 'sell'); // Price to sell
                currentPrice = data.price || '0';
            } catch (e) {
                console.warn(`Failed to fetch price for position ${tokenId}`);
            }

            const avgEntryPrice = pos.totalCost.dividedBy(pos.shares);
            const currentValue = pos.shares.times(currentPrice);
            const pnl = currentValue.minus(pos.totalCost);
            const pnlPercent = pos.totalCost.isZero() ? 0 : pnl.dividedBy(pos.totalCost).times(100);

            result.push({
                ...pos,
                shares: pos.shares.toString(),
                totalCost: pos.totalCost.toString(),
                avgEntryPrice: avgEntryPrice.toString(),
                currentPrice,
                currentValue: currentValue.toString(),
                unrealizedPnL: pnl.toString(),
                unrealizedPnLPercent: pnlPercent.toFixed(2),
            });
        }

        return result;
    }
}
