import { Injectable } from '@nestjs/common';
import { CurrencyArbitrage } from '../entity/currency-arbitrage.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ArbitrageService } from './arbitrage.service';
import { firstValueFrom, interval, Subject, takeUntil, throttle } from 'rxjs';
import { MarketService } from 'src/market/services/market/market.service';
import Big from 'big.js';

@Injectable()
export class MonitorOpportunityService {
  arbitrageActionsSnapShot = new Map<string, any>();
  pauseSub = new Subject<void>();
  constructor(
    @InjectRepository(CurrencyArbitrage)
    private currencyArbitrageRepository: Repository<CurrencyArbitrage>,
    private readonly arbitrageService: ArbitrageService,
    private readonly marketService: MarketService,
  ) {
    this.readyToSnapShotOpportunities();
  }

  readyToSnapShotOpportunities() {
    this.arbitrageService.filteredMarketsSubject
      .asObservable()
      .pipe(takeUntil(this.pauseSub.asObservable()))
      .subscribe(async (arr) => {
        if (arr.length > 0) {
          this.pauseSub.next();
          await this.snapShotOpportunities();
        }
      });
  }

  async snapShotOpportunities() {
    const opportunities = await firstValueFrom(
      this.arbitrageService.filteredMarketsSubject.asObservable(),
    );
    const arbitrage = opportunities.map((opportunity) => {
      const addedItem = {
        ...opportunity,
        actionTimestamp: new Date(),
        isTouchedTarget: false,
        targetTouchTimestamp: null,
        currentPrice: opportunity.actionPrice,
      };
      this.arbitrageActionsSnapShot.set(addedItem.currencyId, addedItem);
      return addedItem;
    });
    await this.currencyArbitrageRepository.save(arbitrage);
    await this.monitorOmpfinexData();
  }

  async updateOpportunityWhenTargetReached(
    currencyId: string,
    currentPrice: number,
  ) {
    if (this.arbitrageActionsSnapShot.size > 0) {
      const arbitrageActions = this.arbitrageActionsSnapShot.get(currencyId);
      if (arbitrageActions?.targetPrice > arbitrageActions?.actionPrice) {
        if (currentPrice > arbitrageActions?.targetPrice) {
          await this.currencyArbitrageRepository.update(
            { currencyId },
            {
              isTouchedTarget: true,
              targetTouchTimestamp: new Date(),
              currentPrice: currentPrice,
            },
          );
          this.arbitrageActionsSnapShot.delete(currencyId);
        }
      }
      if (arbitrageActions?.targetPrice < arbitrageActions?.actionPrice) {
        if (currentPrice < arbitrageActions?.targetPrice) {
          await this.currencyArbitrageRepository.update(
            { currencyId },
            {
              isTouchedTarget: true,
              targetTouchTimestamp: new Date(),
              currentPrice: currentPrice,
            },
          );
          this.arbitrageActionsSnapShot.delete(currencyId);
        }
      }
    }
  }

  async monitorOmpfinexData() {
    this.marketService.marketComparisonSubject
      .asObservable()
      .pipe(throttle(() => interval(1500)))
      .subscribe({
        next: (ompfinexMarketWebsocket) => {
          ompfinexMarketWebsocket.map(async (market) => {
            await this.updateOpportunityWhenTargetReached(
              market.currencyId,
              Big(market.ompfinex.price).toNumber(),
            );
          });
        },
        error: (error) => console.error(error),
      });
  }
}
