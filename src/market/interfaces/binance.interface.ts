export interface BinanceSocket {
  data: BinanceStreamDataDto;
  stream: string;
}

export interface BinanceStreamDataDto {
  e: string;
  E: number;
  s: string;
  t: number;
  p: string;
  q: string;
  b: number;
  a: number;
  T: number;
  m: boolean;
  M: boolean;
}

export interface BinanceStreamData {
  eventType: string;
  eventTime: number;
  symbol: string;
  tradeId: number;
  price: string;
  quantity: string;
  buyerOrderId: number;
  sellerOrderID: number;
  tradeTime: number;
  marketMaker: boolean;
  ignore: boolean;
}

export function convertToBinanceDto(
  messages: BinanceSocket,
): BinanceStreamData {
  return {
    buyerOrderId: messages.data.b,
    eventTime: messages.data.E,
    eventType: messages.data.e,
    symbol: messages.data.s,
    ignore: messages.data.M,
    marketMaker: messages.data.m,
    price: messages.data.p,
    quantity: messages.data.q,
    sellerOrderID: messages.data.a,
    tradeId: messages.data.t,
    tradeTime: messages.data.T,
  };
}
