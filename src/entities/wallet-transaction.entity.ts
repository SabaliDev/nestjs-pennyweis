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
import { Wallet } from './wallet.entity';

export enum TransactionType {
  INITIAL_DEPOSIT = 'initial_deposit',
  TRADE_BUY = 'trade_buy',
  TRADE_SELL = 'trade_sell',
  FEE_PAID = 'fee_paid',
  FEE_REFUND = 'fee_refund',
  BONUS = 'bonus',
  ADJUSTMENT = 'adjustment',
}

export enum ReferenceType {
  ORDER = 'order',
  TRADE = 'trade',
  MANUAL = 'manual',
}

@Entity('wallet_transactions')
export class WalletTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'wallet_id' })
  walletId: string;

  @Column()
  currency: string;

  @Column({
    name: 'transaction_type',
    type: 'enum',
    enum: TransactionType,
  })
  transactionType: TransactionType;

  @Column({ type: 'decimal', precision: 18, scale: 8 })
  amount: string;

  @Column({ name: 'balance_before', type: 'decimal', precision: 18, scale: 8 })
  balanceBefore: string;

  @Column({ name: 'balance_after', type: 'decimal', precision: 18, scale: 8 })
  balanceAfter: string;

  @Column({ name: 'reference_id', nullable: true })
  referenceId?: string;

  @Column({
    name: 'reference_type',
    type: 'enum',
    enum: ReferenceType,
    nullable: true,
  })
  referenceType?: ReferenceType;

  @Column({ nullable: true })
  description?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: any;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Wallet, wallet => wallet.transactions)
  @JoinColumn({ name: 'wallet_id' })
  wallet: Wallet;
}