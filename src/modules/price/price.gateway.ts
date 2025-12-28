
import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayConnection,
    OnGatewayDisconnect,
    MessageBody,
    ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, WebSocket } from 'ws';
import { Subscription } from 'rxjs';
import { CoinGeckoWebsocketService } from './coingeckoPriceStream.service';

@WebSocketGateway()
export class PriceGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private readonly logger = new Logger(PriceGateway.name);
    // Map<Client, Map<CoinId, RxSubscription>>
    private clientSubscriptions: Map<WebSocket, Map<string, Subscription>> = new Map();

    constructor(private readonly priceService: CoinGeckoWebsocketService) { }

    handleConnection(client: WebSocket) {
        this.logger.log('Client connected to PriceGateway');
        this.clientSubscriptions.set(client, new Map());
    }

    handleDisconnect(client: WebSocket) {
        this.logger.log('Client disconnected from PriceGateway');
        const userSubs = this.clientSubscriptions.get(client);
        if (userSubs) {
            userSubs.forEach((sub) => sub.unsubscribe());
            this.clientSubscriptions.delete(client);
        }
    }

    @SubscribeMessage('subscribe_price')
    handleSubscribe(
        @MessageBody() data: { coinId: string },
        @ConnectedSocket() client: WebSocket,
    ) {
        const { coinId } = data;
        if (!coinId) return;

        const userSubs = this.clientSubscriptions.get(client);
        if (!userSubs) return; // Should not happen if handleConnection works

        if (userSubs.has(coinId)) {
            this.logger.log(`Client already subscribed to ${coinId} `);
            return;
        }

        this.logger.log(`Client subscribing to ${coinId} `);

        const subscription = this.priceService.subscribe(coinId).subscribe({
            next: (priceData) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({
                        event: 'price_update',
                        data: priceData
                    }));
                }
            },
            error: (err) => {
                this.logger.error(`Error in price stream for ${coinId}: `, err);
            }
        });

        userSubs.set(coinId, subscription);

        return { event: 'subscribed', data: { coinId } };
    }

    @SubscribeMessage('unsubscribe_price')
    handleUnsubscribe(
        @MessageBody() data: { coinId: string },
        @ConnectedSocket() client: WebSocket,
    ) {
        const { coinId } = data;
        if (!coinId) return;

        const userSubs = this.clientSubscriptions.get(client);
        if (!userSubs) return;

        const subscription = userSubs.get(coinId);
        if (subscription) {
            subscription.unsubscribe();
            userSubs.delete(coinId);
            this.logger.log(`Client unsubscribed from ${coinId} `);
        }
    }
    @SubscribeMessage('subscribe_ohlcv')
    handleSubscribeOHLCV(
        @MessageBody() data: { network: string; poolAddress: string; interval: string; token: string },
        @ConnectedSocket() client: WebSocket,
    ) {
        const { network, poolAddress, interval = '1m', token = 'base' } = data;
        if (!network || !poolAddress) return;

        const key = `${network}:${poolAddress}:${interval}:${token}`;

        const userSubs = this.clientSubscriptions.get(client);
        if (!userSubs) return;

        if (userSubs.has(key)) {
            this.logger.log(`Client already subscribed to OHLCV ${key}`);
            return;
        }

        this.logger.log(`Client subscribing to OHLCV ${key}`);

        const subscription = this.priceService.subscribeToOHLCV(network, poolAddress, interval, token).subscribe({
            next: (data) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({
                        event: 'ohlcv_update',
                        data: data
                    }));
                }
            },
            error: (err) => {
                this.logger.error(`Error in OHLCV stream for ${key}: `, err);
            }
        });

        userSubs.set(key, subscription);

        return { event: 'subscribed_ohlcv', data: { network, poolAddress, interval, token } };
    }

    @SubscribeMessage('unsubscribe_ohlcv')
    handleUnsubscribeOHLCV(
        @MessageBody() data: { network: string; poolAddress: string; interval: string; token: string },
        @ConnectedSocket() client: WebSocket,
    ) {
        const { network, poolAddress, interval = '1m', token = 'base' } = data;
        const key = `${network}:${poolAddress}:${interval}:${token}`;

        const userSubs = this.clientSubscriptions.get(client);
        if (!userSubs) return;

        const subscription = userSubs.get(key);
        if (subscription) {
            subscription.unsubscribe();
            userSubs.delete(key);
            this.logger.log(`Client unsubscribed from OHLCV ${key}`);
            // Also notify service to decrement/unsubscribe? 
            // Currently service just keeps it open or we need to add ref counting there. 
            // For now, simple implementation.
            this.priceService.unsubscribeFromOHLCV(network, poolAddress, interval, token);
        }
    }
}

