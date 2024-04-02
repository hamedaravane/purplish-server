export interface Market {
  id: number;
  currencyId: string;
  currencyName: string;
  iconPath: string;
  name: string;
  ompfinex: {
    exchangeIcon: string;
    timestamp: number;
    volume: number;
    price: number;
  };
  kucoin: {
    exchangeIcon: string;
    volume?: number;
    price?: number;
    diffPrice?: number;
    diffPricePercent?: number;
  };
}
