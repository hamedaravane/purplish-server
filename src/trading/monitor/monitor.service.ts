import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ArbitrageService } from '@arbitrage/services/arbitrage.service';
import { Repository } from 'typeorm';
import { CurrencyArbitrage } from '@trading/entity/currency-arbitrage.entity';
import { CurrencyArbitrageData } from '@arbitrage/interface/arbitrage.interface';
import { InjectRepository } from '@nestjs/typeorm';
import { distinctUntilKeyChanged, map } from 'rxjs';
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
    try {
      const currency = this.databaseCurrencies.get(data.currencyId);
      if (currency) {
        await this.updateCurrency(currency, data);
      } else {
        await this.createNewRecord(data);
      }
    } catch (e) {
      this.logger.error(e);
    }
  }

  private async updateCurrency(
    currency: Omit<CurrencyArbitrage, 'id'>,
    newData: CurrencyArbitrageData,
  ) {
    const now = new Date();
    const isTouchedTarget = this.getIsTargetTouched(newData);
    const updateDate = {
      currentPrice: newData.currentPrice,
      currentVolume: newData.currentVolume,
      currentMaxPrice: newData.currentMaxPrice,
      currentMinPrice: newData.currentMinPrice,
      isTouchedTarget,
      targetTouchTimestamp: isTouchedTarget ? now : null,
    };
    this.databaseCurrencies.set(currency.currencyId, {
      ...currency,
      ...updateDate,
    });
    await this.currencyArbitrageRepository.update(
      {
        currencyId: currency.currencyId,
      },
      { ...updateDate },
    );
    this.databaseCurrencies.delete(currency.currencyId);
  }

  private getIsTargetTouched(data: CurrencyArbitrageData) {
    if (data.position === 'long') {
      return Big(data.currentPrice).gt(data.targetPrice);
    }
    return Big(data.currentPrice).lt(data.targetPrice);
  }

  private async createNewRecord(newDara: CurrencyArbitrageData) {
    this.databaseCurrencies.set(newDara.currencyId, {
      ...newDara,
      actionTimestamp: new Date(),
      isTouchedTarget: false,
      targetTouchTimestamp: null,
      actionPrice: newDara.currentPrice,
      targetPrice: newDara.targetPrice,
    });
    await this.currencyArbitrageRepository.save(
      this.databaseCurrencies.get(newDara.currencyId),
    );
    this.logger.log(`Saved new currency: ${newDara.currencyId}`);
  }
}
