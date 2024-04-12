import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ArbitrageService } from '@arbitrage/services/arbitrage.service';
import { Repository } from 'typeorm';
import { CurrencyArbitrage } from '@trading/entity/currency-arbitrage.entity';
import { CurrencyArbitrageData } from '@arbitrage/interface/arbitrage.interface';
import { InjectRepository } from '@nestjs/typeorm';
import { Subscription, exhaustMap, filter } from 'rxjs';
import Big from 'big.js';

@Injectable()
export class MonitorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MonitorService.name);
  private currencyArbitrageSubscription: Subscription;

  constructor(
    @InjectRepository(CurrencyArbitrage)
    private currencyArbitrageRepository: Repository<CurrencyArbitrage>,
    private readonly arbitrageService: ArbitrageService,
  ) {}

  onModuleInit(): any {
    this.currencyArbitrageSubscription = this.arbitrageService
      .getCurrencyArbitrageData$()
      .pipe(
        filter((value) => value.position === 'long'),
        exhaustMap((value) => this.processArbitrageData(value)),
      )
      .subscribe({
        error: (err) => this.logger.error('Error processing offer data:', err),
        complete: () => this.logger.log('Finished processing offer stream.'),
      });
  }

  private async processArbitrageData(newData: CurrencyArbitrageData) {
    const dbRecord = await this.currencyArbitrageRepository.findOneBy({
      currencyId: newData.currencyId,
      isTouchedTarget: false,
    });
    if (!dbRecord) {
      await this.createNewRecord(newData);
    } else {
      await this.updateRecord(dbRecord, newData);
    }
  }

  private async updateRecord(
    savedData: CurrencyArbitrage,
    newData: CurrencyArbitrageData,
  ): Promise<void> {
    if (!Big(savedData.currentPrice).eq(newData.currentPrice)) {
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
      this.priceChangeLogger(
        savedData.currencyId,
        newData.currentPrice,
        savedData.currentPrice,
        savedData.position,
      );
      if (isTouchedTarget) {
        this.logger.debug(
          `${savedData.currencyId} touched: ${isTouchedTarget}`,
        );
      }
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
      this.logger.fatal(
        `new record added to database: ${newRecord.currencyId}`,
      );
    } catch (e) {
      this.logger.error(e);
    }
  }

  private priceChangeLogger(
    currencyId: string,
    currentPrice: number,
    savedPrice: number,
    position: 'long' | 'short' = 'long',
  ) {
    const message = `${currencyId} update price: ${savedPrice} => ${currentPrice}`;
    if (position === 'long') {
      if (Big(currentPrice).gt(savedPrice)) {
        this.logger.log(message);
      }
      if (Big(currentPrice).lt(savedPrice)) {
        this.logger.warn(message);
      }
    }
    if (position === 'short') {
      if (Big(currentPrice).lt(savedPrice)) {
        this.logger.log(message);
      }
      if (Big(currentPrice).gt(savedPrice)) {
        this.logger.warn(message);
      }
    }
  }

  onModuleDestroy(): any {
    this.currencyArbitrageSubscription.unsubscribe();
  }
}
