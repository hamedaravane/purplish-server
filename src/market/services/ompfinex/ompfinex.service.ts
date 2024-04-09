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
import {
  asapScheduler,
  catchError,
  distinct,
  firstValueFrom,
  map,
  Observable,
  scheduled,
  share,
} from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { AxiosError } from 'axios';

@Injectable()
export class OmpfinexService {
  private readonly logger = new Logger(OmpfinexService.name);
  private readonly client = new Centrifuge(endpoints.ompfinexStreamBaseUrl, {
    websocket: WebSocket,
  });
  public readonly ompfinexMarketsMap = new Map<string, OmpfinexMarket>();
  private ompfinexMarketWs$ = new Observable<OmpfinexMarketWebsocket>();
  public readonly ompfinexMarketWebsocket$: Observable<OmpfinexMarketWebsocket> =
    this.ompfinexMarketWs$;

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
      this.ompfinexMarketWs$ = scheduled(ws.data, asapScheduler).pipe(
        map<OmpfinexMarketWebsocketDto, OmpfinexMarketWebsocket>((data) => {
          return convertOmpfinexWsResponse(data, this.ompfinexMarketsMap);
        }),
        distinct(({ price, volume }) => ({ price, volume })),
        share(),
      );
    });
    sub.subscribe();
  }
}
