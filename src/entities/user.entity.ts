import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  OneToOne,
  JoinColumn,
} from 'typeorm';

export enum UserStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  CLOSED = 'closed',
  PENDING_VERIFICATION = 'pending_verification',
}

export enum KycStatus {
  UNVERIFIED = 'unverified',
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
}

export enum RiskTolerance {
  CONSERVATIVE = 'conservative',
  MODERATE = 'moderate',
  AGGRESSIVE = 'aggressive',
}

export enum TradingExperience {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 255 })
  email: string;

  @Column({ unique: true, length: 50 })
  username: string;

  @Column({ name: 'password_hash', nullable: true, length: 255 })
  passwordHash?: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: UserStatus.PENDING_VERIFICATION,
  })
  status: UserStatus;

  @Column({ name: 'email_verified', default: false })
  emailVerified: boolean;

  @Column({
    name: 'kyc_status',
    type: 'varchar',
    length: 20,
    default: KycStatus.UNVERIFIED,
  })
  kycStatus: KycStatus;

  @Column({ name: 'two_factor_enabled', default: false })
  twoFactorEnabled: boolean;

  @Column({ name: 'two_factor_secret', type: 'text', nullable: true })
  twoFactorSecret?: string;

  @Column({ name: 'last_login_at', type: 'timestamptz', nullable: true })
  lastLoginAt?: Date;

  @Column({ name: 'last_login_ip', type: 'inet', nullable: true })
  lastLoginIp?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  // Relations
  @OneToMany('Wallet', 'user')
  wallets: any[];

  @OneToMany('Order', 'user')
  orders: any[];

  @OneToMany('ApiKey', 'user')
  apiKeys: any[];

  @OneToMany('UserSession', 'user')
  sessions: any[];

  @OneToMany('OAuthProvider', 'user')
  oauthProviders: any[];

  @OneToOne('UserProfile', 'user', { cascade: true })
  profile?: any;
}

@Entity('user_profiles')
export class UserProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'full_name', nullable: true })
  fullName?: string;

  @Column({ name: 'avatar_url', nullable: true })
  avatarUrl?: string;

  @Column({ nullable: true })
  bio?: string;

  @Column({ nullable: true })
  country?: string;

  @Column({ default: 'UTC' })
  timezone: string;

  @Column({ name: 'preferred_quote_currency', default: 'USDT' })
  preferredQuoteCurrency: string;

  @Column({ name: 'initial_balance', type: 'decimal', precision: 18, scale: 8, default: 1000 })
  initialBalance: string;

  @Column({
    name: 'risk_tolerance',
    type: 'enum',
    enum: RiskTolerance,
    nullable: true,
  })
  riskTolerance?: RiskTolerance;

  @Column({
    name: 'trading_experience',
    type: 'enum',
    enum: TradingExperience,
    nullable: true,
  })
  tradingExperience?: TradingExperience;

  @Column({
    name: 'notification_preferences',
    type: 'jsonb',
    nullable: true,
  })
  notificationPreferences?: any;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @OneToOne('User', 'profile')
  @JoinColumn({ name: 'user_id' })
  user: any;
}