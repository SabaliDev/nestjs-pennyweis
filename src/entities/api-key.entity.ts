import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

@Entity('api_keys')
export class ApiKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'key_name' })
  keyName: string;

  @Column({ name: 'api_key', unique: true })
  apiKey: string;

  @Column({ name: 'api_secret_hash' })
  apiSecretHash: string;

  @Column({ type: 'jsonb' })
  permissions: any;

  @Column({ name: 'ip_whitelist', type: 'text', array: true, nullable: true })
  ipWhitelist?: string[];

  @Column({ name: 'last_used_at', type: 'timestamp', nullable: true })
  lastUsedAt?: Date;

  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  expiresAt?: Date;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relations
  @ManyToOne('User', 'apiKeys')
  @JoinColumn({ name: 'user_id' })
  user: any;
}