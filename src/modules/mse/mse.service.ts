import { Injectable, Logger } from '@nestjs/common';
import { Subject } from 'rxjs';

export interface MSEStock {
    symbol: string;
    name: string;
    price: string;
    change: string;
    changePercent: string;
    lastUpdate: string;
}

@Injectable()
export class MSEService {
    private readonly logger = new Logger(MSEService.name);

    // In-memory price storage (could be moved to DB for persistence)
    private stocks: Map<string, MSEStock> = new Map([
        ['NBM', { symbol: 'NBM', name: 'National Bank of Malawi', price: '2100.00', change: '0.00', changePercent: '0.00', lastUpdate: new Date().toISOString() }],
        ['STB', { symbol: 'STB', name: 'Standard Bank Malawi', price: '2400.00', change: '0.00', changePercent: '0.00', lastUpdate: new Date().toISOString() }],
        ['ILLOVO', { symbol: 'ILLOVO', name: 'Illovo Sugar Malawi', price: '1100.00', change: '0.00', changePercent: '0.00', lastUpdate: new Date().toISOString() }],
        ['AIRTEL', { symbol: 'AIRTEL', name: 'Airtel Malawi', price: '110.00', change: '0.00', changePercent: '0.00', lastUpdate: new Date().toISOString() }],
        ['TNM', { symbol: 'TNM', name: 'Telekom Networks Malawi', price: '26.00', change: '0.00', changePercent: '0.00', lastUpdate: new Date().toISOString() }],
        ['FMBCH', { symbol: 'FMBCH', name: 'FMB Capital Holdings', price: '400.00', change: '0.00', changePercent: '0.00', lastUpdate: new Date().toISOString() }],
        ['MPICO', { symbol: 'MPICO', name: 'MPICO Limited', price: '20.00', change: '0.00', changePercent: '0.00', lastUpdate: new Date().toISOString() }],
        ['PCL', { symbol: 'PCL', name: 'Press Corporation Limited', price: '2500.00', change: '0.00', changePercent: '0.00', lastUpdate: new Date().toISOString() }],
    ]);

    private priceUpdateSubject = new Subject<MSEStock>();
    public priceUpdate$ = this.priceUpdateSubject.asObservable();

    getAllStocks(): MSEStock[] {
        return Array.from(this.stocks.values());
    }

    getStock(symbol: string): MSEStock | undefined {
        return this.stocks.get(symbol.toUpperCase());
    }

    updatePrice(symbol: string, newPrice: string): MSEStock {
        const stock = this.stocks.get(symbol.toUpperCase());
        if (!stock) {
            throw new Error(`Stock ${symbol} not found`);
        }

        const oldPrice = parseFloat(stock.price);
        const updatedPrice = parseFloat(newPrice);
        const change = updatedPrice - oldPrice;
        const changePercent = (change / oldPrice) * 100;

        const updatedStock: MSEStock = {
            ...stock,
            price: updatedPrice.toFixed(2),
            change: change.toFixed(2),
            changePercent: changePercent.toFixed(2),
            lastUpdate: new Date().toISOString(),
        };

        this.stocks.set(symbol.toUpperCase(), updatedStock);
        this.priceUpdateSubject.next(updatedStock);

        this.logger.log(`Updated MSE stock ${symbol}: ${updatedStock.price} MWK (${updatedStock.changePercent}%)`);
        return updatedStock;
    }
}
