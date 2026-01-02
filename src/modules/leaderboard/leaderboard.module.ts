import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeaderboardController } from './leaderboard.controller';
import { LeaderboardService } from './leaderboard.service';
import { Portfolio } from '../../entities/portfolio.entity';
import { UserProfile } from '../../entities/user.entity';
import { PortfolioModule } from '../portfolio/portfolio.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Portfolio, UserProfile]),
        PortfolioModule,
    ],
    controllers: [LeaderboardController],
    providers: [LeaderboardService],
})
export class LeaderboardModule { }
