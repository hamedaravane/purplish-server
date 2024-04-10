import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ArbitrageService } from '@arbitrage/services/arbitrage.service';
import { Repository } from 'typeorm';
import { CurrencyArbitrage } from '@trading/entity/currency-arbitrage.entity';
import { CurrencyArbitrageData } from '@arbitrage/interface/arbitrage.interface';
import { InjectRepository } from '@nestjs/typeorm';
import { distinctUntilKeyChanged } from 'rxjs';
import Big from 'big.js';

@Injectable()
export class MonitorService implements OnModuleInit {
  private readonly logger = new Logger(MonitorService.name);
  private databaseCurrencies = new Map<string, CurrencyArbitrageData>();

  constructor(
    @InjectRepository(CurrencyArbitrage)
    private currencyArbitrageRepository: Repository<CurrencyArbitrage>,
    private readonly arbitrageService: ArbitrageService,
  ) {}

  onModuleInit(): any {
    this.arbitrageService
      .getCurrencyArbitrageData$()
      .pipe(distinctUntilKeyChanged('currencyId'))
      .subscribe({
        next: async (value) => {
          await this.processArbitrageData(value);
        },
        error: (err) => this.logger.warn(err),
      });
  }

  private async processArbitrageData(newData: CurrencyArbitrageData) {
    if (this.databaseCurrencies.has(newData.currencyId)) {
      const dbRecord = this.databaseCurrencies.get(newData.currencyId);
      await this.updateRecord(dbRecord, newData);
    } else {
      await this.createNewRecord(newData);
    }
  }

  private async updateRecord(
    savedData: CurrencyArbitrageData,
    newData: CurrencyArbitrageData,
  ): Promise<void> {
    const isTouchedTarget = this.getIsTargetTouched(
      newData.currentPrice,
      savedData.targetPrice,
      savedData.position,
    );
    const updateItems = {
      currentPrice: newData.currentPrice,
      currentVolume: newData.currentVolume,
      currentMaxPrice: newData.currentMaxPrice,
      currentMinPrice: newData.currentMinPrice,
      isTouchedTarget,
    };
    await this.currencyArbitrageRepository.update(
      {
        currencyId: savedData.currencyId,
      },
      { ...updateItems },
    );
    this.databaseCurrencies.set(savedData.currencyId, {
      ...savedData,
      ...updateItems,
    });
    if (isTouchedTarget) {
      this.databaseCurrencies.delete(savedData.currencyId);
      this.logger.debug(`${savedData.currencyId} touched the target price`);
    }
  }

  private getIsTargetTouched(
    currentPrice: number,
    targetPrice: number,
    position: 'long' | 'short',
  ) {
    if (position === 'long') {
      return Big(currentPrice).gt(targetPrice);
    }
    return Big(currentPrice).lt(targetPrice);
  }

  private async createNewRecord(data: CurrencyArbitrageData) {
    try {
      const newRecord = this.currencyArbitrageRepository.create(data);
      await this.currencyArbitrageRepository.save(newRecord);
      this.databaseCurrencies.set(data.currencyId, data);
      this.logger.log(`new record added to database: ${newRecord.currencyId}`);
    } catch (e) {
      this.logger.error(e);
    }
  }
}
