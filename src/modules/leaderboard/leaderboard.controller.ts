import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { LeaderboardService } from './leaderboard.service';

@ApiTags('Leaderboard')
@Controller('leaderboard')
export class LeaderboardController {
    constructor(private readonly leaderboardService: LeaderboardService) { }

    @Get()
    @ApiOperation({ summary: 'Get global rankings based on Overall PnL' })
    @ApiQuery({ name: 'limit', required: false })
    @ApiQuery({ name: 'offset', required: false })
    async getRankings(
        @Query('limit') limit?: number,
        @Query('offset') offset?: number,
    ) {
        return this.leaderboardService.getGlobalRankings(
            limit ? Number(limit) : 50,
            offset ? Number(offset) : 0
        );
    }
}
