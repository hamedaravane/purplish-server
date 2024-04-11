import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ArbitrageService } from '@arbitrage/services/arbitrage.service';
import { Repository } from 'typeorm';
import { CurrencyArbitrage } from '@trading/entity/currency-arbitrage.entity';
import { CurrencyArbitrageData } from '@arbitrage/interface/arbitrage.interface';
import { InjectRepository } from '@nestjs/typeorm';
import { filter } from 'rxjs';
import Big from 'big.js';

@Injectable()
export class MonitorService implements OnModuleInit {
  private readonly logger = new Logger(MonitorService.name);

  constructor(
    @InjectRepository(CurrencyArbitrage)
    private currencyArbitrageRepository: Repository<CurrencyArbitrage>,
    private readonly arbitrageService: ArbitrageService,
  ) {}

  onModuleInit(): any {
    this.arbitrageService
      .getCurrencyArbitrageData$()
      .pipe(filter((value) => value.position === 'long'))
      .subscribe({
        next: (value) => {
          try {
            this.processArbitrageData(value);
          } catch (e) {
            this.logger.error(e);
          }
        },
        error: (err) => this.logger.warn(err),
      });
  }

  private processArbitrageData(newData: CurrencyArbitrageData) {
    this.currencyArbitrageRepository
      .findOneBy({
        currencyId: newData.currencyId,
      })
      .then(async (dbRecord) => {
        if (dbRecord && !dbRecord.isTouchedTarget) {
          await this.updateRecord(dbRecord, newData);
        } else {
          await this.createNewRecord(newData);
        }
      })
      .catch((e) => {
        this.logger.error(e);
      });
  }

  private async updateRecord(
    savedData: CurrencyArbitrage,
    newData: CurrencyArbitrageData,
  ): Promise<void> {
    const isTouchedTarget = this.getIsTargetTouched(
      newData.currentPrice,
      savedData.targetPrice,
      savedData.position,
    );
    const updateItems: Partial<CurrencyArbitrage> = {
      currentPrice: newData.currentPrice,
      currentVolume: newData.currentVolume,
      currentMaxPrice: newData.currentMaxPrice,
      currentMinPrice: newData.currentMinPrice,
      isTouchedTarget: isTouchedTarget,
    };
    await this.currencyArbitrageRepository.update(
      {
        id: savedData.id,
        currencyId: savedData.currencyId,
        isTouchedTarget: false,
      },
      { ...updateItems },
    );
    if (isTouchedTarget) {
      this.logger.debug(`${savedData.currencyId} touched: ${isTouchedTarget}`);
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
      this.logger.log(`new record added to database: ${newRecord.currencyId}`);
    } catch (e) {
      this.logger.error(e);
    }
  }
}
