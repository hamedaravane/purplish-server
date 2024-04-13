import Big from 'big.js';

export interface OmpfinexDataResponse<T> {
  status: string;
  data: T;
}

interface OmpfinexMarketCurrency {
  id: string;
  icon_path: string;
  name: string;
}

export interface OmpfinexMarketDto {
  id: number;
  base_currency: OmpfinexMarketCurrency;
  quote_currency: OmpfinexMarketCurrency;
  name: string;
  min_price: number;
  max_price: number;
  last_price: number;
  day_change_percent: number;
  tradingview_symbol: string;
  liked_by_user: boolean;
}

export interface OmpfinexMarket {
  id: number;
  baseCurrency: {
    id: string;
    iconPath: string;
    name: string;
  };
  quoteCurrency: {
    id: string;
    iconPath: string;
    name: string;
  };
  name: string;
  minPrice: number;
  maxPrice: number;
  lastPrice: number;
}

export function convertToOmpfinexMarketDomain(
  dto: OmpfinexMarketDto,
): OmpfinexMarket {
  return {
    id: dto.id,
    baseCurrency: {
      id: dto.base_currency.id,
      iconPath: dto.base_currency.icon_path,
      name: dto.base_currency.name,
    },
    quoteCurrency: {
      id: dto.quote_currency.id,
      iconPath: dto.quote_currency.icon_path,
      name: dto.quote_currency.name,
    },
    name: dto.name,
    minPrice: dto.min_price,
    maxPrice: dto.max_price,
    lastPrice: dto.last_price,
  };
}

export interface OmpfinexMarketWebsocketDto {
  price: string;
  v: string;
  t: number;
  m: number;
}

export interface OmpfinexOrderBookWebsocketDto {
  p: string;
  a: string;
  t: 'sell' | 'buy';
}

export function findPriceExtremes(
  orderBookWsDto: OmpfinexOrderBookWebsocketDto[],
): priceExtremes {
  const bestBuyOrder = orderBookWsDto
    .filter((data) => data.t === 'buy')
    .sort((a, b) => {
      return Big(b.p).minus(a.p).toNumber();
    })[0];
  const bestSellOrder = orderBookWsDto
    .filter((data) => data.t === 'sell')
    .sort((a, b) => {
      return Big(a.p).minus(b.p).toNumber();
    })[0];
  return {
    buyPrice: bestBuyOrder.p,
    buyVolume: bestBuyOrder.a,
    sellPrice: bestSellOrder.p,
    sellVolume: bestSellOrder.a,
  };
}

export interface priceExtremes {
  buyPrice: string;
  buyVolume: string;
  sellPrice: string;
  sellVolume: string;
}

export interface OmpfinexOrderBookWsResponse {
  id: number;
  name: string;
  iconPath?: string;
  currencyId: string;
  currencyName: string;
  buyPrice: string;
  buyVolume: string;
  sellPrice: string;
  sellVolume: string;
}

export function convertOmpfinexOrderBookWsResponse(
  ws: priceExtremes,
  market: OmpfinexMarket,
): OmpfinexOrderBookWsResponse {
  return {
    id: market.id,
    name: market.name,
    iconPath: market.baseCurrency.iconPath,
    currencyId: market.baseCurrency.id,
    currencyName: market.baseCurrency.name,
    buyPrice: ws.buyPrice,
    buyVolume: ws.buyVolume,
    sellPrice: ws.sellPrice,
    sellVolume: ws.sellVolume,
  };
}

export interface OmpfinexMarketWebsocket {
  id: number;
  currencyId?: string;
  currencyName?: string;
  iconPath?: string;
  name?: string;
  timestamp: number;
  volume: string;
  price: string;
  minPrice: number;
  maxPrice: number;
}

export function convertOmpfinexWsResponse(
  dto: OmpfinexMarketWebsocketDto,
  marketMap: Map<string, OmpfinexMarket>,
): OmpfinexMarketWebsocket {
  const foundMarket = Array.from(marketMap, ([, value]) => value).find(
    (market) => dto.m === market.id,
  );
  return {
    id: dto.m,
    currencyId: foundMarket?.baseCurrency.id,
    currencyName: foundMarket?.baseCurrency.name,
    iconPath: foundMarket?.baseCurrency.iconPath,
    name: foundMarket?.name,
    timestamp: dto.t,
    volume: dto.v,
    price: dto.price,
    minPrice: foundMarket?.minPrice,
    maxPrice: foundMarket?.maxPrice,
  };
}
