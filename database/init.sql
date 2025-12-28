-- Database initialization script for Pennyweis Trading Platform

-- Create database (if using this script manually)
-- CREATE DATABASE pennyweis_db;

-- Connect to pennyweis_db
\c pennyweis_db;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create default assets
INSERT INTO assets (id, symbol, name, asset_type, is_active, created_at, updated_at)
VALUES 
  (uuid_generate_v4(), 'BTC', 'Bitcoin', 'cryptocurrency', true, NOW(), NOW()),
  (uuid_generate_v4(), 'ETH', 'Ethereum', 'cryptocurrency', true, NOW(), NOW()),
  (uuid_generate_v4(), 'USDT', 'Tether USD', 'cryptocurrency', true, NOW(), NOW()),
  (uuid_generate_v4(), 'AAPL', 'Apple Inc.', 'stock', true, NOW(), NOW()),
  (uuid_generate_v4(), 'GOOGL', 'Alphabet Inc.', 'stock', true, NOW(), NOW())
ON CONFLICT (symbol) DO NOTHING;

-- Create default trading pairs
INSERT INTO trading_pairs (id, base_symbol, quote_symbol, is_active, min_quantity, max_quantity, price_precision, quantity_precision, created_at, updated_at)
VALUES 
  (uuid_generate_v4(), 'BTC', 'USDT', true, '0.00001', '1000', 2, 8, NOW(), NOW()),
  (uuid_generate_v4(), 'ETH', 'USDT', true, '0.0001', '10000', 2, 8, NOW(), NOW()),
  (uuid_generate_v4(), 'AAPL', 'USD', true, '0.01', '10000', 2, 8, NOW(), NOW()),
  (uuid_generate_v4(), 'GOOGL', 'USD', true, '0.01', '1000', 2, 8, NOW(), NOW())
ON CONFLICT (base_symbol, quote_symbol) DO NOTHING;

-- Create initial wallet for demo purposes (optional)
-- This will be handled by the application logic

COMMIT;