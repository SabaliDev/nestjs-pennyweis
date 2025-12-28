import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';

export enum AssetType {
  CRYPTO = 'crypto',
  STOCK = 'stock',
  SYNTHETIC = 'synthetic',
  RWA = 'rwa',
  PREDICTION = 'prediction',
}

@Entity('assets')
export class Asset {
  @PrimaryColumn()
  symbol: string;

  @Column()
  name: string;

  @Column({
    name: 'asset_type',
    type: 'enum',
    enum: AssetType,
  })
  assetType: AssetType;

  @Column({ name: 'asset_subtype', nullable: true })
  assetSubtype?: string;

  @Column({ name: 'base_currency' })
  baseCurrency: string;

  @Column({ name: 'quote_currency' })
  quoteCurrency: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ name: 'min_order_size', type: 'decimal', precision: 18, scale: 8 })
  minOrderSize: string;

  @Column({ name: 'max_order_size', type: 'decimal', precision: 18, scale: 8, nullable: true })
  maxOrderSize?: string;

  @Column({ name: 'price_precision', type: 'int', default: 8 })
  pricePrecision: number;

  @Column({ name: 'quantity_precision', type: 'int', default: 8 })
  quantityPrecision: number;

  @Column({ name: 'maker_fee', type: 'decimal', precision: 8, scale: 6, default: 0.001 })
  makerFee: string;

  @Column({ name: 'taker_fee', type: 'decimal', precision: 8, scale: 6, default: 0.001 })
  takerFee: string;

  @Column({ name: 'is_tradable', default: true })
  isTradable: boolean;

  @Column({ name: 'is_visible', default: true })
  isVisible: boolean;

  @Column({ name: 'supported_order_types', type: 'text', array: true, default: ['market', 'limit'] })
  supportedOrderTypes: string[];

  @Column({ name: 'margin_enabled', default: false })
  marginEnabled: boolean;

  @Column({ name: 'max_leverage', type: 'decimal', precision: 8, scale: 2, default: 1 })
  maxLeverage: string;

  @Column({ nullable: true })
  blockchain?: string;

  @Column({ name: 'contract_address', nullable: true })
  contractAddress?: string;

  @Column({ name: 'token_decimals', nullable: true })
  tokenDecimals?: number;

  @Column({ name: 'data_sources', type: 'jsonb', nullable: true })
  dataSources?: any;

  @Column({ name: 'market_cap', type: 'decimal', precision: 20, scale: 2, nullable: true })
  marketCap?: string;

  @Column({ name: 'circulating_supply', type: 'decimal', precision: 20, scale: 8, nullable: true })
  circulatingSupply?: string;

  @Column({ name: 'total_supply', type: 'decimal', precision: 20, scale: 8, nullable: true })
  totalSupply?: string;

  @Column({ name: 'max_supply', type: 'decimal', precision: 20, scale: 8, nullable: true })
  maxSupply?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: any;

  @Column({ name: 'listed_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  listedAt: Date;

  @Column({ name: 'delisted_at', type: 'timestamp', nullable: true })
  delistedAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}