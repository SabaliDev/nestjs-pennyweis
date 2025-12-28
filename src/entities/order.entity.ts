import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Trade } from './trade.entity';

export enum OrderSide {
  BUY = 'buy',
  SELL = 'sell',
}

export enum OrderType {
  MARKET = 'market',
  LIMIT = 'limit',
}

export enum OrderStatus {
  NEW = 'new',
  OPEN = 'open',
  PARTIALLY_FILLED = 'partially_filled',
  FILLED = 'filled',
  CANCELLED = 'cancelled',
  REJECTED = 'rejected',
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column()
  symbol: string;

  @Column({
    type: 'enum',
    enum: OrderSide,
  })
  side: OrderSide;

  @Column({
    name: 'order_type',
    type: 'enum',
    enum: OrderType,
  })
  orderType: OrderType;

  @Column({ type: 'decimal', precision: 18, scale: 8, nullable: true })
  price?: string;

  @Column({ type: 'decimal', precision: 18, scale: 8 })
  quantity: string;

  @Column({ name: 'filled_quantity', type: 'decimal', precision: 18, scale: 8, default: 0 })
  filledQuantity: string;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.NEW,
  })
  status: OrderStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne('User', 'orders')
  @JoinColumn({ name: 'user_id' })
  user: any;

  @OneToMany(() => Trade, trade => trade.buyOrder)
  buyTrades: Trade[];

  @OneToMany(() => Trade, trade => trade.sellOrder)
  sellTrades: Trade[];
}