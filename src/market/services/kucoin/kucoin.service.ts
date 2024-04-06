import { Injectable, Logger } from '@nestjs/common';
import { endpoints } from 'src/market/environments/endpoints';
import { catchError, firstValueFrom, map, Subject } from 'rxjs';
import {
  KucoinPublicBulletResponse,
  KucoinWebsocketMessage,
  MarketData,
} from 'src/market/interfaces/kucoin.interface';
import { AxiosError } from 'axios';
import { WebsocketAbstract } from '../websocket.abstract';
import { HttpService } from '@nestjs/axios';

@Injectable()
export class KucoinService extends WebsocketAbstract {
  protected readonly logger = new Logger(KucoinService.name);
  private readonly kucoinWsResponse = new Map<string, MarketData>();
  readonly kucoinWsResponseSubject = new Subject<Map<string, MarketData>>();

  constructor(protected httpService: HttpService) {
    super(httpService);
  }

  createConnection() {
    this.getPublicBulletResponse()
      .then((publicBulletResponse) => {
        const instanceServer = publicBulletResponse.instanceServers.reduce(
          (previousValue) => previousValue,
        );
        this.pingInterval = instanceServer.pingInterval;
        const endpoint = `${instanceServer.endpoint}?token=${publicBulletResponse.token}`;
        this.connect(endpoint);
      })
      .catch((err) => {
        this.logger.error(err);
      });
  }

  private async getPublicBulletResponse() {
    const { data } = await firstValueFrom(
      this.httpService
        .post<KucoinPublicBulletResponse>(
          `${endpoints.kucoinApiBaseUrl}/api/v1/bullet-public`,
          null,
        )
        .pipe(
          map((res) => {
            this.logger.log(
              'public token fetched successfully',
              res.data.data.token,
            );
            return res.data;
          }),
          catchError((error: AxiosError) => {
            this.logger.error(error.response.data);
            throw 'An error happened!';
          }),
        ),
    );
    return data;
  }

  protected handleMessages(data: KucoinWebsocketMessage): void {
    switch (data.type) {
      case 'welcome':
        this.logger.log('connected to websocket');
        this.subscribe('/market/snapshot:USDS');
        break;
      case 'message':
        const marketData = data.data.data;
        this.kucoinWsResponse.set(marketData.baseCurrency, marketData);
        this.kucoinWsResponseSubject.next(this.kucoinWsResponse);
        break;
      case 'pong':
        this.ping();
        break;
    }
  }

  protected ping(): void {
    setInterval(() => {
      const pingId = `ping-${Date.now()}`;
      this.sendMessage({
        id: pingId,
        type: 'ping',
      });
    }, this.pingInterval);
  }
}
