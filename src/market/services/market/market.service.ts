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
      this.ompfinexService.ompfinexWsResponseSubject,
      this.kucoinService.kucoinWSResponseSubject,
      this.binanceService.binanceWSResponseSubject,
    ]).pipe(
      map(([omp, kucoin, binance]) => {
        return omp.map((ompMarket) => {
          return {
            currencyId: ompMarket.currencyId,
            currencyName: ompMarket.currencyName,
            iconPath: ompMarket.iconPath,
            name: ompMarket.name,
            ompfinex: {
              timestamp: ompMarket.timestamp,
              volume: ompMarket.volume,
              price: ompMarket.price,
            },
            kucoin: {
              volume: ompMarket.volume,
              price: ompMarket.price,
            },
            binance: {
              volume: ompMarket.volume,
              price: ompMarket.price,
            },
          };
        });
      }),
    );
  }
}
