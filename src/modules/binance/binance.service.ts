import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class BinanceService {
    private readonly logger = new Logger(BinanceService.name);
    private baseUrl = 'https://api.binance.com/api/v3';

    async getPrice(symbol: string) {
        try {
            const res = await axios.get(`${this.baseUrl}/ticker/price`, { params: { symbol } });
            return res.data;
        } catch (error) {
            this.logger.error(`Error fetching price for ${symbol}`, error);
            throw error;
        }
    }

    async getDepth(symbol: string, limit = 20) {
        try {
            const res = await axios.get(`${this.baseUrl}/depth`, { params: { symbol, limit } });
            return res.data;
        } catch (error) {
            this.logger.error(`Error fetching depth for ${symbol}`, error);
            throw error;
        }
    }

    async getCandles(symbol: string, interval = '1m', limit = 500) {
        try {
            const res = await axios.get(`${this.baseUrl}/klines`, { params: { symbol, interval, limit } });
            // Helper to map array response if needed, but returning raw is fine for now
            return res.data;
        } catch (error) {
            this.logger.error(`Error fetching candles for ${symbol}`, error);
            throw error;
        }
    }

    async getTrades(symbol: string, limit = 500) {
        try {
            const res = await axios.get(`${this.baseUrl}/trades`, { params: { symbol, limit } });
            return res.data;
        } catch (error) {
            this.logger.error(`Error fetching trades for ${symbol}`, error);
            throw error;
        }
    }
}
