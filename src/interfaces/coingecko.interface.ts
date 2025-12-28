
export interface CoinGeckoPriceData {
  coinId: string;
  priceUsd: number;
  marketCap: number;
  volume24h: number;
  change24h: number;
  timestamp: number;
}

export interface WebSocketMessage {
  command?: string;
  identifier?: string;
  data?: string;
  type?: string;
  code?: number;
  message?: string;
  // Payload fields
  c?: string | number; // channel_type (string) OR close price (number)
  ch?: string; // channel_type for OHLCV (G3)
  i?: string | string; // coin_id (string) OR interval (string)
  p?: number; // usd_price
  pp?: number; // usd_price_24h_change_percentage
  m?: number; // usd_market_cap
  v?: number; // usd_24h_vol OR volume
  t?: number; // last_updated_at OR timestamp
  n?: string; // network_id
  pa?: string; // pool_address
  to?: string; // token (base/quote)
  o?: number; // open
  h?: number; // high
  l?: number; // low
}

export interface OHLCVData {
  networkId: string;
  poolAddress: string;
  interval: string;
  tokenType: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: number;
}

export interface CoinGeckoConfig {
  apiKey?: string;
  reconnectAttempts?: number;
  reconnectDelay?: number;
  heartbeatInterval?: number;
}

export interface SubscriptionData {
  coin_id: string[];
  action: 'set_tokens' | 'unset_tokens';
}