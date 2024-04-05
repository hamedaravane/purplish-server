import { Logger } from '@nestjs/common';
import { endpoints } from '../environments/endpoints';
import { HttpService } from '@nestjs/axios';
import { catchError, firstValueFrom } from 'rxjs';
import { WebSocket } from 'isomorphic-ws';
import * as https from 'https';

export abstract class WebsocketAbstract {
  protected abstract logger: Logger;
  protected pingInterval: number;
  protected pingTimeout: number;
  protected client: WebSocket;

  protected constructor(protected readonly httpService: HttpService) {}

  protected abstract createConnection(): void;

  protected connect(endpoint: string) {
    this.client = new WebSocket(endpoint);
    this.onConnect();
    this.handleError();
    this.onClose();
  }

  protected connectThroughProxy(endpoint: string) {
    try {
      // const agent = new https.Agent({
      //   host: 'free.shecan.ir',
      //   keepAlive: true,
      // });
      this.client = new WebSocket(endpoint);
      this.onConnect();
      this.handleError();
      this.onClose();
    } catch (e) {
      this.logger.error(e);
    }
  }

  private getProxyList() {
    firstValueFrom(
      this.httpService.get(endpoints.geonode).pipe(
        catchError((err) => {
          throw new Error(err);
        }),
      ),
    )
      .then((res) => {
        this.logger.log(res.data);
      })
      .catch((err) => {
        this.logger.error(err);
      });
  }

  protected onConnect() {
    this.client.on('open', () => {
      this.logger.log('connecting...');
    });
    this.client.on('message', (rawData: string) => {
      const data: any = JSON.parse(rawData);
      this.handleMessages(data);
    });
  }

  protected handleError() {
    this.client.on('error', (err) => {
      this.logger.error('error happened', err);
    });
  }

  protected onClose() {
    this.client.on('close', () => {
      this.logger.warn('connection closed');
    });
  }

  protected abstract handleMessages(data: any): void;

  protected abstract ping(): void;

  protected sendMessage(msg: any) {
    this.client.send(JSON.stringify(msg));
  }

  protected subscribe(topic: string) {
    this.sendMessage({
      type: 'subscribe',
      topic,
      privateChannel: false,
      response: true,
    });
  }
}
