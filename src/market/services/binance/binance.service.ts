import { Injectable, Logger } from '@nestjs/common';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { endpoints } from 'src/market/environments/endpoints';
import { OmpfinexService } from 'src/market/services/ompfinex/ompfinex.service';
import { OmpfinexMarket } from 'src/market/interfaces/ompfinex.interface';
import { Subject } from 'rxjs';

@Injectable()
export class BinanceService {
  public readonly binanceWSResponseSubject = new Subject();
  private readonly logger = new Logger(BinanceService.name);
  private webSocketSubject!: WebSocketSubject<any>;
  constructor(private readonly ompfinexService: OmpfinexService) {}

  createSubscription() {
    let streamNames = '';
    this.ompfinexService.ompfinexMarketsMap.forEach((value: OmpfinexMarket) => {
      streamNames += `${value.baseCurrency.id.toLowerCase()}${value.quoteCurrency.id.toLowerCase()}/`;
    });
    try {
      this.connect(
        `${endpoints.binanceStreamBaseUrl}/stream?streams=${streamNames}`,
      );
    } catch (e) {
      this.logger.error('cannot connect to binance ws', e);
    }
  }

  private connect(endpoint: string) {
    if (!this.webSocketSubject || this.webSocketSubject.closed) {
      this.webSocketSubject = webSocket(endpoint);
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

  private handleMessages(message: any) {
    this.logger.log(message);
    this.binanceWSResponseSubject.next(message);
  }

  private onComplete() {
    this.logger.log('subscription to binance websocket ended!');
  }

  private onError(err: Error) {
    this.logger.warn('in binance websocket error happened!', err);
  }

  private sendMessage(message: any) {
    this.webSocketSubject.next(message);
  }

  private disconnect() {
    this.webSocketSubject.complete();
  }
}
