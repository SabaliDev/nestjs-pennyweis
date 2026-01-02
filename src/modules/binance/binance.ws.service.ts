import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as WebSocket from 'ws';
import { Subject } from 'rxjs';

@Injectable()
export class BinanceWsService implements OnModuleDestroy {
    private readonly logger = new Logger(BinanceWsService.name);
    private wsMap: Record<string, WebSocket> = {};
    private readonly wsBaseUrl: string;
    public tradeStream$ = new Subject<any>();
    public depthStream$ = new Subject<any>();
    public klineStream$ = new Subject<any>();

    constructor(private configService: ConfigService) {
        this.wsBaseUrl = this.configService.get<string>('app.binance.wsBaseUrl');
    }

    onModuleDestroy() {
        Object.values(this.wsMap).forEach(ws => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.close();
            }
        });
    }

    connect(symbol: string) {
        if (this.wsMap[symbol]) return;

        this.logger.log(`Connecting to Binance Trade WS for ${symbol}`);
        const ws = new WebSocket(`${this.wsBaseUrl}/${symbol.toLowerCase()}@trade`);

        ws.on('open', () => {
            this.logger.log(`Connected to Trade WS for ${symbol}`);
        });

        ws.on('message', (msg) => {
            try {
                const data = JSON.parse(msg.toString());
                this.tradeStream$.next(data);
            } catch (e) {
                this.logger.error('Error parsing trade message', e);
            }
        });

        ws.on('error', (err) => {
            this.logger.error(`WS Error for ${symbol}`, err);
        });

        ws.on('close', () => {
            this.logger.log(`WS Closed for ${symbol}`);
            delete this.wsMap[symbol];
        });

        this.wsMap[symbol] = ws;
    }

    connectDepth(symbol: string) {
        const key = symbol + '_depth';
        if (this.wsMap[key]) return;

        this.logger.log(`Connecting to Binance Depth WS for ${symbol}`);
        const ws = new WebSocket(`${this.wsBaseUrl}/${symbol.toLowerCase()}@depth20@100ms`);

        ws.on('open', () => {
            this.logger.log(`Connected to Depth WS for ${symbol}`);
        });

        ws.on('message', (msg) => {
            try {
                const data = JSON.parse(msg.toString());
                this.depthStream$.next(data);
            } catch (e) {
                this.logger.error('Error parsing depth message', e);
            }
        });

        ws.on('error', (err) => {
            this.logger.error(`Depth WS Error for ${symbol}`, err);
        });

        ws.on('close', () => {
            this.logger.log(`Depth WS Closed for ${symbol}`);
            delete this.wsMap[key];
        });

        this.wsMap[key] = ws;
    }

    connectKline(symbol: string, interval: string) {
        const key = `${symbol}_kline_${interval}`;
        if (this.wsMap[key]) return;

        this.logger.log(`Connecting to Binance Kline WS for ${symbol} ${interval}`);
        const ws = new WebSocket(`${this.wsBaseUrl}/${symbol.toLowerCase()}@kline_${interval}`);

        ws.on('open', () => {
            this.logger.log(`Connected to Kline WS for ${symbol} ${interval}`);
        });

        ws.on('message', (msg) => {
            try {
                const data = JSON.parse(msg.toString());
                this.klineStream$.next(data);
            } catch (e) {
                this.logger.error('Error parsing kline message', e);
            }
        });

        ws.on('error', (err) => {
            this.logger.error(`Kline WS Error for ${symbol} ${interval}`, err);
        });

        ws.on('close', () => {
            this.logger.log(`Kline WS Closed for ${symbol} ${interval}`);
            delete this.wsMap[key];
        });

        this.wsMap[key] = ws;
    }
}
