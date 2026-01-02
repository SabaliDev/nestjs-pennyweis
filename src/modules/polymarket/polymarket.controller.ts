import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiParam } from '@nestjs/swagger';
import { PolymarketService } from './polymarket.service';

@ApiTags('Polymarket Data')
@Controller('polymarket')
export class PolymarketController {
    constructor(private readonly polymarketService: PolymarketService) { }

    @Get('events')
    @ApiOperation({ summary: 'List active prediction markets' })
    @ApiQuery({ name: 'limit', required: false })
    @ApiQuery({ name: 'offset', required: false })
    async getEvents(
        @Query('limit') limit?: number,
        @Query('offset') offset?: number
    ) {
        return this.polymarketService.getActiveEvents(limit, offset);
    }

    @Get('events/:slug')
    @ApiOperation({ summary: 'Get specific event details' })
    async getEvent(@Param('slug') slug: string) {
        return this.polymarketService.getEventBySlug(slug);
    }

    @Get('market/:tokenId/price')
    @ApiOperation({ summary: 'Get current price for an outcome' })
    @ApiQuery({ name: 'side', required: false, enum: ['buy', 'sell'] })
    async getPrice(
        @Param('tokenId') tokenId: string,
        @Query('side') side: 'buy' | 'sell' = 'buy'
    ) {
        return this.polymarketService.getMarketPrice(tokenId, side);
    }

    @Get('market/:tokenId/orderbook')
    @ApiOperation({ summary: 'Get orderbook depth for a market' })
    async getOrderbook(@Param('tokenId') tokenId: string) {
        return this.polymarketService.getMarketOrderbook(tokenId);
    }
}
