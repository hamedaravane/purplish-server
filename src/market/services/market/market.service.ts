import { Injectable, Logger } from '@nestjs/common';
import { KucoinService } from 'src/market/services/kucoin/kucoin.service';
import { OmpfinexService } from 'src/market/services/ompfinex/ompfinex.service';
import { BinanceService } from 'src/market/services/binance/binance.service';
import { combineLatest, map, Subject } from 'rxjs';
import Big from 'big.js';

@Injectable()
export class MarketService {
  private readonly logger = new Logger(MarketService.name);
  public readonly marketComparisonSubject = new Subject<MarketComparison[]>();

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

  combineMarkets() {
    return combineLatest([
      this.ompfinexService.ompfinexWsResponseSubject,
      this.kucoinService.kucoinWsResponseSubject,
      this.binanceService.binanceWsResponseSubject,
    ])
      .pipe(
        map(([omp, kucoin, binance]) => {
          return omp.map((ompMarket) => {
            const kucoinFound = kucoin.get(ompMarket.currencyId);
            const binanceFound = binance.get(ompMarket.currencyId);
            return {
              currencyId: ompMarket.currencyId,
              currencyName: ompMarket.currencyName,
              iconPath: ompMarket.iconPath,
              name: ompMarket.name,
              ompfinex: {
                timestamp: ompMarket.timestamp,
                volume: Big(ompMarket.volume).toNumber(),
                price: Big(ompMarket.price).toNumber(),
              },
              binance: binanceFound
                ? {
                    exchange: {
                      name: 'binance',
                      logo: '',
                      ranking: 1,
                    },
                    timestamp: binanceFound.time,
                    volume: binanceFound.quantity,
                    price: binanceFound.price,
                    diffPrice: Big(binanceFound.price)
                      .minus(ompMarket.price)
                      .toNumber(),
                    diffPricePercent: Big(binanceFound.price)
                      .minus(ompMarket.price)
                      .div(binanceFound.price)
                      .times(100)
                      .toNumber(),
                  }
                : null,
              kucoin: kucoinFound
                ? {
                    exchange: {
                      name: 'kucoin',
                      logo: '',
                      ranking: 7,
                    },
                    timestamp: kucoinFound.datetime,
                    volume: kucoinFound.vol,
                    price: kucoinFound.lastTradedPrice,
                    diffPrice: Big(kucoinFound.lastTradedPrice)
                      .minus(ompMarket.price)
                      .toNumber(),
                    diffPricePercent: Big(kucoinFound.lastTradedPrice)
                      .minus(ompMarket.price)
                      .div(kucoinFound.lastTradedPrice)
                      .times(100)
                      .toNumber(),
                  }
                : null,
            } as MarketComparison;
          });
        }),
      )
      .subscribe((value) => {
        this.marketComparisonSubject.next(value);
      });
  }
}
