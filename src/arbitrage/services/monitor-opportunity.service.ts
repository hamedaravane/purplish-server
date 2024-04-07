import { Injectable } from '@nestjs/common';
import { CurrencyArbitrage } from '../entity/currency-arbitrage.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ArbitrageService } from './arbitrage.service';
import { firstValueFrom, takeWhile } from 'rxjs';
import { MarketService } from 'src/market/services/market/market.service';
import Big from 'big.js';

@Injectable()
export class MonitorOpportunityService {
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
      .pipe(takeWhile((arr) => arr.length >= 1))
      .subscribe(async (arr) => {
        if (arr.length >= 1) {
          await this.snapShotOpportunities();
        }
      });
  }

  async snapShotOpportunities() {
    const opportunities = await firstValueFrom(
      this.arbitrageService.filteredMarketsSubject.asObservable(),
    );
    opportunities.map(async (opportunity) => {
      const data = {
        ...opportunity,
        actionTimestamp: new Date(),
        isTouchedTarget: false,
        targetTouchTimestamp: null,
      };
      await this.currencyArbitrageRepository.save(data);
    });
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
