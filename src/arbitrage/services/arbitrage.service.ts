import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { MarketService } from '@market/services/market/market.service';
import { filter, firstValueFrom, map, Subject, tap } from 'rxjs';
import { AxiosResponse } from 'axios';
import {
  CurrencyArbitrageData,
  OmpfinexApiResponse,
  UserData,
} from '@arbitrage/interface/arbitrage.interface';
import { endpoints } from '@market/environments/endpoints';
import Big from 'big.js';

@Injectable()
export class ArbitrageService {
  constructor(
    private readonly httpService: HttpService,
    private readonly marketService: MarketService,
  ) {}
  private readonly logger = new Logger(ArbitrageService.name);
  private readonly ompfinexTransactionFeeSubject = new Subject<number>();
  private ompfinexTransactionFee = 0.35;

  public ompfinexTransactionFee$ =
    this.ompfinexTransactionFeeSubject.asObservable();

  private async getOmpfinexUserData() {
    try {
      const userData = await firstValueFrom(
        this.httpService
          .get<
            AxiosResponse<OmpfinexApiResponse<UserData>>
          >(`${endpoints.ompfinexApiBaseUrl}/v1/user`)
          .pipe(map((res) => res.data.data.data)),
      );
      this.ompfinexTransactionFee = userData.transaction_fee;
      this.ompfinexTransactionFeeSubject.next(userData.transaction_fee);
    } catch (e) {
      this.logger.error(e);
      this.ompfinexTransactionFeeSubject.next(0.35);
    }
  }

  getCurrencyArbitrageData$() {
    return this.marketService.combineMarkets$().pipe(
      map((combinedMarket) => {
        if (combinedMarket.binance) {
          return {
            currencyId: combinedMarket.currencyId,
            currencyName: combinedMarket.currencyName,
            iconPath: combinedMarket.iconPath,
            name: combinedMarket.name,
            comparedWith: combinedMarket.binance.exchange.name,
            diffPercentage: combinedMarket.binance.diffPricePercent,
            label: this.getWorthOfAction(
              combinedMarket.binance.diffPricePercent,
              this.ompfinexTransactionFee,
            ),
            targetPrice: combinedMarket.binance.price,
            actionPrice: combinedMarket.ompfinex.price,
          } as CurrencyArbitrageData;
        }
        if (combinedMarket.kucoin) {
          return {
            currencyId: combinedMarket.currencyId,
            currencyName: combinedMarket.currencyName,
            iconPath: combinedMarket.iconPath,
            name: combinedMarket.name,
            comparedWith: combinedMarket.kucoin.exchange.name,
            diffPercentage: combinedMarket.kucoin.diffPricePercent,
            label: this.getWorthOfAction(
              combinedMarket.kucoin.diffPricePercent,
              this.ompfinexTransactionFee,
            ),
            targetPrice: combinedMarket.kucoin.price,
            actionPrice: combinedMarket.ompfinex.price,
          } as CurrencyArbitrageData;
        }
        return null;
      }),
      filter((currencyArbitrageData) => {
        if (currencyArbitrageData) {
          return Big(currencyArbitrageData.label).gt(0);
        }
      }),
    );
  }

  private getWorthOfAction(diffPricePercent: number, fee: number): number {
    const netProfitPercentage = Big(diffPricePercent)
      .abs()
      .minus(Big(fee).times(2));
    if (netProfitPercentage.lte(0)) return 0;
    const rating = netProfitPercentage.div(5);
    return Math.min(Math.max(rating.toNumber(), 0.5), 5);
  }
}
