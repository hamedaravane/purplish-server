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
      await this.updateRecord(currency, data);
    } else {
      await this.createNewRecord(data);
    }
  }

  private async updateRecord(
    savedData: Omit<CurrencyArbitrage, 'id'>,
    newData: CurrencyArbitrageData,
  ): Promise<void> {
    const now = new Date();
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
      targetTouchTimestamp: isTouchedTarget ? now : null,
    };
    this.databaseCurrencies.set(savedData.currencyId, {
      currencyId: savedData.currencyId,
      currencyName: savedData.currencyName,
      comparisonExchange: savedData.comparisonExchange,
      priceDiffPercentage: savedData.priceDiffPercentage,
      label: savedData.label,
      actionTimestamp: savedData.actionTimestamp,
      targetPrice: savedData.actionPrice,
      actionPrice: savedData.actionPrice,
      position: savedData.position,
      ...updateItems,
    });
    await this.currencyArbitrageRepository.update(
      {
        currencyId: savedData.currencyId,
      },
      { ...updateItems },
    );
    this.logger.log(
      `update ${savedData.currencyId} price to ${newData.currentPrice}`,
    );
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
    this.logger.log(`add new record: ${data.currencyId}`);
  }
}
