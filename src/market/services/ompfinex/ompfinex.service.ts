import { Injectable, Logger } from '@nestjs/common';
import { Centrifuge } from 'centrifuge';
import { endpoints } from 'src/market/environments/endpoints';
import { firstValueFrom, map, Subject } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import {
  OmpfinexDataResponse,
  OmpfinexMarket,
  OmpfinexMarketDto,
} from 'src/market/interfaces/ompfinex.interface';

@Injectable()
export class OmpfinexService {
  public readonly ompfinexWSResponseSubject = new Subject();
  public readonly ompfinexMarketsMap = new Map<string, OmpfinexMarket>();
  private readonly logger = new Logger(OmpfinexService.name);
  private readonly client = new Centrifuge(endpoints.ompfinexStreamBaseUrl, {
    websocket: WebSocket,
  });
  constructor(private readonly httpService: HttpService) {}

  public async getOmpfinexMarkets() {
    const markets = await firstValueFrom(
      this.httpService
        .get<
          OmpfinexDataResponse<OmpfinexMarketDto[]>
        >(`${endpoints.ompfinexApiBaseUrl}/v1/market`)
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
    const sub = this.client.newSubscription('public-market:r-price-sm');
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
      this.ompfinexWSResponseSubject.next(ctx.data);
    });
    sub.subscribe();
  }
}
