import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PolymarketService {
    private readonly gammaApiUrl = 'https://gamma-api.polymarket.com';
    private readonly clobApiUrl = 'https://clob.polymarket.com';

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
    ) { }

    async getActiveEvents(limit = 10, offset = 0) {
        try {
            const { data } = await firstValueFrom(
                this.httpService.get(`${this.gammaApiUrl}/events`, {
                    params: {
                        active: true,
                        closed: false,
                        limit,
                        offset,
                    },
                }),
            );
            return data;
        } catch (error) {
            console.error('Error fetching active events:', error.message);
            throw new HttpException('Failed to fetch events from Polymarket', HttpStatus.BAD_GATEWAY);
        }
    }

    async getEventBySlug(slug: string) {
        try {
            const { data } = await firstValueFrom(
                this.httpService.get(`${this.gammaApiUrl}/events`, {
                    params: { slug },
                }),
            );

            if (!data || data.length === 0) {
                throw new HttpException('Event not found', HttpStatus.NOT_FOUND);
            }

            return data[0];
        } catch (error) {
            if (error instanceof HttpException) throw error;
            console.error('Error fetching event:', error.message);
            throw new HttpException('Failed to fetch event', HttpStatus.BAD_GATEWAY);
        }
    }

    async getMarketPrice(tokenId: string, side: 'buy' | 'sell' = 'buy') {
        try {
            const { data } = await firstValueFrom(
                this.httpService.get(`${this.clobApiUrl}/price`, {
                    params: {
                        token_id: tokenId,
                        side,
                    },
                }),
            );
            return data;
        } catch (error) {
            console.error(`Error fetching price for ${tokenId}:`, error.message);
            // Fallback or rethrow
            throw new HttpException('Failed to fetch price', HttpStatus.BAD_GATEWAY);
        }
    }

    async getMarketOrderbook(tokenId: string) {
        try {
            const { data } = await firstValueFrom(
                this.httpService.get(`${this.clobApiUrl}/book`, {
                    params: {
                        token_id: tokenId,
                    },
                }),
            );
            return data;
        } catch (error) {
            console.error(`Error fetching orderbook for ${tokenId}:`, error.message);
            throw new HttpException('Failed to fetch orderbook', HttpStatus.BAD_GATEWAY);
        }
    }
}
