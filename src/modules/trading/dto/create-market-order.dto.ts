import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsEnum } from 'class-validator';
import { OrderSide } from '../../../entities/order.entity';

export class CreateMarketOrderDto {
    @ApiProperty({ description: 'Trading pair, e.g. BTC/USDT', example: 'BTC/USDT' })
    @IsString()
    pair: string;

    @ApiProperty({ description: 'Order side', enum: OrderSide, example: 'buy' })
    @IsEnum(OrderSide)
    side: OrderSide;

    @ApiProperty({ description: 'Quantity to buy/sell', example: 0.001 })
    @IsNumber()
    size: number;
}
