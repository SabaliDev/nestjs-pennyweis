import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

export enum OAuthProviderType {
  GOOGLE = 'google',
  APPLE = 'apple',
  FACEBOOK = 'facebook',
}

@Entity('oauth_providers')
export class OAuthProvider {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({
    type: 'enum',
    enum: OAuthProviderType,
  })
  provider: OAuthProviderType;

  @Column({ name: 'provider_user_id' })
  providerUserId: string;

  @Column({ name: 'provider_email', nullable: true })
  providerEmail?: string;

  @Column({ name: 'provider_data', type: 'jsonb', nullable: true })
  providerData?: any;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne('User', 'oauthProviders')
  @JoinColumn({ name: 'user_id' })
  user: any;
}