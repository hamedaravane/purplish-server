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
  private databaseCurrencies = new Map<string, Omit<CurrencyArbitrage, 'id'>>();

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

  private async processArbitrageData(data: CurrencyArbitrageData) {
    if (this.databaseCurrencies.has(data.currencyId)) {
      const currency = this.databaseCurrencies.get(data.currencyId);
      await this.updateCurrency(currency, data);
    } else {
      await this.createNewRecord(data);
    }
  }

  private async updateCurrency(
    currency: Omit<CurrencyArbitrage, 'id'>,
    newData: CurrencyArbitrageData,
  ): Promise<void> {
    const now = new Date();
    const isTouchedTarget = this.getIsTargetTouched(newData);
    const updateItems = {
      currentPrice: newData.currentPrice,
      currentVolume: newData.currentVolume,
      currentMaxPrice: newData.currentMaxPrice,
      currentMinPrice: newData.currentMinPrice,
      isTouchedTarget,
      targetTouchTimestamp: isTouchedTarget ? now : null,
    };
    this.databaseCurrencies.set(currency.currencyId, {
      currencyId: currency.currencyId,
      currencyName: currency.currencyName,
      position: currency.position,
      actionPrice: newData.currentPrice,
      comparedWith: currency.comparedWith,
      diffPercentage: currency.diffPercentage,
      label: currency.label,
      actionTimestamp: currency.actionTimestamp,
      targetPrice: currency.targetPrice,
      ...updateItems,
    });
    await this.currencyArbitrageRepository.update(
      {
        currencyId: currency.currencyId,
      },
      { ...updateItems },
    );
    if (isTouchedTarget) {
      this.databaseCurrencies.delete(currency.currencyId);
    }
  }

  private getIsTargetTouched(data: CurrencyArbitrageData) {
    if (data.position === 'long') {
      return Big(data.currentPrice).gt(data.targetPrice);
    }
    return Big(data.currentPrice).lt(data.targetPrice);
  }

  private async createNewRecord(data: CurrencyArbitrageData) {
    this.databaseCurrencies.set(data.currencyId, {
      ...data,
      actionTimestamp: new Date(),
      isTouchedTarget: false,
      targetTouchTimestamp: null,
      actionPrice: data.currentPrice,
      targetPrice: data.targetPrice,
    });
    await this.currencyArbitrageRepository.save(
      this.databaseCurrencies.get(data.currencyId),
    );
    this.logger.log(`Saved new currency: ${data.currencyId}`);
  }
}
