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
    private clientSubs = new Map<WebSocket, Subscription[]>();

    constructor(private binanceWs: BinanceWsService) { }

    afterInit(server: Server) {
        this.logger.log('Trading Gateway initialized');
    }

    handleConnection(client: WebSocket) {
        this.logger.log('Client connected');
        this.clientSubs.set(client, []);
    }

    handleDisconnect(client: WebSocket) {
        this.logger.log('Client disconnected');
        const subs = this.clientSubs.get(client);
        if (subs) {
            subs.forEach(sub => sub.unsubscribe());
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

        const subs = this.clientSubs.get(client);
        if (subs) {
            subs.push(sub);
        }

        return { event: 'subscribed_trade', data: { pair, symbol } };
    }
}
