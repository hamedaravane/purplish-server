import { Injectable, Logger } from '@nestjs/common';
import { Centrifuge } from 'centrifuge';
import { endpoints } from 'src/market/environments/endpoints';
import { catchError, firstValueFrom, map, Subject } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import {
  convertOmpfinexWsResponse,
  OmpfinexDataResponse,
  OmpfinexMarket,
  OmpfinexMarketDto,
  OmpfinexMarketWebsocket,
  OmpfinexMarketWebsocketDto,
} from 'src/market/interfaces/ompfinex.interface';
import { WebSocket } from 'ws';
import { AxiosError } from 'axios';

@Injectable()
export class OmpfinexService {
  public readonly ompfinexWsResponseSubject = new Subject<
    OmpfinexMarketWebsocket[]
  >();
  public readonly ompfinexMarketsMap = new Map<string, OmpfinexMarket>();
  private readonly logger = new Logger(OmpfinexService.name);
  private readonly client = new Centrifuge(endpoints.ompfinexStreamBaseUrl, {
    websocket: WebSocket,
  });

  constructor(private readonly httpService: HttpService) {}

  public async getOmpfinexMarkets() {
    const markets = await firstValueFrom(
      this.httpService
        .get<OmpfinexDataResponse<OmpfinexMarketDto[]>>(
          `${endpoints.ompfinexApiBaseUrl}/v1/market`,
          {
            headers: {
              'User-Agent': 'Node.js/v20.11.1',
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
                } as OmpfinexMarket;
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
      this.ompfinexWsResponseSubject.next(
        ws.data.map<OmpfinexMarketWebsocket>(
          (market: OmpfinexMarketWebsocketDto): OmpfinexMarketWebsocket => {
            return convertOmpfinexWsResponse(market, this.ompfinexMarketsMap);
          },
        ),
      );
    });
    sub.subscribe();
  }
}
