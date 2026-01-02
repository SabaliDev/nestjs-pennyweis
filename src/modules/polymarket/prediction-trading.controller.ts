import { Controller, Post, Get, Body, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody, ApiQuery } from '@nestjs/swagger';
import { PredictionTradingService } from './prediction-trading.service';

import { IsString, IsNumber, Min } from 'class-validator';

class CreatePredictionOrderDto {
    @IsString()
    eventSlug: string;

    @IsString()
    tokenId: string;

    @IsString()
    outcome: string;

    @IsNumber()
    @Min(0.00000001)
    shares: number;
}

@ApiTags('Polymarket Trading')
@Controller('polymarket/trade')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class PredictionTradingController {
    constructor(private readonly predictionService: PredictionTradingService) { }

    @Post('order')
    @ApiOperation({ summary: 'Place a prediction market order' })
    @ApiBody({ type: CreatePredictionOrderDto })
    async placeOrder(@Request() req, @Body() body: CreatePredictionOrderDto) {
        const order = await this.predictionService.placePredictionOrder(
            req.user.id,
            body.eventSlug,
            body.tokenId,
            body.outcome,
            body.shares,
        );

        return {
            success: true,
            message: 'Order placed successfully',
            data: order,
        };
    }

    @Get('orders')
    @ApiOperation({ summary: 'Get user prediction orders' })
    @ApiQuery({ name: 'status', required: false })
    async getOrders(@Request() req, @Query('status') status?: string) {
        const orders = await this.predictionService.getUserPredictionOrders(req.user.id, status);
        return {
            success: true,
            data: orders,
        };
    }

    @Get('positions')
    @ApiOperation({ summary: 'Get active prediction positions with P&L' })
    async getPositions(@Request() req) {
        const positions = await this.predictionService.getUserPredictionPositions(req.user.id);
        return {
            success: true,
            data: positions,
        };
    }
}
