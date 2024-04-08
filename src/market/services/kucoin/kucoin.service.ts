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
import { ConfigService } from '@nestjs/config';

@Injectable()
export class KucoinService extends WebsocketAbstract {
  protected readonly logger = new Logger(KucoinService.name);
  private readonly kucoinWsResponse = new Map<string, MarketData>();
  readonly kucoinWsResponseSubject = new Subject<Map<string, MarketData>>();

  constructor(
    protected httpService: HttpService,
    protected configService: ConfigService,
  ) {
    super(httpService, configService);
  }

  async createConnection() {
    const publicBulletResponse = await this.getPublicBulletResponse();
    const instanceServer = publicBulletResponse.instanceServers[0];
    this.pingInterval = instanceServer.pingInterval;
    const endpoint = `${instanceServer.endpoint}?token=${publicBulletResponse.token}`;
    this.connectThroughProxy(endpoint);
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
        this.ping();
        break;
      case 'message':
        const marketData = data.data.data;
        this.kucoinWsResponse.set(marketData.baseCurrency, marketData);
        this.kucoinWsResponseSubject.next(this.kucoinWsResponse);
        break;
      case 'pong':
        break;
    }
  }

  protected ping(): void {
    setInterval(() => {
      this.sendMessage({
        type: 'ping',
      });
    }, this.pingInterval);
  }
}
