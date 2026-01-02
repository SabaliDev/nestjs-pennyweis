import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Portfolio } from '../../entities/portfolio.entity';
import { UserProfile } from '../../entities/user.entity';
import Decimal from 'decimal.js-light';
import { PortfolioService } from '../portfolio/portfolio.service';

@Injectable()
export class LeaderboardService {
    constructor(
        @InjectRepository(Portfolio)
        private portfolioRepository: Repository<Portfolio>,
        @InjectRepository(UserProfile)
        private userProfileRepository: Repository<UserProfile>,
        private portfolioService: PortfolioService,
    ) { }

    async getGlobalRankings(limit = 50, offset = 0) {
        // 1. Fetch portfolios with user profiles
        // In a real app with millions of users, this would be a materialized view or cached.
        // For now, we fetch and sort in application or DB query.
        // Sorting by PnL requires: (TotalValue - InitialBalance).

        // We can do a query builder join to get necessary data
        const results = await this.portfolioRepository.createQueryBuilder('portfolio')
            .leftJoinAndSelect('portfolio.user', 'user')
            .leftJoinAndSelect('user.profile', 'profile')
            .getMany();

        // 2. Trigger update for recent activity? 
        // Ideally this is a background job. For this prototype, we assume portfolio values are reasonably up to date 
        // (from login or recent trades). To be safe, we could update on read but that's slow.
        // Let's rely on stored values but calculate PnL dynamically against initial balance.

        const rankings = results.map(portfolio => {
            // Find matching profile (relation loaded via user)
            // Note: Relation might be tricky if not set up directly on Portfolio -> User -> Profile
            // Portfolio has userId. User has Profile.

            const profile = portfolio.user?.profile;
            const initialBalance = profile ? new Decimal(profile.initialBalance) : new Decimal(1000); // Default fallback
            const currentValue = new Decimal(portfolio.totalValue);

            const pnl = currentValue.minus(initialBalance);
            const pnlPercent = initialBalance.equals(0) ? 0 : pnl.dividedBy(initialBalance).times(100);

            return {
                userId: portfolio.userId,
                username: portfolio.user?.username || 'Anonymous',
                totalValue: currentValue.toString(),
                pnl: pnl.toString(),
                pnlPercent: pnlPercent.toFixed(2),
                rank: 0, // Placeholder
            };
        });

        // 3. Sort
        rankings.sort((a, b) => parseFloat(b.pnl) - parseFloat(a.pnl));

        // 4. Assign Rank & Paginate
        const rankedWithIndex = rankings.map((r, i) => ({ ...r, rank: i + 1 }));
        const paged = rankedWithIndex.slice(offset, offset + limit);

        return {
            data: paged,
            total: rankings.length,
            limit,
            offset,
        };
    }
}
