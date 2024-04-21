import { Injectable, Logger } from '@nestjs/common';
import { Centrifuge, Subscription } from 'centrifuge';
import { endpoints } from '@market/environments/endpoints';
import {
  OmpfinexDataResponse,
  OmpfinexMarket,
  OmpfinexMarketDto,
  OmpfinexMarketWebsocket,
  OmpfinexMarketWebsocketDto,
  convertOmpfinexWsResponse,
  convertToOmpfinexMarketDomain,
  OmpfinexOrderBookWebsocketDto,
  convertOmpfinexOrderBookWsResponse,
  findPriceExtremes,
  OmpfinexOrderBookWsResponse,
} from '@market/interfaces/ompfinex.interface';
import { HttpService } from '@nestjs/axios';
import { AxiosError } from 'axios';
import { WebSocket } from 'isomorphic-ws';
import {
  Subject,
  catchError,
  firstValueFrom,
  from,
  map,
  of,
  exhaustMap,
  filter,
} from 'rxjs';
import Big from 'big.js';

@Injectable()
export class OmpfinexService {
  private readonly logger = new Logger(OmpfinexService.name);
  private readonly client = new Centrifuge(endpoints.ompfinexStreamBaseUrl, {
    websocket: WebSocket,
  });
  readonly ompfinexMarketsMap = new Map<string, OmpfinexMarket>();
  readonly ompfinexMarketWsSubject = new Subject<OmpfinexMarketWebsocket>();
  readonly ompfinexOrderBookWsSubject =
    new Subject<OmpfinexOrderBookWsResponse>();

  constructor(private readonly httpService: HttpService) {}

  async getOmpfinexMarkets() {
    const agent = { 'User-Agent': 'Node' };
    const markets = await firstValueFrom(
      this.httpService
        .get<OmpfinexDataResponse<OmpfinexMarketDto[]>>(
          `${endpoints.ompfinexApiBaseUrl}/v1/market`,
          {
            headers: {
              ...agent,
            },
          },
        )
        .pipe(
          map((res) => {
            return res.data.data
              .map((market) => {
                if (market.quote_currency.id !== 'USDT') {
                  return null;
                }
                return convertToOmpfinexMarketDomain(market);
              })
              .filter((market) => !!market);
          }),
          catchError((error: AxiosError) => {
            throw error;
          }),
        ),
    );
    for (const market of markets) {
      this.ompfinexMarketsMap.set(market.baseCurrency.id, market);
    }
  }

  createConnection() {
    this.client.on('connecting', () => {
      this.logger.log('connecting to ompfinex websocket...');
    });
    this.client.on('connected', () => {
      this.logger.log('successfully connected to ompfinex websocket');
    });
    this.client.connect();
  }

  createSubscription() {
    const sub = this.client.newSubscription('public-market:r-price-ag');
    sub.on('subscribing', () => {
      this.logger.log('subscribing to market channel...');
    });
    sub.on('subscribed', () => {
      this.logger.log('successfully subscribed');
    });
    sub.on('error', (err) => {
      this.logger.log('on subscribing error happened', err);
    });
    sub.on('publication', (ctx) => {
      const ws: { data: OmpfinexMarketWebsocketDto[] } = ctx.data;
      from(ws.data)
        .pipe(
          map((data) =>
            convertOmpfinexWsResponse(data, this.ompfinexMarketsMap),
          ),
        )
        .subscribe({
          next: (wsResponse) => {
            this.ompfinexMarketWsSubject.next(wsResponse);
          },
          error: (err) => {
            this.logger.error('Error processing WebSocket data', err);
          },
        });
    });
    sub.subscribe();
  }

  createOrderBookSubscription() {
    const channelPrefix = 'public-market:real-orderbook-';
    this.ompfinexMarketsMap.forEach((market) => {
      const orderBookSub = this.client.newSubscription(
        `${channelPrefix}${market.id}`,
      );
      orderBookSub.on('subscribing', (ctx) => {
        this.logger.log(`subscribing to ${ctx.channel}`);
      });
      orderBookSub.on('subscribed', (ctx) => {
        this.logger.log(`successfully subscribed to ${ctx.channel}`);
      });
      orderBookSub.on('error', (err) => {
        this.logger.log(err.channel);
      });
      orderBookSub.on('publication', (ctx) => {
        const channel = ctx.channel;
        const marketId = this.extractMarketId(channel, channelPrefix);
        const market = this.getMarketById(marketId);
        const rawData: OmpfinexOrderBookWebsocketDto[] | null = ctx.data;
        of(rawData)
          .pipe(
            filter(Boolean),
            map((rawData) => findPriceExtremes(rawData)),
            map((data) => {
              return convertOmpfinexOrderBookWsResponse(data, market);
            }),
          )
          .subscribe({
            next: (wsResponse) => {
              this.ompfinexOrderBookWsSubject.next(wsResponse);
            },
            error: (err) => {
              this.logger.error('Error processing WebSocket data', err);
            },
          });
      });
      orderBookSub.subscribe();
    });
  }

  private extractMarketId(channel: string, prefix: string): number {
    return +channel.substring(prefix.length);
  }

  private getMarketById(id: number) {
    return Array.from(this.ompfinexMarketsMap.values()).find(
      (value) => value.id === id,
    );
  }
}
