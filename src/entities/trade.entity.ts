import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Order } from './order.entity';

@Entity('trades')
export class Trade {
  @PrimaryGeneratedColumn('uuid')
  id: string;

 @Column({ name: 'buy_order_id', type: 'uuid', nullable: true })
buyOrderId: string | null;

@Column({ name: 'sell_order_id', type: 'uuid', nullable: true })
sellOrderId: string | null;


  @Column()
  symbol: string;

  @Column({ type: 'decimal', precision: 18, scale: 8 })
  price: string;

  @Column({ type: 'decimal', precision: 18, scale: 8 })
  quantity: string;

  @Column({ name: 'notional_value', type: 'decimal', precision: 18, scale: 8 })
  notionalValue: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => Order, order => order.buyTrades)
  @JoinColumn({ name: 'buy_order_id' })
  buyOrder: Order;

  @ManyToOne(() => Order, order => order.sellTrades)
  @JoinColumn({ name: 'sell_order_id' })
  sellOrder: Order;
}