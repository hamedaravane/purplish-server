import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { endpoints } from '../../market/environments/endpoints';
import { firstValueFrom, map, Subject } from 'rxjs';
import { AxiosResponse } from 'axios';
import {
  CurrencyArbitrageData,
  OmpfinexApiResponse,
  UserData,
} from '../interface/arbitrage.interface';
import { MarketService } from '../../market/services/market/market.service';
import Big from 'big.js';

@Injectable()
export class ArbitrageService {
  constructor(
    private readonly httpService: HttpService,
    private readonly marketService: MarketService,
  ) {}
  private readonly logger = new Logger(ArbitrageService.name);
  private readonly ompfinexTransactionFeeSubject = new Subject<number>();
  private ompfinexTransactionFee = 0.0035;
  private readonly marketsSubject = this.marketService.marketComparisonSubject;
  public readonly filteredMarketsSubject = new Subject<
    CurrencyArbitrageData[]
  >();
  public ompfinexTransactionFee$ =
    this.ompfinexTransactionFeeSubject.asObservable();

  private getOmpfinexUserData() {
    firstValueFrom(
      this.httpService
        .get<
          AxiosResponse<OmpfinexApiResponse<UserData>>
        >(`${endpoints.ompfinexApiBaseUrl}/v1/user`)
        .pipe(map((res) => res.data.data.data)),
    )
      .then((userData) => {
        this.ompfinexTransactionFee = userData.transaction_fee;
        this.ompfinexTransactionFeeSubject.next(userData.transaction_fee);
      })
      .catch((err) => {
        this.logger.error(err);
      })
      .finally(() => {
        this.ompfinexTransactionFeeSubject.next(0.35);
      });
  }

  public findOpportunity() {
    this.marketsSubject
      .asObservable()
      .pipe(
        map((value) => {
          return value
            .map((market) => {
              if (market.binance) {
                return {
                  currencyId: market.currencyId,
                  currencyName: market.currencyName,
                  iconPath: market.iconPath,
                  name: market.name,
                  comparedWith: market.binance.exchange.name,
                  diffPercentage: market.binance.diffPricePercent,
                  label: this.getWorthOfAction(
                    market.binance.diffPricePercent,
                    this.ompfinexTransactionFee,
                  ),
                  targetPrice: market.binance.price,
                  actionPrice: market.ompfinex.price,
                } as CurrencyArbitrageData;
              }
              if (market.kucoin) {
                return {
                  currencyId: market.currencyId,
                  currencyName: market.currencyName,
                  iconPath: market.iconPath,
                  name: market.name,
                  comparedWith: market.kucoin.exchange.name,
                  diffPercentage: market.kucoin.diffPricePercent,
                  label: this.getWorthOfAction(
                    market.kucoin.diffPricePercent,
                    this.ompfinexTransactionFee,
                  ),
                  targetPrice: market.kucoin.price,
                  actionPrice: market.ompfinex.price,
                } as CurrencyArbitrageData;
              }
              return null;
            })
            .filter((value: CurrencyArbitrageData | null) => {
              if (value) {
                return Big(value.label).gt(0);
              } else {
                return false;
              }
            })
            .sort((a, b) => b.label - a.label);
        }),
      )
      .subscribe((value: CurrencyArbitrageData[]) => {
        this.filteredMarketsSubject.next(value);
      });
  }

  private getWorthOfAction(diffPricePercent: number, fee: number): number {
    const netProfitPercentage = Big(diffPricePercent)
      .abs()
      .minus(Big(fee).times(2));
    if (netProfitPercentage.lte(0)) return 0;
    const rating = netProfitPercentage.div(8).plus(0.5);
    return Math.min(Math.max(rating.toNumber(), 0.5), 5);
  }
}
