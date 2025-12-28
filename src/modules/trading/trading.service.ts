import { Injectable } from '@nestjs/common';

export interface Position {
  symbol: string;
  side: 'BUY' | 'SELL';
  size: number;
  avgPrice: number;
}

@Injectable()
export class TradingService {
  private positions: Record<string, Position> = {};
  private fee = 0.001; // 0.1%

  simulateMarketOrder(symbol: string, side: 'BUY' | 'SELL', size: number, price: number) {
    const cost = size * price * (1 + this.fee);
    const pos = this.positions[symbol];

    if (!pos) {
      this.positions[symbol] = { symbol, side, size, avgPrice: price };
    } else {
      // simple average price calculation
      // If same side, average the price
      if (pos.side === side) {
        const totalSize = pos.size + size;
        const newAvg = (pos.avgPrice * pos.size + price * size) / totalSize;
        this.positions[symbol] = { symbol, side, size: totalSize, avgPrice: newAvg };
      } else {
        // Opposing side: reduce position (simplified, no PnL realization tracking here for brevity)
        // If size > pos.size, flip side
        if (size > pos.size) {
          const remaining = size - pos.size;
          this.positions[symbol] = { symbol, side, size: remaining, avgPrice: price };
        } else if (size < pos.size) {
          this.positions[symbol] = { ...pos, size: pos.size - size };
        } else {
          delete this.positions[symbol];
        }
      }
    }

    return {
      symbol,
      side,
      executedPrice: price,
      size,
      fee: size * price * this.fee,
      cost
    };
  }

  getPositions() {
    return Object.values(this.positions);
  }
}