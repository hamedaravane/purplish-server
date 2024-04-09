import { Injectable, Logger } from '@nestjs/common';
import { ArbitrageService } from '@arbitrage/services/arbitrage.service';
import { Repository } from 'typeorm';
import { CurrencyArbitrage } from '@arbitrage/entity/currency-arbitrage.entity';

@Injectable()
export class MonitorService {
  private readonly logger = new Logger(MonitorService.name);
  private currencyArbitrageData$ =
    this.arbitrageService.getCurrencyArbitrageData$();
  constructor(
    private readonly arbitrageService: ArbitrageService,
    private currencyArbitrageRepository: Repository<CurrencyArbitrage>,
  ) {}
}
