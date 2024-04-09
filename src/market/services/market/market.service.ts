import { Injectable, Logger } from '@nestjs/common';
import { KucoinService } from '@market/services/kucoin/kucoin.service';
import { OmpfinexService } from '@market/services/ompfinex/ompfinex.service';
import { BinanceService } from '@market/services/binance/binance.service';
import { combineLatest, map, Observable, share } from 'rxjs';
import {
  combineExchanges,
  MarketComparison,
} from '@market/interfaces/market.interface';

@Injectable()
export class MarketService {
  private readonly logger = new Logger(MarketService.name);

  constructor(
    private readonly kucoinService: KucoinService,
    private readonly ompfinexService: OmpfinexService,
    private readonly binanceService: BinanceService,
  ) {}

  async connectToExchanges() {
    await this.ompfinexService.getOmpfinexMarkets();
    this.ompfinexService.createConnection();
    this.ompfinexService.createSubscription();
    this.binanceService.createConnection();
    await this.kucoinService.createConnection();
  }

  combineMarkets$(): Observable<MarketComparison> {
    return combineLatest([
      this.ompfinexService.ompfinexMarketWebsocket$,
      this.kucoinService.kucoinWsResponseSubject,
      this.binanceService.binanceWsResponseSubject,
    ]).pipe(
      map(([omp, kucoin, binance]) => {
        return combineExchanges(omp, kucoin, binance);
      }),
      share(),
    );
  }
}
