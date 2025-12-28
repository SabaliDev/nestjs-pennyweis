import { MigrationInterface, QueryRunner } from "typeorm";

export class Initial1764704648655 implements MigrationInterface {
    name = 'Initial1764704648655'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying(255) NOT NULL, "username" character varying(50) NOT NULL, "password_hash" character varying(255), "status" character varying(20) NOT NULL DEFAULT 'pending_verification', "email_verified" boolean NOT NULL DEFAULT false, "kyc_status" character varying(20) NOT NULL DEFAULT 'unverified', "two_factor_enabled" boolean NOT NULL DEFAULT false, "two_factor_secret" text, "last_login_at" TIMESTAMP WITH TIME ZONE, "last_login_ip" inet, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "UQ_fe0bb3f6520ee0469504521e710" UNIQUE ("username"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."user_profiles_risk_tolerance_enum" AS ENUM('conservative', 'moderate', 'aggressive')`);
        await queryRunner.query(`CREATE TYPE "public"."user_profiles_trading_experience_enum" AS ENUM('beginner', 'intermediate', 'advanced', 'expert')`);
        await queryRunner.query(`CREATE TABLE "user_profiles" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "full_name" character varying, "avatar_url" character varying, "bio" character varying, "country" character varying, "timezone" character varying NOT NULL DEFAULT 'UTC', "preferred_quote_currency" character varying NOT NULL DEFAULT 'USDT', "initial_balance" numeric(18,8) NOT NULL DEFAULT '1000', "risk_tolerance" "public"."user_profiles_risk_tolerance_enum", "trading_experience" "public"."user_profiles_trading_experience_enum", "notification_preferences" jsonb, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "REL_6ca9503d77ae39b4b5a6cc3ba8" UNIQUE ("user_id"), CONSTRAINT "PK_1ec6662219f4605723f1e41b6cb" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."wallet_transactions_transaction_type_enum" AS ENUM('initial_deposit', 'trade_buy', 'trade_sell', 'fee_paid', 'fee_refund', 'bonus', 'adjustment')`);
        await queryRunner.query(`CREATE TYPE "public"."wallet_transactions_reference_type_enum" AS ENUM('order', 'trade', 'manual')`);
        await queryRunner.query(`CREATE TABLE "wallet_transactions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "wallet_id" uuid NOT NULL, "currency" character varying NOT NULL, "transaction_type" "public"."wallet_transactions_transaction_type_enum" NOT NULL, "amount" numeric(18,8) NOT NULL, "balance_before" numeric(18,8) NOT NULL, "balance_after" numeric(18,8) NOT NULL, "reference_id" character varying, "reference_type" "public"."wallet_transactions_reference_type_enum", "description" character varying, "metadata" jsonb, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_5120f131bde2cda940ec1a621db" PRIMARY KEY ("id"))`);
        await queryRunner.query(`INSERT INTO "public"."typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES ($1, $2, $3, $4, $5, $6)`, ["pennyweis_db","public","virtual_wallets","GENERATED_COLUMN","available_balance","(balance - locked_balance)"]);
        await queryRunner.query(`CREATE TABLE "virtual_wallets" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "currency" character varying(20) NOT NULL, "balance" numeric(30,18) NOT NULL DEFAULT '0', "locked_balance" numeric(30,18) NOT NULL DEFAULT '0', "available_balance" numeric(30,18) GENERATED ALWAYS AS ((balance - locked_balance)) STORED NOT NULL, "total_deposited" numeric(30,18) NOT NULL DEFAULT '0', "total_withdrawn" numeric(30,18) NOT NULL DEFAULT '0', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "last_updated" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_b0a57cc465ace45066d1cfdbe69" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "user_sessions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "refresh_token_hash" character varying NOT NULL, "deviceInfo" jsonb, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "user_id" uuid, CONSTRAINT "PK_e93e031a5fed190d4789b6bfd83" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."assets_asset_type_enum" AS ENUM('crypto', 'stock', 'synthetic', 'rwa', 'prediction')`);
        await queryRunner.query(`CREATE TABLE "assets" ("symbol" character varying NOT NULL, "name" character varying NOT NULL, "asset_type" "public"."assets_asset_type_enum" NOT NULL, "asset_subtype" character varying, "base_currency" character varying NOT NULL, "quote_currency" character varying NOT NULL, "description" character varying, "min_order_size" numeric(18,8) NOT NULL, "max_order_size" numeric(18,8), "price_precision" integer NOT NULL DEFAULT '8', "quantity_precision" integer NOT NULL DEFAULT '8', "maker_fee" numeric(8,6) NOT NULL DEFAULT '0.001', "taker_fee" numeric(8,6) NOT NULL DEFAULT '0.001', "is_tradable" boolean NOT NULL DEFAULT true, "is_visible" boolean NOT NULL DEFAULT true, "supported_order_types" text array NOT NULL DEFAULT '{market,limit}', "margin_enabled" boolean NOT NULL DEFAULT false, "max_leverage" numeric(8,2) NOT NULL DEFAULT '1', "blockchain" character varying, "contract_address" character varying, "token_decimals" integer, "data_sources" jsonb, "market_cap" numeric(20,2), "circulating_supply" numeric(20,8), "total_supply" numeric(20,8), "max_supply" numeric(20,8), "metadata" jsonb, "listed_at" TIMESTAMP NOT NULL DEFAULT now(), "delisted_at" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_9b4bd5b9c6fe49cd3b4342fb914" PRIMARY KEY ("symbol"))`);
        await queryRunner.query(`CREATE TYPE "public"."trading_pairs_asset_type_enum" AS ENUM('crypto', 'stock', 'synthetic', 'rwa', 'prediction')`);
        await queryRunner.query(`CREATE TABLE "trading_pairs" ("symbol" character varying NOT NULL, "base_asset" character varying NOT NULL, "quote_asset" character varying NOT NULL, "asset_type" "public"."trading_pairs_asset_type_enum" NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "min_notional" numeric(18,8) NOT NULL DEFAULT '10', "max_notional" numeric(18,8), "price_tick_size" numeric(18,8) NOT NULL DEFAULT '0.01', "quantity_step_size" numeric(18,8) NOT NULL DEFAULT '0.0001', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_8ba0a80bf6a96499c7cf40c4798" PRIMARY KEY ("symbol"))`);
        await queryRunner.query(`CREATE TYPE "public"."orders_side_enum" AS ENUM('buy', 'sell')`);
        await queryRunner.query(`CREATE TYPE "public"."orders_order_type_enum" AS ENUM('market', 'limit')`);
        await queryRunner.query(`CREATE TYPE "public"."orders_status_enum" AS ENUM('new', 'open', 'partially_filled', 'filled', 'cancelled', 'rejected')`);
        await queryRunner.query(`CREATE TABLE "orders" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "symbol" character varying NOT NULL, "side" "public"."orders_side_enum" NOT NULL, "order_type" "public"."orders_order_type_enum" NOT NULL, "price" numeric(18,8), "quantity" numeric(18,8) NOT NULL, "filled_quantity" numeric(18,8) NOT NULL DEFAULT '0', "status" "public"."orders_status_enum" NOT NULL DEFAULT 'new', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_710e2d4957aa5878dfe94e4ac2f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "trades" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "buy_order_id" uuid NOT NULL, "sell_order_id" uuid NOT NULL, "symbol" character varying NOT NULL, "price" numeric(18,8) NOT NULL, "quantity" numeric(18,8) NOT NULL, "notional_value" numeric(18,8) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_c6d7c36a837411ba5194dc58595" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "portfolios" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "total_value" numeric(18,8) NOT NULL DEFAULT '0', "available_balance" numeric(18,8) NOT NULL DEFAULT '0', "locked_balance" numeric(18,8) NOT NULL DEFAULT '0', "pnl_realized" numeric(18,8) NOT NULL DEFAULT '0', "pnl_unrealized" numeric(18,8) NOT NULL DEFAULT '0', "total_trades" integer NOT NULL DEFAULT '0', "winning_trades" integer NOT NULL DEFAULT '0', "losing_trades" integer NOT NULL DEFAULT '0', "total_fees_paid" numeric(18,8) NOT NULL DEFAULT '0', "last_updated_prices_at" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_488aa6e9b219d1d9087126871ae" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."oauth_providers_provider_enum" AS ENUM('google', 'apple', 'facebook')`);
        await queryRunner.query(`CREATE TABLE "oauth_providers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "provider" "public"."oauth_providers_provider_enum" NOT NULL, "provider_user_id" character varying NOT NULL, "provider_email" character varying, "provider_data" jsonb, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_80f70fba4177502d50482d9735b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."notifications_type_enum" AS ENUM('order_filled', 'order_cancelled', 'trade_executed', 'price_alert', 'competition_update', 'system_announcement', 'account_update')`);
        await queryRunner.query(`CREATE TYPE "public"."notifications_status_enum" AS ENUM('unread', 'read', 'archived')`);
        await queryRunner.query(`CREATE TABLE "notifications" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "type" "public"."notifications_type_enum" NOT NULL, "title" character varying NOT NULL, "message" text NOT NULL, "status" "public"."notifications_status_enum" NOT NULL DEFAULT 'unread', "metadata" jsonb, "reference_id" character varying, "expires_at" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."competitions_status_enum" AS ENUM('pending', 'active', 'completed', 'cancelled')`);
        await queryRunner.query(`CREATE TABLE "competitions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "description" character varying, "status" "public"."competitions_status_enum" NOT NULL DEFAULT 'pending', "start_date" TIMESTAMP NOT NULL, "end_date" TIMESTAMP NOT NULL, "initial_balance" numeric(18,8) NOT NULL DEFAULT '10000', "max_participants" integer, "entry_fee" numeric(18,8) NOT NULL DEFAULT '0', "prize_pool" numeric(18,8) NOT NULL DEFAULT '0', "allowed_assets" text array, "rules" jsonb, "created_by" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_ef273910798c3a542b475e75c7d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "api_keys" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "key_name" character varying NOT NULL, "api_key" character varying NOT NULL, "api_secret_hash" character varying NOT NULL, "permissions" jsonb NOT NULL, "ip_whitelist" text array, "last_used_at" TIMESTAMP, "expires_at" TIMESTAMP, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_9ccce5863aec84d045d778179de" UNIQUE ("api_key"), CONSTRAINT "PK_5c8a79801b44bd27b79228e1dad" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "user_profiles" ADD CONSTRAINT "FK_6ca9503d77ae39b4b5a6cc3ba88" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "wallet_transactions" ADD CONSTRAINT "FK_4796762c619893704abbc3dce65" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "wallet_transactions" ADD CONSTRAINT "FK_c57d19129968160f4db28fc8b28" FOREIGN KEY ("wallet_id") REFERENCES "virtual_wallets"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "virtual_wallets" ADD CONSTRAINT "FK_2dcf43ae2d70ffd1e5508babc17" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_sessions" ADD CONSTRAINT "FK_e9658e959c490b0a634dfc54783" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "trading_pairs" ADD CONSTRAINT "FK_15ad0906117cc904a3e854748f4" FOREIGN KEY ("base_asset") REFERENCES "assets"("symbol") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "trading_pairs" ADD CONSTRAINT "FK_c0078e4b830fb1417fb4922ed24" FOREIGN KEY ("quote_asset") REFERENCES "assets"("symbol") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "orders" ADD CONSTRAINT "FK_a922b820eeef29ac1c6800e826a" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "trades" ADD CONSTRAINT "FK_2c60a80c06d1ebd4dd787b2b067" FOREIGN KEY ("buy_order_id") REFERENCES "orders"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "trades" ADD CONSTRAINT "FK_f090ae73c862ae0c8c74beb2860" FOREIGN KEY ("sell_order_id") REFERENCES "orders"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "portfolios" ADD CONSTRAINT "FK_57fba72db5ac40768b40f0ecfa1" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "oauth_providers" ADD CONSTRAINT "FK_1c4358fd1845afbcc2d2c6b9664" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD CONSTRAINT "FK_9a8a82462cab47c73d25f49261f" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "competitions" ADD CONSTRAINT "FK_f392ec1b5a59eda21f629e48291" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "api_keys" ADD CONSTRAINT "FK_a3baee01d8408cd3c0f89a9a973" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "api_keys" DROP CONSTRAINT "FK_a3baee01d8408cd3c0f89a9a973"`);
        await queryRunner.query(`ALTER TABLE "competitions" DROP CONSTRAINT "FK_f392ec1b5a59eda21f629e48291"`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "FK_9a8a82462cab47c73d25f49261f"`);
        await queryRunner.query(`ALTER TABLE "oauth_providers" DROP CONSTRAINT "FK_1c4358fd1845afbcc2d2c6b9664"`);
        await queryRunner.query(`ALTER TABLE "portfolios" DROP CONSTRAINT "FK_57fba72db5ac40768b40f0ecfa1"`);
        await queryRunner.query(`ALTER TABLE "trades" DROP CONSTRAINT "FK_f090ae73c862ae0c8c74beb2860"`);
        await queryRunner.query(`ALTER TABLE "trades" DROP CONSTRAINT "FK_2c60a80c06d1ebd4dd787b2b067"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP CONSTRAINT "FK_a922b820eeef29ac1c6800e826a"`);
        await queryRunner.query(`ALTER TABLE "trading_pairs" DROP CONSTRAINT "FK_c0078e4b830fb1417fb4922ed24"`);
        await queryRunner.query(`ALTER TABLE "trading_pairs" DROP CONSTRAINT "FK_15ad0906117cc904a3e854748f4"`);
        await queryRunner.query(`ALTER TABLE "user_sessions" DROP CONSTRAINT "FK_e9658e959c490b0a634dfc54783"`);
        await queryRunner.query(`ALTER TABLE "virtual_wallets" DROP CONSTRAINT "FK_2dcf43ae2d70ffd1e5508babc17"`);
        await queryRunner.query(`ALTER TABLE "wallet_transactions" DROP CONSTRAINT "FK_c57d19129968160f4db28fc8b28"`);
        await queryRunner.query(`ALTER TABLE "wallet_transactions" DROP CONSTRAINT "FK_4796762c619893704abbc3dce65"`);
        await queryRunner.query(`ALTER TABLE "user_profiles" DROP CONSTRAINT "FK_6ca9503d77ae39b4b5a6cc3ba88"`);
        await queryRunner.query(`DROP TABLE "api_keys"`);
        await queryRunner.query(`DROP TABLE "competitions"`);
        await queryRunner.query(`DROP TYPE "public"."competitions_status_enum"`);
        await queryRunner.query(`DROP TABLE "notifications"`);
        await queryRunner.query(`DROP TYPE "public"."notifications_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."notifications_type_enum"`);
        await queryRunner.query(`DROP TABLE "oauth_providers"`);
        await queryRunner.query(`DROP TYPE "public"."oauth_providers_provider_enum"`);
        await queryRunner.query(`DROP TABLE "portfolios"`);
        await queryRunner.query(`DROP TABLE "trades"`);
        await queryRunner.query(`DROP TABLE "orders"`);
        await queryRunner.query(`DROP TYPE "public"."orders_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."orders_order_type_enum"`);
        await queryRunner.query(`DROP TYPE "public"."orders_side_enum"`);
        await queryRunner.query(`DROP TABLE "trading_pairs"`);
        await queryRunner.query(`DROP TYPE "public"."trading_pairs_asset_type_enum"`);
        await queryRunner.query(`DROP TABLE "assets"`);
        await queryRunner.query(`DROP TYPE "public"."assets_asset_type_enum"`);
        await queryRunner.query(`DROP TABLE "user_sessions"`);
        await queryRunner.query(`DROP TABLE "virtual_wallets"`);
        await queryRunner.query(`DELETE FROM "public"."typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "database" = $3 AND "schema" = $4 AND "table" = $5`, ["GENERATED_COLUMN","available_balance","pennyweis_db","public","virtual_wallets"]);
        await queryRunner.query(`DROP TABLE "wallet_transactions"`);
        await queryRunner.query(`DROP TYPE "public"."wallet_transactions_reference_type_enum"`);
        await queryRunner.query(`DROP TYPE "public"."wallet_transactions_transaction_type_enum"`);
        await queryRunner.query(`DROP TABLE "user_profiles"`);
        await queryRunner.query(`DROP TYPE "public"."user_profiles_trading_experience_enum"`);
        await queryRunner.query(`DROP TYPE "public"."user_profiles_risk_tolerance_enum"`);
        await queryRunner.query(`DROP TABLE "users"`);
    }

}
