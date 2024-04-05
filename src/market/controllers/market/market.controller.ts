import { Controller, Logger } from '@nestjs/common';
import { MarketService } from 'src/market/services/market/market.service';

@Controller('market')
export class MarketController {
  private readonly logger = new Logger(MarketController.name);
  constructor(private readonly marketService: MarketService) {
    this.marketService.exchangesConnect();
    this.marketService.combineMarkets().subscribe((value) => {
      this.logger.log(value);
    });
  }
}
