import { WsMessageAggTradeFormatted } from 'binance/lib/types/websockets';
import { OmpfinexOrderBookWsResponse } from '@market/interfaces/ompfinex.interface';
import { MarketData } from '@market/interfaces/kucoin.interface';
import Big from 'big.js';

export interface MarketComparison {
  currencyId: string;
  currencyName: string;
  iconPath: string;
  name: string;
  sourceMarkets: SourceMarket[];
  destinationMarkets: DestinationMarket[];
}

interface SourceMarket {
  timestamp: number;
  buy: {
    price: number;
    volume: number;
  };
  sell: {
    price: number;
    volume: number;
  };
}

export interface DestinationMarket {
  exchange: {
    name: string;
    logo: string;
    ranking: number;
  };
  timestamp: number;
  matchVolume: number;
  matchPrice: number;
  arbitrage: {
    buy: {
      amount: number;
      percentage: number;
    };
    sell: {
      amount: number;
      percentage: number;
    };
  };
}

export function combineExchanges(
  omp: OmpfinexOrderBookWsResponse,
  kucoin: Map<string, MarketData>,
  binance: Map<string, WsMessageAggTradeFormatted>,
): MarketComparison {
  const binanceFound: WsMessageAggTradeFormatted | undefined = binance.get(
    omp.currencyId,
  );
  const kucoinFound: MarketData | undefined = kucoin.get(omp.currencyId);
  return {
    currencyId: omp.currencyId,
    currencyName: omp.currencyName,
    iconPath: omp.iconPath,
    name: omp.name,
    sourceMarkets: [
      {
        timestamp: new Date().getDate(),
        buy: {
          price: Big(omp.buyPrice).toNumber(),
          volume: Big(omp.buyVolume).toNumber(),
        },
        sell: {
          price: Big(omp.sellPrice).toNumber(),
          volume: Big(omp.sellVolume).toNumber(),
        },
      } as SourceMarket,
    ],
    destinationMarkets: [
      binanceFound
        ? ({
            exchange: {
              name: 'binance',
              logo: '',
              ranking: 1,
            },
            timestamp: binanceFound.time,
            matchVolume: binanceFound.quantity,
            matchPrice: binanceFound.price,
            arbitrage: {
              buy: {
                amount: Big(binanceFound.price).minus(omp.buyPrice).toNumber(),
                percentage: Big(binanceFound.price)
                  .minus(omp.buyPrice)
                  .div(omp.buyPrice)
                  .times(100)
                  .toNumber(),
              },
              sell: {
                amount: Big(binanceFound.price).minus(omp.sellPrice).toNumber(),
                percentage: Big(binanceFound.price)
                  .minus(omp.sellPrice)
                  .div(omp.sellPrice)
                  .times(100)
                  .toNumber(),
              },
            },
          } as DestinationMarket)
        : null,
      normalizeKucoinMarket(omp, kucoinFound),
    ] as DestinationMarket[],
  };
}

function normalizeKucoinMarket(
  sourceMarket: OmpfinexOrderBookWsResponse,
  desMarket: MarketData | undefined,
): DestinationMarket | undefined {
  if (!desMarket) return undefined;
  const arbitrageBuy = Big(desMarket.buy)
    .minus(sourceMarket.buyPrice)
    .toNumber();
  const arbitrageBuyPercent = Big(arbitrageBuy)
    .div(sourceMarket.buyPrice)
    .times(100)
    .toNumber();
  const arbitrageSell = Big(desMarket.sell)
    .minus(sourceMarket.sellPrice)
    .toNumber();
  const arbitrageSellPercent = Big(arbitrageSell)
    .div(sourceMarket.sellPrice)
    .times(100)
    .toNumber();
  return {
    exchange: {
      name: 'kucoin',
      logo: '',
      ranking: 7,
    },
    timestamp: desMarket.datetime,
    matchVolume: desMarket.vol,
    matchPrice: desMarket.lastTradedPrice,
    arbitrage: {
      buy: {
        amount: arbitrageBuy,
        percentage: arbitrageBuyPercent,
      },
      sell: {
        amount: arbitrageSell,
        percentage: arbitrageSellPercent,
      },
    },
  };
}

function normalizeBinanceMarket(
  sourceMarket: OmpfinexOrderBookWsResponse,
  desMarket: WsMessageAggTradeFormatted,
) {}
