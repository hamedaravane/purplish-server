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
}

export function convertToOmpfinexMarketDomain(
  data: OmpfinexMarketDto[],
): OmpfinexMarket[] {
  return data.map((market) => {
    return {
      id: market.id,
      baseCurrency: {
        id: market.base_currency.id,
        iconPath: market.base_currency.icon_path,
        name: market.base_currency.name,
      },
      quoteCurrency: {
        id: market.quote_currency.id,
        iconPath: market.quote_currency.icon_path,
        name: market.quote_currency.name,
      },
      name: market.name,
    };
  });
}

export interface OmpfinexMarketWebsocketDto {
  price: string;
  v: string;
  t: number;
  m: number;
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
}

export function convertOmpfinexWsResponse(
  ws: OmpfinexMarketWebsocketDto,
  marketMap: Map<string, OmpfinexMarket>,
): OmpfinexMarketWebsocket {
  const foundMarket = Array.from(marketMap, ([, value]) => value).find(
    (market) => ws.m === market.id,
  );
  return {
    id: ws.m,
    currencyId: foundMarket?.baseCurrency.id,
    currencyName: foundMarket?.baseCurrency.name,
    iconPath: foundMarket?.baseCurrency.iconPath,
    name: foundMarket?.name,
    timestamp: ws.t,
    volume: ws.v,
    price: ws.price,
  };
}
