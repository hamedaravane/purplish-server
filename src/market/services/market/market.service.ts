import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { KucoinService } from '@market/services/kucoin/kucoin.service';
import { OmpfinexService } from '@market/services/ompfinex/ompfinex.service';
import { BinanceService } from '@market/services/binance/binance.service';
import { Observable, combineLatest, distinctUntilKeyChanged, map } from 'rxjs';
import {
  MarketComparison,
  combineExchanges,
} from '@market/interfaces/market.interface';

@Injectable()
export class MarketService implements OnModuleInit {
  private readonly logger = new Logger(MarketService.name);

  constructor(
    private readonly kucoinService: KucoinService,
    private readonly ompfinexService: OmpfinexService,
    private readonly binanceService: BinanceService,
  ) {}

  private kucoinWsResponse$ =
    this.kucoinService.kucoinWsResponseSubject.asObservable();

  private binanceWsResponse$ =
    this.binanceService.binanceWsResponseSubject.asObservable();

  /** @deprecated */
  private ompfinexMarketWs$ =
    this.ompfinexService.ompfinexMarketWsSubject.asObservable();

  private ompfinexOrderBookWs$ =
    this.ompfinexService.ompfinexOrderBookWsSubject.asObservable();

  onModuleInit(): any {
    this.connectToExchanges().then();
  }

  async connectToExchanges() {
    await this.ompfinexService.getOmpfinexMarkets();
    this.ompfinexService.createConnection();
    // this.ompfinexService.createSubscription();
    this.ompfinexService.createOrderBookSubscription();
    await this.kucoinService.createConnection();
    this.binanceService.createConnection();
  }

  combineMarkets$(): Observable<MarketComparison> {
    return combineLatest([
      this.ompfinexOrderBookWs$,
      this.kucoinWsResponse$,
      this.binanceWsResponse$,
    ]).pipe(
      map(([omp, kucoin, binance]) => {
        return combineExchanges(omp, kucoin, binance);
      }),
    );
  }
}
