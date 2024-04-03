import { Injectable, Logger } from '@nestjs/common';
import { KucoinService } from 'src/market/services/kucoin/kucoin.service';
import { OmpfinexService } from 'src/market/services/ompfinex/ompfinex.service';
import { BinanceService } from 'src/market/services/binance/binance.service';
import { combineLatest, map } from 'rxjs';

@Injectable()
export class MarketService {
  private readonly logger = new Logger(MarketService.name);

  constructor(
    private readonly kucoinService: KucoinService,
    private readonly ompfinexService: OmpfinexService,
    private readonly binanceService: BinanceService,
  ) {}

  exchangesConnect() {
    this.ompfinexService
      .getOmpfinexMarkets()
      .then(() => {
        this.ompfinexService.createConnection();
        this.ompfinexService.createSubscription();
        this.binanceService.createSubscription();
        this.kucoinService.createConnection().then();
      })
      .catch((reason) => {
        this.logger.error(reason);
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
