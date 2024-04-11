import { Injectable, Logger } from '@nestjs/common';
import {
  KucoinPublicBulletResponse,
  KucoinWebsocketMessage,
  MarketData,
} from '@market/interfaces/kucoin.interface';
import { Subject, catchError, firstValueFrom, map } from 'rxjs';
import { AxiosError } from 'axios';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { WebsocketAbstract } from '@market/services/websocket.abstract';
import { endpoints } from '@market/environments/endpoints';

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
    try {
      const publicBulletResponse = await this.getPublicBulletResponse();
      const instanceServer = publicBulletResponse.instanceServers[0];
      this.pingInterval = instanceServer.pingInterval;
      const endpoint = `${instanceServer.endpoint}?token=${publicBulletResponse.token}`;
      this.connectThroughProxy(endpoint);
    } catch (e) {
      this.logger.error('could not connect to kucoin', e);
      throw e;
    }
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
