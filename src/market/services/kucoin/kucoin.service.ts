import { Injectable, Logger } from '@nestjs/common';
import { endpoints } from 'src/market/environments/endpoints';
import { HttpService } from '@nestjs/axios';
import { catchError, firstValueFrom, map, Subject } from 'rxjs';
import {
  KucoinPublicBulletResponse,
  KucoinWebsocketMessage,
  MarketData,
} from 'src/market/interfaces/kucoin.interface';
import { AxiosError } from 'axios';
import { OmpfinexService } from 'src/market/services/ompfinex/ompfinex.service';
import { WebSocket } from 'ws';

@Injectable()
export class KucoinService {
  public readonly kucoinWSResponseSubject = new Subject<
    Map<string, MarketData>
  >();
  private readonly logger = new Logger(KucoinService.name);
  private readonly ompfinexMarketMap = this.ompfinexService.ompfinexMarketsMap;
  private readonly kucoinWsResponse = new Map<string, MarketData>();
  private ws!: WebSocket;

  constructor(
    private readonly httpService: HttpService,
    private readonly ompfinexService: OmpfinexService,
  ) {}

  async createConnection() {
    try {
      const publicBulletResponse = await this.getPublicBulletResponse();
      const instanceServer = publicBulletResponse.instanceServers.reduce(
        (previousValue) => previousValue,
      );
      const endpoint = `${instanceServer.endpoint}/?token=${publicBulletResponse.token}`;
      this.connect(endpoint);
      this.keepAlive(instanceServer.pingInterval);
      this.handleMessage();
      this.handleError();
    } catch (e) {
      this.logger.error('cannot connect to kucoin ws', e);
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

  private connect(endpoint: string) {
    this.ws = new WebSocket(endpoint);
    this.ws.on('open', () => {
      this.logger.log('opening the kucoin ws');
      this.subscribe('/market/snapshot:USDS');
    });
  }

  private handleMessage() {
    this.ws.on('message', (msg: KucoinWebsocketMessage) => {
      if (msg.type === 'message') {
        this.logger.log(msg.data.data);
      }
    });
  }

  private keepAlive(pingInterval: number) {
    this.ws.on('message', (msg: KucoinWebsocketMessage) => {
      if (msg.type === 'welcome') {
        setInterval(() => {
          this.sendMessage({ type: 'ping' });
        }, pingInterval);
      }
    });
  }

  handleError() {
    this.ws.on('error', (err) => {
      this.logger.error('error happened in kucoin ws', err);
    });
  }

  private sendMessage(msg: any) {
    this.ws.send(msg);
  }

  private subscribe(topic: string) {
    this.sendMessage({
      type: 'subscribe',
      topic,
      privateChannel: false,
      response: true,
    });
  }
}
