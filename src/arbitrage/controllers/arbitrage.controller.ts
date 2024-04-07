import { Controller, Logger } from '@nestjs/common';
import { ArbitrageService } from '../services/arbitrage.service';

@Controller()
export class ArbitrageController {
  private readonly logger = new Logger(ArbitrageController.name);
  constructor(private readonly arbitrageService: ArbitrageService) {
    this.arbitrageService.findOpportunity();
    this.arbitrageService.filteredMarketsSubject.subscribe();
  }
}
