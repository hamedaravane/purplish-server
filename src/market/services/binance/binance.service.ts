import { Injectable, Logger } from '@nestjs/common';
import { OmpfinexService } from 'src/market/services/ompfinex/ompfinex.service';
import { Subject } from 'rxjs';
import { WebsocketClient } from 'binance';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { WsMessageAggTradeFormatted } from 'binance/lib/types/websockets';

@Injectable()
export class BinanceService {
  protected readonly logger = new Logger(BinanceService.name);
  private client: WebsocketClient;
  private readonly binanceWsResponseMap = new Map<
    string,
    WsMessageAggTradeFormatted
  >();
  public readonly binanceWsResponseSubject = new Subject<
    Map<string, WsMessageAggTradeFormatted>
  >();

  constructor(private readonly ompfinexService: OmpfinexService) {}

  createConnection(): void {
    const proxy = 'socks://mhd-proxy.omp.net:1080';
    const agent = new SocksProxyAgent(proxy);

    this.client = new WebsocketClient({
      beautify: true,
      wsOptions: {
        agent,
      },
    });
    this.subscription();
    this.handleMessages();
  }

  private handleMessages(): void {
    this.client.on('formattedMessage', (data: WsMessageAggTradeFormatted) => {
      this.binanceWsResponseMap.set(
        this.extractBaseCurrency(data.symbol),
        data,
      );
      this.binanceWsResponseSubject.next(this.binanceWsResponseMap);
    });
  }

  private subscription(): void {
    for (const value of this.ompfinexService.ompfinexMarketsMap.values()) {
      const symbol = `${value.baseCurrency.id}${value.quoteCurrency.id}`;
      this.client.subscribeSpotAggregateTrades(symbol, true);
    }
  }

  private extractBaseCurrency(symbol: string): string {
    const quoteCurrency = 'USDT';
    if (symbol.endsWith(quoteCurrency)) {
      return symbol.substring(0, symbol.length - quoteCurrency.length);
    } else {
      throw new Error('Symbol does not contain the expected quote currency.');
    }
  }
}
