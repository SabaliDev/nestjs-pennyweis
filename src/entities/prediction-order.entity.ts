import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('prediction_orders')
export class PredictionOrder {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    userId: string;

    @Column()
    eventId: string; // Polymarket event ID

    @Column()
    eventSlug: string; // For easy reference

    @Column()
    eventTitle: string; // Cache for display

    @Column()
    marketId: string; // Polymarket market ID

    @Column()
    marketQuestion: string; // Cache for display

    @Column()
    tokenId: string; // Polymarket token ID (outcome)

    @Column()
    outcome: string; // "Yes" or "No" (or other outcomes)

    @Column({ type: 'decimal', precision: 18, scale: 8 })
    price: string; // Price paid per share (e.g., "0.65")

    @Column({ type: 'decimal', precision: 18, scale: 8 })
    shares: string; // Number of shares purchased

    @Column({ type: 'decimal', precision: 18, scale: 8 })
    totalCost: string; // shares * price

    @Column({
        type: 'enum',
        enum: ['open', 'won', 'lost', 'cancelled'],
        default: 'open'
    })
    status: string;

    @Column({ type: 'decimal', precision: 18, scale: 8, nullable: true })
    payout: string; // Set when market resolves

    @Column({ type: 'timestamp', nullable: true })
    resolvedAt: Date;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
