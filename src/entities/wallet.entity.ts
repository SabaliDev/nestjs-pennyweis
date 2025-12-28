import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { WalletTransaction } from './wallet-transaction.entity';

@Entity('virtual_wallets')
export class Wallet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ length: 20 })
  currency: string;

  @Column({ type: 'numeric', precision: 30, scale: 18, default: 0 })
  balance: string;

  @Column({ name: 'locked_balance', type: 'numeric', precision: 30, scale: 18, default: 0 })
  lockedBalance: string;

  @Column({ name: 'available_balance', type: 'numeric', precision: 30, scale: 18, generatedType: 'STORED', asExpression: '(balance - locked_balance)' })
  availableBalance?: string;

  @Column({ name: 'total_deposited', type: 'numeric', precision: 30, scale: 18, default: 0 })
  totalDeposited: string;

  @Column({ name: 'total_withdrawn', type: 'numeric', precision: 30, scale: 18, default: 0 })
  totalWithdrawn: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'last_updated', type: 'timestamptz' })
  lastUpdated: Date;

  // Relations
  @ManyToOne('User', 'wallets')
  @JoinColumn({ name: 'user_id' })
  user: any;

  @OneToMany(() => WalletTransaction, transaction => transaction.wallet)
  transactions: WalletTransaction[];
}