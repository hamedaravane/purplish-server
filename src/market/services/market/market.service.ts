import { Injectable } from '@nestjs/common';
import { KucoinService } from 'src/market/services/kucoin/kucoin.service';
import { OmpfinexService } from 'src/market/services/ompfinex/ompfinex.service';
import { BinanceService } from 'src/market/services/binance/binance.service';
import { combineLatest, map } from 'rxjs';

@Injectable()
export class MarketService {
  constructor(
    private readonly kucoinService: KucoinService,
    private readonly ompfinexService: OmpfinexService,
    private readonly binanceService: BinanceService,
  ) {}

  exchangesConnect() {
    this.ompfinexService.createConnection();
    this.ompfinexService.createSubscription();
    this.ompfinexService.getOmpfinexMarkets().then(() => {
      this.binanceService.createSubscription();
      this.kucoinService.createConnection().then();
    });
  }

  combineMarkets() {
    return combineLatest([
      this.kucoinService.kucoinWSResponseSubject,
      this.binanceService.binanceWSResponseSubject,
      this.ompfinexService.ompfinexWSResponseSubject,
    ]).pipe(
      map(([kucoin, binance, omp]) => {
        return {};
      }),
    );
  }
}
