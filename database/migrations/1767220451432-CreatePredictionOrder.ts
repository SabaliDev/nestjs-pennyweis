import { MigrationInterface, QueryRunner } from "typeorm";

export class CreatePredictionOrder1767220451432 implements MigrationInterface {
    name = 'CreatePredictionOrder1767220451432'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."prediction_orders_status_enum" AS ENUM('open', 'won', 'lost', 'cancelled')`);
        await queryRunner.query(`CREATE TABLE "prediction_orders" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" character varying NOT NULL, "eventId" character varying NOT NULL, "eventSlug" character varying NOT NULL, "eventTitle" character varying NOT NULL, "marketId" character varying NOT NULL, "marketQuestion" character varying NOT NULL, "tokenId" character varying NOT NULL, "outcome" character varying NOT NULL, "price" numeric(18,8) NOT NULL, "shares" numeric(18,8) NOT NULL, "totalCost" numeric(18,8) NOT NULL, "status" "public"."prediction_orders_status_enum" NOT NULL DEFAULT 'open', "payout" numeric(18,8), "resolvedAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_5f539887936861e6b49b2b7ee1b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "assets" ALTER COLUMN "maker_fee" SET DEFAULT '0.001'`);
        await queryRunner.query(`ALTER TABLE "assets" ALTER COLUMN "taker_fee" SET DEFAULT '0.001'`);
        await queryRunner.query(`ALTER TABLE "trading_pairs" ALTER COLUMN "price_tick_size" SET DEFAULT '0.01'`);
        await queryRunner.query(`ALTER TABLE "trading_pairs" ALTER COLUMN "quantity_step_size" SET DEFAULT '0.0001'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "trading_pairs" ALTER COLUMN "quantity_step_size" SET DEFAULT 0.0001`);
        await queryRunner.query(`ALTER TABLE "trading_pairs" ALTER COLUMN "price_tick_size" SET DEFAULT 0.01`);
        await queryRunner.query(`ALTER TABLE "assets" ALTER COLUMN "taker_fee" SET DEFAULT 0.001`);
        await queryRunner.query(`ALTER TABLE "assets" ALTER COLUMN "maker_fee" SET DEFAULT 0.001`);
        await queryRunner.query(`DROP TABLE "prediction_orders"`);
        await queryRunner.query(`DROP TYPE "public"."prediction_orders_status_enum"`);
    }

}
