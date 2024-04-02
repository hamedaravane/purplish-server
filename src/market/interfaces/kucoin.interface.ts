export interface KucoinPublicBulletResponse {
  code: string;
  data: KucoinPublicTokenData;
}

export interface KucoinPublicTokenData {
  token: string;
  instanceServers: KucoinInstanceServer[];
}

export interface KucoinInstanceServer {
  endpoint: string;
  encrypt: boolean;
  protocol: string;
  pingInterval: number;
  pingTimeout: number;
}

export interface KucoinSubscription {
  id: string;
  type: 'subscribe' | 'ping';
  topic?: string;
  privateChannel?: false;
  response?: boolean;
}

export interface KucoinWebsocketMessage {
  id: string;
  type: 'welcome' | 'ack' | 'pong' | 'message';
  topic?: string;
  subject?: string;
  data?: KucoinWebsocketMarketSnapshotData;
}

export interface KucoinWebsocketMarketSnapshotData {
  sequence: number;
  data: MarketData;
}

export interface MarketData {
  trading: boolean;
  symbol: string;
  buy: number;
  sell: number;
  sort: number;
  volValue: number;
  baseCurrency: string;
  market: string;
  quoteCurrency: string;
  symbolCode: string;
  datetime: number;
  high: number;
  vol: number;
  low: number;
  changePrice: number;
  changeRate: number;
  lastTradedPrice: number;
  board: number;
  mark: number;
  askSize?: number;
  averagePrice?: number;
  bidSize?: number;
  close?: number;
  makerCoefficient?: number;
  makerFeeRate?: number;
  marginTrade?: boolean;
  open?: number;
  takerCoefficient?: number;
  takerFeeRate?: number;
  marketChange1h?: MarketChange;
  marketChange4h?: MarketChange;
  marketChange24h?: MarketChange;
  markets?: string[];
}

export interface MarketChange {
  changePrice: number;
  changeRate: number;
  high: number;
  low: number;
  open: number;
  vol: number;
  volValue: number;
}

export interface KucoinMarketList {
  data: string[];
  code: string;
}

export interface KucoinCurrencyListData {
  code: string;
  data: KucoinCurrencyList[];
}

export interface KucoinCurrencyList {
  currency: string;
  name: string;
  fullName: string;
  precision: number;
  confirms: null;
  contractAddress: null;
  isMarginEnabled: boolean;
  isDebitEnabled: boolean;
  chains: KucoinCurrencyChain[];
}

export interface KucoinCurrencyChain {
  chainName: string;
  withdrawalMinFee: string;
  withdrawalMinSize: string;
  withdrawFeeRate: string;
  depositMinSize: string;
  isWithdrawEnabled: boolean;
  isDepositEnabled: boolean;
  preConfirms: number;
  contractAddress: string;
  chainId: string;
  confirms: number;
}
