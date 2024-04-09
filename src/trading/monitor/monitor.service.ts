import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ArbitrageService } from '@arbitrage/services/arbitrage.service';
import { Repository } from 'typeorm';
import { CurrencyArbitrage } from '@trading/entity/currency-arbitrage.entity';
import { CurrencyArbitrageData } from '@arbitrage/interface/arbitrage.interface';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class MonitorService implements OnModuleInit {
  private readonly logger = new Logger(MonitorService.name);
  private selectedDbCurrency: Omit<CurrencyArbitrage, CurrencyArbitrage['id']>;
  constructor(
    @InjectRepository(CurrencyArbitrage)
    private currencyArbitrageRepository: Repository<CurrencyArbitrage>,
    private readonly arbitrageService: ArbitrageService,
  ) {}
  onModuleInit(): any {
    this.arbitrageService.getCurrencyArbitrageData$().subscribe({
      next: (value) => this.processArbitrageData(value),
      error: (err) => this.logger.warn(err),
    });
  }

  private async processArbitrageData(data: CurrencyArbitrageData) {
    try {
      this.selectedDbCurrency =
        await this.currencyArbitrageRepository.findOneBy({
          currencyId: data.currencyId,
        });
    } catch (e) {
      this.logger.log('cannot find currency id in database-config', e);
      await this.currencyArbitrageRepository.save(data);
    }
  }
}
