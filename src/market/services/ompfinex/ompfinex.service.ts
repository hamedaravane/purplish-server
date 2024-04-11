import { Injectable, Logger } from '@nestjs/common';
import { Centrifuge } from 'centrifuge';
import { endpoints } from '@market/environments/endpoints';
import {
  convertOmpfinexWsResponse,
  convertToOmpfinexMarketDomain,
  OmpfinexDataResponse,
  OmpfinexMarket,
  OmpfinexMarketDto,
  OmpfinexMarketWebsocket,
  OmpfinexMarketWebsocketDto,
} from '@market/interfaces/ompfinex.interface';

import { HttpService } from '@nestjs/axios';
import { AxiosError } from 'axios';
import { WebSocket } from 'isomorphic-ws';
import {
  asyncScheduler,
  catchError,
  concatMap,
  debounceTime,
  delay,
  delayWhen,
  distinctUntilKeyChanged,
  firstValueFrom,
  from,
  map,
  of,
  scheduled,
  Subject,
  timer,
} from 'rxjs';
import { QueueScheduler } from 'rxjs/internal/scheduler/QueueScheduler';
import { AsyncScheduler } from 'rxjs/internal/scheduler/AsyncScheduler';

@Injectable()
export class OmpfinexService {
  private readonly logger = new Logger(OmpfinexService.name);
  private readonly client = new Centrifuge(endpoints.ompfinexStreamBaseUrl, {
    websocket: WebSocket,
  });
  readonly ompfinexMarketsMap = new Map<string, OmpfinexMarket>();
  readonly OmpfinexMarketWsSubject = new Subject<OmpfinexMarketWebsocket>();

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
      scheduled(ws.data, asyncScheduler)
        .pipe(
          map((data) =>
            convertOmpfinexWsResponse(data, this.ompfinexMarketsMap),
          ),
          distinctUntilKeyChanged('currencyId'),
        )
        .subscribe({
          next: (wsResponse) => {
            this.OmpfinexMarketWsSubject.next(wsResponse);
          },
          error: (err) => {
            this.logger.error('Error processing WebSocket data', err);
          },
        });
    });
    sub.subscribe();
  }
}
