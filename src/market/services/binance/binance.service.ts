import { Injectable, Logger } from '@nestjs/common';
import { endpoints } from 'src/market/environments/endpoints';
import { OmpfinexService } from 'src/market/services/ompfinex/ompfinex.service';
import { OmpfinexMarket } from 'src/market/interfaces/ompfinex.interface';
import { Subject } from 'rxjs';
import { WebsocketAbstract } from '../websocket.abstract';

@Injectable()
export class BinanceService extends WebsocketAbstract {
  protected readonly logger = new Logger(BinanceService.name);
  public readonly binanceWsResponseSubject = new Subject();

  constructor(private readonly ompfinexService: OmpfinexService) {
    super();
  }

  createConnection(): void {
    let streamNames = '';
    this.ompfinexService.ompfinexMarketsMap.forEach((value: OmpfinexMarket) => {
      streamNames += `${value.baseCurrency.id.toLowerCase()}${value.quoteCurrency.id.toLowerCase()}/`;
    });
    const endpoint = `${endpoints.binanceStreamBaseUrl}?streams=${streamNames}`;
    this.connect(endpoint);
  }

  protected handleMessages(data: any): void {
    this.logger.log(data);
    this.binanceWsResponseSubject.next(data);
  }

  protected ping(): void {
    throw new Error('Method not implemented.');
  }
}
