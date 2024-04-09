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
      next: async (value) => {
        await this.processArbitrageData(value);
      },
      error: (err) => this.logger.warn(err),
    });
  }

  private async processArbitrageData(data: CurrencyArbitrageData) {
    this.logger.log(data);
    try {
      let currency = await this.currencyArbitrageRepository.findOneBy({
        currencyId: data.currencyId,
      });
      if (!currency) {
        currency = this.currencyArbitrageRepository.create({
          currencyId: data.currencyId,
          currencyName: data.currencyName,
        });
        await this.currencyArbitrageRepository.save(currency);
        this.logger.log(`Saved new currency: ${currency.currencyId}`);
      } else {
        this.logger.log(`Currency ${data.currencyId} already exists.`);
      }
    } catch (e) {
      this.logger.error('Error processing arbitrage data', e);
    }
  }
}
