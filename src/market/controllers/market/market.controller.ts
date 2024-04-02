import { Controller, Get } from '@nestjs/common';
import { MarketService } from 'src/market/services/market/market.service';

@Controller('market')
export class MarketController {
  constructor(private readonly marketService: MarketService) {
    this.marketService.exchangesConnect();
  }
}
