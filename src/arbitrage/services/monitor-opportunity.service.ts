import { Injectable } from '@nestjs/common';
import { CurrencyArbitrage } from '../entity/currency-arbitrage.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ArbitrageService } from './arbitrage.service';
import { firstValueFrom, Subject, takeUntil } from 'rxjs';
import { MarketService } from 'src/market/services/market/market.service';
import Big from 'big.js';

@Injectable()
export class MonitorOpportunityService {
  private readonly readyToSnapshot = new Subject<boolean>();
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
      .pipe(takeUntil(this.readyToSnapshot.asObservable()))
      .subscribe((data) => {
        this.readyToSnapshot.next(data.length > 1);
        this.snapShotOpportunities();
      });
  }

  snapShotOpportunities() {
    firstValueFrom(this.arbitrageService.filteredMarketsSubject.asObservable())
      .then((opportunities) => {
        const currencyArbitrages = opportunities.map((opportunity) => ({
          ...opportunity,
          actionTimestamp: new Date(),
          isTouchedTarget: false,
          targetTouchTimestamp: null,
        }));
        return this.currencyArbitrageRepository.save(currencyArbitrages);
      })
      .then(() => this.monitorOmpfinexData())
      .catch((error) => console.error(error));
  }

  async updateOpportunityWhenTargetReached(
    currencyId: string,
    currentPrice: number,
  ) {
    const opportunities = await this.currencyArbitrageRepository.find({
      where: {
        currencyId,
        isTouchedTarget: false,
      },
    });

    for (const opportunity of opportunities) {
      if (currentPrice >= opportunity.targetPrice) {
        opportunity.isTouchedTarget = true;
        opportunity.targetTouchTimestamp = new Date();
        await this.currencyArbitrageRepository.save(opportunity);
      }
    }
  }

  async monitorOmpfinexData() {
    this.marketService.marketComparisonSubject.asObservable().subscribe({
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
