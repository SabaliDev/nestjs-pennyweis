import { Controller, Get, Post, Body, Param, UseGuards, Request, Query, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody, ApiParam } from '@nestjs/swagger';
import { MSEService } from './mse.service';
import { MSETradingService } from './mse-trading.service';
import { AuthGuard } from '@nestjs/passport';
import { OrderSide, OrderType } from '../../entities/order.entity';
import { CreateMSEOrderDto, MSEPriceUpdateDto } from './dto/mse-order.dto';

@ApiTags('Malawi Stock Exchange (MSE)')
@Controller('mse')
export class MSEController {
    constructor(
        private mseService: MSEService,
        private mseTradingService: MSETradingService,
    ) { }

    @Get('stocks')
    @ApiOperation({ summary: 'Get all MSE stocks and prices' })
    @ApiResponse({ status: 200, description: 'List of MSE stocks retrieved successfully' })
    async getAllStocks() {
        return {
            success: true,
            data: this.mseService.getAllStocks(),
            timestamp: new Date().toISOString(),
        };
    }

    @Get('stocks/:symbol')
    @ApiOperation({ summary: 'Get specific MSE stock details' })
    @ApiParam({ name: 'symbol', example: 'NBM', description: 'MSE stock symbol' })
    @ApiResponse({ status: 200, description: 'Stock details retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Stock not found' })
    async getStock(@Param('symbol') symbol: string) {
        const stock = this.mseService.getStock(symbol);
        if (!stock) {
            throw new BadRequestException(`Stock ${symbol} not found`);
        }
        return {
            success: true,
            data: stock,
        };
    }

    @Post('order')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Place a buy/sell order for MSE stocks' })
    @ApiBody({ type: CreateMSEOrderDto })
    @ApiResponse({ status: 201, description: 'Order placed successfully' })
    @ApiResponse({ status: 400, description: 'Invalid order data or insufficient balance' })
    async placeOrder(
        @Request() req,
        @Body() body: CreateMSEOrderDto
    ) {
        try {
            const order = await this.mseTradingService.placeOrder({
                userId: req.user.id,
                ...body,
            });
            return {
                success: true,
                data: order,
                message: 'Order placed successfully and is pending market execution',
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
            };
        }
    }

    @Post('admin/price-update')
    @ApiOperation({ summary: 'Update MSE stock price (Simulates real market update)' })
    @ApiBody({ type: MSEPriceUpdateDto })
    @ApiResponse({ status: 200, description: 'Price updated and related orders processed' })
    @ApiResponse({ status: 400, description: 'Invalid stock symbol or price' })
    async updatePrice(
        @Body() body: MSEPriceUpdateDto
    ) {
        try {
            const updatedStock = this.mseService.updatePrice(body.symbol, body.price);
            return {
                success: true,
                data: updatedStock,
                message: 'Price updated and orders processed',
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
            };
        }
    }
}
