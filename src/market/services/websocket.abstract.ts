import { WebSocket } from 'ws';
import { Logger } from '@nestjs/common';

export abstract class WebsocketAbstract {
  protected abstract logger: Logger;
  protected pingInterval: number;
  protected pingTimeout: number;
  protected client: WebSocket;

  protected abstract createConnection(): void;

  protected connect(endpoint: string) {
    this.client = new WebSocket(endpoint);
    this.onConnect();
    this.handleError();
    this.onClose();
  }

  protected onConnect() {
    this.client.on('open', () => {
      this.logger.log('on open');
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
