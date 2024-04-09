import { WsMessageAggTradeFormatted } from 'binance/lib/types/websockets';
import { OmpfinexMarketWebsocket } from '@market/interfaces/ompfinex.interface';
import { MarketData } from '@market/interfaces/kucoin.interface';
import Big from 'big.js';

export interface MarketComparison {
  currencyId: string;
  currencyName: string;
  iconPath: string;
  name: string;
  ompfinex: MarketDetails;
  binance: MarketDetailsWithDiff | null;
  kucoin: MarketDetailsWithDiff | null;
}

interface MarketDetails {
  timestamp: number;
  volume: number;
  price: number;
  minPrice?: number;
  maxPrice?: number;
}

export interface MarketDetailsWithDiff extends MarketDetails {
  exchange: {
    name: string;
    logo: string;
    ranking: number;
  };
  diffPrice: number;
  diffPricePercent: number;
}

export function combineExchanges(
  omp: OmpfinexMarketWebsocket,
  kucoin: Map<string, MarketData>,
  binance: Map<string, WsMessageAggTradeFormatted>,
) {
  const kucoinFound = kucoin.get(omp.currencyId);
  const binanceFound = binance.get(omp.currencyId);
  return {
    currencyId: omp.currencyId,
    currencyName: omp.currencyName,
    iconPath: omp.iconPath,
    name: omp.name,
    ompfinex: {
      timestamp: omp.timestamp,
      minPrice: omp.minPrice,
      maxPrice: omp.maxPrice,
      volume: Big(omp.volume).toNumber(),
      price: Big(omp.price).toNumber(),
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
          diffPrice: Big(binanceFound.price).minus(omp.price).toNumber(),
          diffPricePercent: Big(binanceFound.price)
            .minus(omp.price)
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
            .minus(omp.price)
            .toNumber(),
          diffPricePercent: Big(kucoinFound.lastTradedPrice)
            .minus(omp.price)
            .div(kucoinFound.lastTradedPrice)
            .times(100)
            .toNumber(),
        }
      : null,
  } as MarketComparison;
}
