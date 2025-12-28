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

export enum CompetitionStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('competitions')
export class Competition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: CompetitionStatus,
    default: CompetitionStatus.PENDING,
  })
  status: CompetitionStatus;

  @Column({ name: 'start_date', type: 'timestamp' })
  startDate: Date;

  @Column({ name: 'end_date', type: 'timestamp' })
  endDate: Date;

  @Column({ name: 'initial_balance', type: 'decimal', precision: 18, scale: 8, default: 10000 })
  initialBalance: string;

  @Column({ name: 'max_participants', nullable: true })
  maxParticipants?: number;

  @Column({ name: 'entry_fee', type: 'decimal', precision: 18, scale: 8, default: 0 })
  entryFee: string;

  @Column({ name: 'prize_pool', type: 'decimal', precision: 18, scale: 8, default: 0 })
  prizePool: string;

  @Column({ name: 'allowed_assets', type: 'text', array: true, nullable: true })
  allowedAssets?: string[];

  @Column({ type: 'jsonb', nullable: true })
  rules?: any;

  @Column({ name: 'created_by' })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User;
}