import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    MessageBody,
    ConnectedSocket,
    OnGatewayInit,
    OnGatewayConnection,
    OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, WebSocket } from 'ws';
import { BinanceWsService } from '../binance/binance.ws.service';
import { PAIRS } from './pairs.constant';
import { Subscription } from 'rxjs';

@WebSocketGateway()
export class TradingGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private readonly logger = new Logger(TradingGateway.name);
    private clientSubs = new Map<WebSocket, Map<string, Subscription>>();

    constructor(private binanceWs: BinanceWsService) { }

    afterInit(server: Server) {
        this.logger.log('Trading Gateway initialized');
    }

    handleConnection(client: WebSocket) {
        this.logger.log('Client connected');
        this.clientSubs.set(client, new Map());
    }

    handleDisconnect(client: WebSocket) {
        this.logger.log('Client disconnected');
        const subsMap = this.clientSubs.get(client);
        if (subsMap) {
            subsMap.forEach(sub => sub.unsubscribe());
            this.clientSubs.delete(client);
        }
    }

    @SubscribeMessage('subscribe_trade')
    handleSubscribeTrade(
        @MessageBody() data: { pair: string },
        @ConnectedSocket() client: WebSocket,
    ) {
        const { pair } = data;
        const symbol = PAIRS[pair];

        if (!symbol) {
            client.send(JSON.stringify({ event: 'error', message: 'Invalid pair' }));
            return;
        }

        const key = `trade:${symbol}`;
        const clientSpecificSubs = this.clientSubs.get(client);

        if (clientSpecificSubs.has(key)) {
            // Already subscribed
            return { event: 'subscribed_trade', data: { pair, symbol, status: 'already_subscribed' } };
        }

        this.logger.log(`Client subscribing to ${pair} (${symbol})`);

        // Ensure backend is connected to Binance
        this.binanceWs.connect(symbol);

        // Subscribe to the stream and filter for this symbol
        const sub = this.binanceWs.tradeStream$.subscribe(tradeData => {
            // Binance trade stream 's' is symbol
            if (tradeData.s === symbol) {
                if (client.readyState === WebSocket.OPEN) {
                    const payload = {
                        event: 'trade_update',
                        data: {
                            pair,
                            symbol,
                            price: tradeData.p,
                            quantity: tradeData.q,
                            time: tradeData.T,
                            isBuyerMaker: tradeData.m
                        }
                    };
                    client.send(JSON.stringify(payload));
                }
            }
        });

        clientSpecificSubs.set(key, sub);
        return { event: 'subscribed_trade', data: { pair, symbol } };
    }

    @SubscribeMessage('unsubscribe_trade')
    handleUnsubscribeTrade(
        @MessageBody() data: { pair: string },
        @ConnectedSocket() client: WebSocket,
    ) {
        const { pair } = data;
        const symbol = PAIRS[pair];
        if (!symbol) return;

        const key = `trade:${symbol}`;
        const subs = this.clientSubs.get(client);

        if (subs && subs.has(key)) {
            subs.get(key).unsubscribe();
            subs.delete(key);
            this.logger.log(`Client unsubscribed from ${pair}`);
            return { event: 'unsubscribed_trade', data: { pair, symbol } };
        }
    }

    @SubscribeMessage('subscribe_kline')
    handleSubscribeKline(
        @MessageBody() data: { pair: string; interval: string },
        @ConnectedSocket() client: WebSocket,
    ) {
        const { pair, interval = '1m' } = data;
        const symbol = PAIRS[pair];

        if (!symbol) {
            client.send(JSON.stringify({ event: 'error', message: 'Invalid pair' }));
            return;
        }

        const key = `kline:${symbol}:${interval}`;
        const subs = this.clientSubs.get(client);

        if (subs.has(key)) {
            return { event: 'subscribed_kline', data: { pair, symbol, interval, status: 'already_subscribed' } };
        }

        this.logger.log(`Client subscribing to kline ${pair} ${interval}`);

        this.binanceWs.connectKline(symbol, interval);

        const sub = this.binanceWs.klineStream$.subscribe(klineData => {
            // klineData.s is symbol
            if (klineData.s === symbol && klineData.k && klineData.k.i === interval) {
                if (client.readyState === WebSocket.OPEN) {
                    const k = klineData.k;
                    const payload = {
                        event: 'kline_update',
                        data: {
                            pair,
                            symbol,
                            interval,
                            startTime: k.t,
                            closeTime: k.T,
                            open: k.o,
                            high: k.h,
                            low: k.l,
                            close: k.c,
                            volume: k.v,
                            isClosed: k.x
                        }
                    };
                    client.send(JSON.stringify(payload));
                }
            }
        });

        subs.set(key, sub);
        return { event: 'subscribed_kline', data: { pair, symbol, interval } };
    }

    @SubscribeMessage('unsubscribe_kline')
    handleUnsubscribeKline(
        @MessageBody() data: { pair: string; interval: string },
        @ConnectedSocket() client: WebSocket,
    ) {
        const { pair, interval = '1m' } = data;
        const symbol = PAIRS[pair];
        if (!symbol) return;

        const key = `kline:${symbol}:${interval}`;
        const subs = this.clientSubs.get(client);

        if (subs && subs.has(key)) {
            subs.get(key).unsubscribe();
            subs.delete(key);
            this.logger.log(`Client unsubscribed from kline ${pair} ${interval}`);
            return { event: 'unsubscribed_kline', data: { pair, symbol, interval } };
        }
    }
}
