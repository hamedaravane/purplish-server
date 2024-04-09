import { Injectable, Logger } from '@nestjs/common';
import { WebsocketClient } from 'binance';
import { WsMessageAggTradeFormatted } from 'binance/lib/types/websockets';
import { Subject } from 'rxjs';
import { OmpfinexService } from '@market/services/ompfinex/ompfinex.service';
import { ConfigService } from '@nestjs/config';
import { SocksProxyAgent } from 'socks-proxy-agent';

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

  constructor(
    private readonly ompfinexService: OmpfinexService,
    private readonly configService: ConfigService,
  ) {}

  createConnection(): void {
    const proxyHost = this.configService.get('PROXY_SOCKS5_HOST');
    const proxyPort = this.configService.get('PROXY_SOCKS5_PORT');
    const agent = new SocksProxyAgent(`${proxyHost}:${proxyPort}`);

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
