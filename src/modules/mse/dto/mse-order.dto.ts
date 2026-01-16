import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional } from 'class-validator';
import { OrderSide, OrderType } from '../../../entities/order.entity';

export class CreateMSEOrderDto {
    @ApiProperty({ description: 'MSE stock symbol', example: 'NBM' })
    @IsString()
    symbol: string;

    @ApiProperty({ description: 'Order side (buy/sell)', enum: OrderSide, example: 'buy' })
    @IsEnum(OrderSide)
    side: OrderSide;

    @ApiProperty({ description: 'Order type (market/limit)', enum: OrderType, example: 'limit' })
    @IsEnum(OrderType)
    orderType: OrderType;

    @ApiProperty({ description: 'Quantity of stocks', example: '10' })
    @IsString()
    quantity: string;

    @ApiProperty({ description: 'Limit price per stock (required for limit orders)', example: '2150.00', required: false })
    @IsString()
    @IsOptional()
    price?: string;
}

export class MSEPriceUpdateDto {
    @ApiProperty({ description: 'MSE stock symbol', example: 'NBM' })
    @IsString()
    symbol: string;

    @ApiProperty({ description: 'New market price', example: '2120.00' })
    @IsString()
    price: string;
}
