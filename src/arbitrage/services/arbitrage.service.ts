import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { MarketService } from '@market/services/market/market.service';
import { Subject, filter, firstValueFrom, map } from 'rxjs';
import { AxiosResponse } from 'axios';
import {
  CurrencyArbitrageData,
  OmpfinexApiResponse,
  UserData,
} from '@arbitrage/interface/arbitrage.interface';
import { endpoints } from '@market/environments/endpoints';
import Big from 'big.js';
import { MarketComparison } from '@market/interfaces/market.interface';

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
      map<MarketComparison, CurrencyArbitrageData | null>((combinedMarket) => {
        if (combinedMarket.binance) {
          const isLong = Big(combinedMarket.binance.matchPrice).gt(
            combinedMarket.ompfinex.sellPrice,
          );
          return {
            currencyId: combinedMarket.currencyId,
            currencyName: combinedMarket.currencyName,
            iconPath: combinedMarket.iconPath,
            comparisonExchange: combinedMarket.binance.exchange.name,
            priceDiffPercentageWithBuy:
              combinedMarket.binance.diffPricePercentWithBuy,
            priceDiffPercentageWithSell:
              combinedMarket.binance.diffPricePercentWithSell,
            label: this.getWorthOfAction(
              combinedMarket.binance.diffPriceWithSell,
              this.ompfinexTransactionFee,
            ),
            currentBuyPrice: Big(combinedMarket.ompfinex.buyPrice).toNumber(),
            currentBuyVolume: Big(combinedMarket.ompfinex.buyVolume).toNumber(),
            currentSellPrice: Big(combinedMarket.ompfinex.sellPrice).toNumber(),
            currentSellVolume: Big(
              combinedMarket.ompfinex.sellVolume,
            ).toNumber(),
            targetPrice: combinedMarket.binance.matchPrice,
            position: isLong ? 'long' : 'short',
            isTouchedTarget: false,
          } as CurrencyArbitrageData;
        }
        if (combinedMarket.kucoin) {
          const isLong = Big(combinedMarket.kucoin.matchPrice).gt(
            combinedMarket.ompfinex.sellPrice,
          );
          return {
            currencyId: combinedMarket.currencyId,
            currencyName: combinedMarket.currencyName,
            iconPath: combinedMarket.iconPath,
            comparisonExchange: combinedMarket.kucoin.exchange.name,
            priceDiffPercentageWithBuy:
              combinedMarket.kucoin.diffPricePercentWithBuy,
            priceDiffPercentageWithSell:
              combinedMarket.kucoin.diffPricePercentWithSell,
            label: this.getWorthOfAction(
              combinedMarket.kucoin.diffPriceWithSell,
              this.ompfinexTransactionFee,
            ),
            currentBuyPrice: Big(combinedMarket.ompfinex.buyPrice).toNumber(),
            currentBuyVolume: Big(combinedMarket.ompfinex.buyVolume).toNumber(),
            currentSellPrice: Big(combinedMarket.ompfinex.sellPrice).toNumber(),
            currentSellVolume: Big(
              combinedMarket.ompfinex.sellVolume,
            ).toNumber(),
            targetPrice: combinedMarket.kucoin.matchPrice,
            position: isLong ? 'long' : 'short',
            isTouchedTarget: false,
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

  private getAvailableExchange(combinedMarket: MarketComparison) {
    if (combinedMarket.binance) {
      return combinedMarket.binance;
    } else if (combinedMarket.kucoin) {
      return combinedMarket.kucoin;
    } else {
      return null;
    }
  }
}
