import { Injectable, Logger } from '@nestjs/common';
import { endpoints } from 'src/market/environments/endpoints';
import { HttpService } from '@nestjs/axios';
import {
  catchError,
  firstValueFrom,
  Subject,
  takeWhile,
  tap,
  timer,
} from 'rxjs';
import {
  KucoinPublicBulletResponse,
  KucoinWebsocketMessage,
} from 'src/market/interfaces/kucoin.interface';
import { AxiosError } from 'axios';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { OmpfinexService } from 'src/market/services/ompfinex/ompfinex.service';
import { WebSocket } from 'ws';

@Injectable()
export class KucoinService {
  public readonly kucoinWSResponseSubject = new Subject();
  private readonly logger = new Logger(KucoinService.name);
  private webSocketSubject!: WebSocketSubject<any>;
  private readonly ompfinexMarketMap = this.ompfinexService.ompfinexMarketsMap;
  constructor(
    private readonly httpService: HttpService,
    private readonly ompfinexService: OmpfinexService,
  ) {}

  async createConnection() {
    const publicBulletResponse = await this.getPublicBulletResponse();
    const instanceServer = publicBulletResponse.data.instanceServers.reduce(
      (previousValue) => previousValue,
    );
    const endpoint = `${instanceServer.endpoint}${publicBulletResponse.data.token}`;
    this.connect(endpoint);
    this.keepAlive(instanceServer.pingInterval, instanceServer.pingTimeout);
  }

  private async getPublicBulletResponse() {
    const { data } = await firstValueFrom(
      this.httpService
        .post<KucoinPublicBulletResponse>(
          `${endpoints.kucoinApiBaseUrl}/api/v1/bullet-public`,
          null,
        )
        .pipe(
          catchError((error: AxiosError) => {
            this.logger.error(error.response.data);
            throw 'An error happened!';
          }),
        ),
    );
    return data;
  }

  private keepAlive(pingInterval: number, pingTimeout?: number) {
    timer(pingTimeout ?? 0, pingInterval)
      .pipe(
        takeWhile(() => !this.webSocketSubject.closed),
        tap(() => this.sendMessage({ type: 'ping' })),
      )
      .subscribe();
  }

  private connect(endpoint: string) {
    if (!this.webSocketSubject || this.webSocketSubject.closed) {
      this.webSocketSubject = webSocket({
        url: endpoint,
      });
      this.onConnect();
    }
  }

  private onConnect() {
    this.webSocketSubject.subscribe({
      next: (message) => this.handleMessages(message),
      error: (err) => this.onError(err),
      complete: () => this.onComplete(),
    });
  }

  private handleMessages(message: KucoinWebsocketMessage) {
    if (message.type === 'welcome') {
      this.sendMessage({
        id: message.id,
        type: 'subscribe',
        topic: '/market/snapshot:USDS',
        response: true,
      });
    }
    if (message.type === 'message') {
      if (this.ompfinexMarketMap.has(message.data.data.baseCurrency)) {
        this.kucoinWSResponseSubject.next(message.data.data);
      }
    }
  }

  private onComplete() {
    this.logger.log(
      'in this moment the subscription to kucoin websocket ended!',
    );
  }

  private onError(err: Error) {
    this.logger.warn('in kucoin websocket error happened!', err);
  }

  private sendMessage(message: any) {
    this.webSocketSubject.next(message);
  }

  private disconnect() {
    this.webSocketSubject.complete();
  }
}
