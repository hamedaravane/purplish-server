import { Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { WebSocket } from 'isomorphic-ws';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { ConfigService } from '@nestjs/config';

export abstract class WebsocketAbstract {
  protected abstract logger: Logger;
  protected pingInterval: number;
  protected pingTimeout: number;
  protected client: WebSocket;

  protected constructor(
    protected readonly httpService: HttpService,
    protected readonly configService: ConfigService,
  ) {}

  protected abstract createConnection(): void;

  protected connect(endpoint: string) {
    this.client = new WebSocket(endpoint);
    this.onConnect();
    this.handleError();
    this.onClose();
  }

  protected connectThroughProxy(endpoint: string) {
    const proxyHost = this.configService.get('PROXY_SOCKS5_HOST');
    const proxyPort = this.configService.get('PROXY_SOCKS5_PORT');
    const agent = new SocksProxyAgent(`${proxyHost}:${proxyPort}`);
    this.client = new WebSocket(endpoint, { agent });
    this.onConnect();
    this.handleError();
    this.onClose();
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
