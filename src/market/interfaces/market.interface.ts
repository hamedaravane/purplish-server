import { WsMessageAggTradeFormatted } from 'binance/lib/types/websockets';
import { OmpfinexOrderBookWsResponse } from '@market/interfaces/ompfinex.interface';
import { MarketData } from '@market/interfaces/kucoin.interface';
import Big from 'big.js';

export interface MarketComparison {
  currencyId: string;
  currencyName: string;
  iconPath: string;
  name: string;
  ompfinex: SourceMarket;
  binance: DestinationMarket | null;
  kucoin: DestinationMarket | null;
}

interface SourceMarket {
  timestamp: number;
  buyPrice: string;
  buyVolume: string;
  sellPrice: string;
  sellVolume: string;
}

export interface DestinationMarket {
  exchange: {
    name: string;
    logo: string;
    ranking: number;
  };
  timestamp: number;
  volume: number;
  price: number;
  diffPriceWithBuy: number;
  diffPriceWithSell: number;
  diffPricePercentWithBuy: number;
  diffPricePercentWithSell: number;
}

export function combineExchanges(
  omp: OmpfinexOrderBookWsResponse,
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
      timestamp: new Date().getDate(),
      buyPrice: omp.buyPrice,
      buyVolume: omp.buyVolume,
      sellPrice: omp.sellPrice,
      sellVolume: omp.sellVolume,
    } as SourceMarket,
    binance: binanceFound
      ? ({
          exchange: {
            name: 'binance',
            logo: '',
            ranking: 1,
          },
          timestamp: binanceFound.time,
          volume: binanceFound.quantity,
          price: binanceFound.price,
          diffPriceWithBuy: Big(binanceFound.price)
            .minus(omp.buyPrice)
            .toNumber(),
          diffPricePercentWithBuy: Big(binanceFound.price)
            .minus(omp.buyPrice)
            .div(binanceFound.price)
            .times(100)
            .toNumber(),
          diffPriceWithSell: Big(binanceFound.price)
            .minus(omp.sellPrice)
            .toNumber(),
          diffPricePercentWithSell: Big(binanceFound.price)
            .minus(omp.sellPrice)
            .div(binanceFound.price)
            .times(100)
            .toNumber(),
        } as DestinationMarket)
      : null,
    kucoin: kucoinFound
      ? ({
          exchange: {
            name: 'kucoin',
            logo: '',
            ranking: 7,
          },
          timestamp: kucoinFound.datetime,
          volume: kucoinFound.vol,
          price: kucoinFound.lastTradedPrice,
          diffPriceWithBuy: Big(kucoinFound.lastTradedPrice)
            .minus(omp.buyPrice)
            .toNumber(),
          diffPricePercentWithBuy: Big(kucoinFound.lastTradedPrice)
            .minus(omp.buyPrice)
            .div(kucoinFound.lastTradedPrice)
            .times(100)
            .toNumber(),
          diffPriceWithSell: Big(kucoinFound.lastTradedPrice)
            .minus(omp.sellPrice)
            .toNumber(),
          diffPricePercentWithSell: Big(kucoinFound.lastTradedPrice)
            .minus(omp.sellPrice)
            .div(kucoinFound.lastTradedPrice)
            .times(100)
            .toNumber(),
        } as DestinationMarket)
      : null,
  } as MarketComparison;
}
