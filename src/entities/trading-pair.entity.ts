import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Asset, AssetType } from './asset.entity';

@Entity('trading_pairs')
export class TradingPair {
  @PrimaryColumn()
  symbol: string;

  @Column({ name: 'base_asset' })
  baseAsset: string;

  @Column({ name: 'quote_asset' })
  quoteAsset: string;

  @Column({
    name: 'asset_type',
    type: 'enum',
    enum: AssetType,
  })
  assetType: AssetType;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'min_notional', type: 'decimal', precision: 18, scale: 8, default: 10 })
  minNotional: string;

  @Column({ name: 'max_notional', type: 'decimal', precision: 18, scale: 8, nullable: true })
  maxNotional?: string;

  @Column({ name: 'price_tick_size', type: 'decimal', precision: 18, scale: 8, default: 0.01 })
  priceTickSize: string;

  @Column({ name: 'quantity_step_size', type: 'decimal', precision: 18, scale: 8, default: 0.0001 })
  quantityStepSize: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Asset)
  @JoinColumn({ name: 'base_asset', referencedColumnName: 'symbol' })
  baseAssetEntity: Asset;

  @ManyToOne(() => Asset)
  @JoinColumn({ name: 'quote_asset', referencedColumnName: 'symbol' })
  quoteAssetEntity: Asset;
}