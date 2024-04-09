import { Injectable } from '@nestjs/common';
import { MarketService } from 'src/market/services/market/market.service';

@Injectable()
export class AppService {
  constructor(private readonly marketService: MarketService) {
    this.initMarkets().then();
  }

  async initMarkets() {
    await this.marketService.connectToExchanges();
  }
}
