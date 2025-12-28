import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WebSocket } from 'ws';
import { Subject, Observable } from 'rxjs';
import { CoinGeckoPriceData, WebSocketMessage, CoinGeckoConfig, OHLCVData } from '../../interfaces/coingecko.interface';


@Injectable()
export class CoinGeckoWebsocketService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CoinGeckoWebsocketService.name);
  private ws: WebSocket | null = null;
  private connected: boolean = false;
  private subscriptions: Map<string, Subject<CoinGeckoPriceData>> = new Map();
  private subscribedCoins: Set<string> = new Set();
  private ohlcvSubscriptions: Map<string, Subject<OHLCVData>> = new Map();
  private subscribedPools: Set<string> = new Set();

  private reconnectAttempts: number = 0;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private subscriptionDebounceTimer: NodeJS.Timeout | null = null;
  private ohlcvSubscriptionDebounceTimer: NodeJS.Timeout | null = null;

  private readonly wsUrl: string;
  private readonly config: CoinGeckoConfig;

  constructor(private configService: ConfigService) {
    this.config = {
      apiKey: this.configService.get<string>('COINGECKO_API_KEY'),
      reconnectAttempts: this.configService.get<number>('COINGECKO_RECONNECT_ATTEMPTS', 5),
      reconnectDelay: this.configService.get<number>('COINGECKO_RECONNECT_DELAY', 5000),
      heartbeatInterval: this.configService.get<number>('COINGECKO_HEARTBEAT_INTERVAL', 30000),
    };

    let url = 'wss://stream.coingecko.com/v1';
    if (this.config.apiKey) {
      url += `?x_cg_pro_api_key=${this.config.apiKey}`;
    }
    this.wsUrl = url;
  }

  async onModuleInit() {
    this.logger.log('Initializing CoinGecko WebSocket service...');
    await this.connect();
  }

  async onModuleDestroy() {
    this.logger.log('Shutting down CoinGecko WebSocket service...');
    this.disconnect();
  }

  public async connect(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        this.logger.log('Connecting to CoinGecko WebSocket...');
        this.ws = new WebSocket(this.wsUrl);

        this.ws.on('open', () => this.onOpen(resolve));
        this.ws.on('message', (data: any) => this.onMessage(data));
        this.ws.on('error', (error) => this.onError(error));
        this.ws.on('close', () => this.onClose());

        // Set connection timeout
        setTimeout(() => {
          if (!this.connected) {
            this.logger.error('Connection timeout');
            resolve(false);
          }
        }, 10000);

      } catch (error) {
        this.logger.error('Connection failed:', error);
        resolve(false);
      }
    });
  }

  public disconnect(): void {
    this.connected = false;

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.subscriptionDebounceTimer) {
      clearTimeout(this.subscriptionDebounceTimer);
      this.subscriptionDebounceTimer = null;
    }

    if (this.ohlcvSubscriptionDebounceTimer) {
      clearTimeout(this.ohlcvSubscriptionDebounceTimer);
      this.ohlcvSubscriptionDebounceTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.logger.log('Disconnected from CoinGecko WebSocket');
  }

  public subscribe(coinId: string): Observable<CoinGeckoPriceData> {
    // If not connected, we still allow subscription registration; 
    // it will be sent upon connection (via set_tokens re-send or just adding to set).

    if (this.subscriptions.has(coinId)) {
      return this.subscriptions.get(coinId)!.asObservable();
    }

    const subject = new Subject<CoinGeckoPriceData>();
    this.subscriptions.set(coinId, subject);
    this.subscribedCoins.add(coinId);

    this.scheduleSubscriptionUpdate();

    return subject.asObservable();
  }

  public unsubscribe(coinId: string): void {
    if (!this.subscriptions.has(coinId)) {
      return;
    }

    const subject = this.subscriptions.get(coinId);
    if (subject) {
      subject.complete();
      this.subscriptions.delete(coinId);
    }
    this.subscribedCoins.delete(coinId);

    this.scheduleSubscriptionUpdate();
    this.logger.log(`Unsubscribed from ${coinId} price updates`);
  }

  public subscribeToOHLCV(
    network: string,
    pool: string,
    interval: string = '1m',
    token: string = 'base'
  ): Observable<OHLCVData> {
    const key = `${network}:${pool}:${interval}:${token}`;

    if (this.ohlcvSubscriptions.has(key)) {
      return this.ohlcvSubscriptions.get(key)!.asObservable();
    }

    const subject = new Subject<OHLCVData>();
    this.ohlcvSubscriptions.set(key, subject);
    this.subscribedPools.add(key);

    this.scheduleOHLCVSubscriptionUpdate();

    return subject.asObservable();
  }

  public unsubscribeFromOHLCV(
    network: string,
    pool: string,
    interval: string = '1m',
    token: string = 'base'
  ): void {
    const key = `${network}:${pool}:${interval}:${token}`;
    if (!this.ohlcvSubscriptions.has(key)) {
      return;
    }

    const subject = this.ohlcvSubscriptions.get(key);
    if (subject) {
      subject.complete();
      this.ohlcvSubscriptions.delete(key);
    }
    this.subscribedPools.delete(key);

    this.scheduleOHLCVSubscriptionUpdate();
    this.logger.log(`Unsubscribed from OHLCV updates for ${key}`);
  }

  private scheduleOHLCVSubscriptionUpdate() {
    if (this.ohlcvSubscriptionDebounceTimer) {
      clearTimeout(this.ohlcvSubscriptionDebounceTimer);
    }
    this.ohlcvSubscriptionDebounceTimer = setTimeout(() => {
      this.updateOHLCVRemoteSubscriptions();
    }, 100);
  }

  private updateOHLCVRemoteSubscriptions() {
    if (!this.connected || !this.ws) return;

    const pools = Array.from(this.subscribedPools);
    if (pools.length === 0) return;

    const grouped = new Map<string, string[]>(); // key: "interval:token", value: ["net:pool", ...]

    pools.forEach(key => {
      const [network, pool, interval, token] = key.split(':');
      const groupKey = `${interval}:${token}`;
      const poolId = `${network}:${pool}`;

      if (!grouped.has(groupKey)) {
        grouped.set(groupKey, []);
      }
      grouped.get(groupKey)!.push(poolId);
    });

    grouped.forEach((poolIds, groupKey) => {
      const [interval, token] = groupKey.split(':');
      const message = {
        command: 'message',
        identifier: JSON.stringify({ channel: 'OnchainOHLCV' }),
        data: JSON.stringify({
          'network_id:pool_addresses': poolIds,
          interval,
          token,
          action: 'set_pools'
        })
      };

      try {
        this.ws!.send(JSON.stringify(message));
        this.logger.log(`Updated OHLCV subscriptions for ${groupKey}: ${poolIds.length} pools`);
      } catch (error) {
        this.logger.error('Failed to update OHLCV subscriptions:', error);
      }
    });
  }

  private scheduleSubscriptionUpdate() {
    if (this.subscriptionDebounceTimer) {
      clearTimeout(this.subscriptionDebounceTimer);
    }
    this.subscriptionDebounceTimer = setTimeout(() => {
      this.updateRemoteSubscriptions();
    }, 100);
  }

  private updateRemoteSubscriptions() {
    if (!this.connected || !this.ws) return;

    const coins = Array.from(this.subscribedCoins);
    if (coins.length === 0) {
      // If no coins, maybe unset all? For now, we just don't send anything or send empty list if API supports it.
      // CoinGecko API: "set_tokens"
      return;
    }

    const message = {
      command: 'message',
      identifier: JSON.stringify({ channel: 'CGSimplePrice' }),
      data: JSON.stringify({
        coin_id: coins,
        action: 'set_tokens'
      })
    };

    try {
      this.ws.send(JSON.stringify(message));
      this.logger.log(`Updated subscriptions for coins: ${coins.join(', ')}`);
    } catch (error) {
      this.logger.error('Failed to update subscriptions:', error);
    }
  }

  public getActiveSubscriptions(): string[] {
    return Array.from(this.subscriptions.keys());
  }

  public isConnected(): boolean {
    return this.connected;
  }

  private onOpen(resolve: (value: boolean) => void): void {
    this.connected = true;
    this.reconnectAttempts = 0;
    this.logger.log('Connected to CoinGecko WebSocket API');

    this.startHeartbeat();

    // Subscribe to the channel
    const subscribeMsg = {
      command: 'subscribe',
      identifier: JSON.stringify({ channel: 'CGSimplePrice' })
    };
    this.ws!.send(JSON.stringify(subscribeMsg));

    // Subscribe to OnchainOHLCV
    const subscribeOHLCVMsg = {
      command: 'subscribe',
      identifier: JSON.stringify({ channel: 'OnchainOHLCV' })
    };
    this.ws!.send(JSON.stringify(subscribeOHLCVMsg));

    // Resend any pending token subscriptions
    if (this.subscribedCoins.size > 0) {
      this.updateRemoteSubscriptions();
    }
    if (this.subscribedPools.size > 0) {
      this.updateOHLCVRemoteSubscriptions();
    }

    resolve(true);
  }

  private onMessage(data: Buffer): void {
    try {
      const message: WebSocketMessage = JSON.parse(data.toString());
      // this.logger.debug('Received message:', message);

      // Handle subscription confirmation
      if (message.type === 'confirm_subscription') {
        this.logger.log('Channel subscription confirmed');
        return;
      }

      // Handle price update data
      // Encapsulated in "data"? No, the docs say fields like c, i, p are at top level or in some wrapper?
      // Docs: Output Example: { "c": "C1", "i": "ethereum", ... }
      if (message.c === 'C1' && message.i) {
        this.processPriceUpdate(message);
      }

      // OnchainOHLCV: ch='G3'
      if (message.ch === 'G3') {
        this.processOHLCVUpdate(message);
      }
    } catch (error) {
      this.logger.error('Error processing message:', error);
    }
  }

  private onError(error: Error): void {
    this.logger.error('WebSocket error:', error);
    this.connected = false;
  }

  private onClose(): void {
    this.logger.log('WebSocket connection closed');
    this.connected = false;

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.reconnectAttempts < (this.config.reconnectAttempts || 5)) {
      this.reconnectAttempts++;
      this.logger.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.config.reconnectAttempts})`);

      this.reconnectTimeout = setTimeout(() => {
        this.connect();
      }, this.config.reconnectDelay || 5000);
    }
  }

  private processPriceUpdate(message: WebSocketMessage): void {
    try {
      const coinId = message.i;
      if (!coinId) return;

      const subject = this.subscriptions.get(coinId);
      if (subject) {
        const formattedData: CoinGeckoPriceData = {
          coinId,
          timestamp: (message.t || 0) * 1000, // Convert to ms
          priceUsd: message.p || 0,
          marketCap: message.m || 0,
          volume24h: message.v || 0,
          change24h: message.pp || 0,
        };

        subject.next(formattedData);
      }
    } catch (error) {
      this.logger.error('Error processing price update:', error);
    }
  }

  private processOHLCVUpdate(message: WebSocketMessage): void {
    try {
      const network = message.n;
      const pool = message.pa;
      const interval = message.i as string;
      const token = message.to;

      if (!network || !pool || !interval || !token) return;

      const key = `${network}:${pool}:${interval}:${token}`;
      const subject = this.ohlcvSubscriptions.get(key);

      if (subject) {
        const ohlcvData: OHLCVData = {
          networkId: network,
          poolAddress: pool,
          interval,
          tokenType: token,
          open: message.o || 0,
          high: message.h || 0,
          low: message.l || 0,
          close: (message.c as number) || 0,
          volume: message.v || 0,
          timestamp: (message.t || 0) * 1000
        };
        subject.next(ohlcvData);
      }

    } catch (error) {
      this.logger.error('Error processing OHLCV update:', error);
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      // CoinGecko might not need explicit ping/pong if not documented, but keeping connection alive is good.
      // Docs don't mention ping/pong frames, but we can verify.
      // If basic TCP keepalive is enough, we might skip. 
      // Reverting to empty or check documentation.
      // However, usually WS libraries handle Ping/Pong frames if standard.
      // We'll leave it empty or send a safe custom ping if needed.
    }, this.config.heartbeatInterval || 30000);
  }
}