import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('portfolios')
export class Portfolio {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'total_value', type: 'decimal', precision: 18, scale: 8, default: 0 })
  totalValue: string;

  @Column({ name: 'available_balance', type: 'decimal', precision: 18, scale: 8, default: 0 })
  availableBalance: string;

  @Column({ name: 'locked_balance', type: 'decimal', precision: 18, scale: 8, default: 0 })
  lockedBalance: string;

  @Column({ name: 'pnl_realized', type: 'decimal', precision: 18, scale: 8, default: 0 })
  pnlRealized: string;

  @Column({ name: 'pnl_unrealized', type: 'decimal', precision: 18, scale: 8, default: 0 })
  pnlUnrealized: string;

  @Column({ name: 'total_trades', type: 'int', default: 0 })
  totalTrades: number;

  @Column({ name: 'winning_trades', type: 'int', default: 0 })
  winningTrades: number;

  @Column({ name: 'losing_trades', type: 'int', default: 0 })
  losingTrades: number;

  @Column({ name: 'total_fees_paid', type: 'decimal', precision: 18, scale: 8, default: 0 })
  totalFeesPaid: string;

  @Column({ name: 'last_updated_prices_at', type: 'timestamp', nullable: true })
  lastUpdatedPricesAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;
}