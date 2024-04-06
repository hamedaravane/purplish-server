interface MarketComparison {
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
}

interface MarketDetailsWithDiff extends MarketDetails {
  exchange: {
    name: string;
    logo: string;
    ranking: number;
  };
  diffPrice: number;
  diffPricePercent: number;
}
