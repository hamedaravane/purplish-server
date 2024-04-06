import { Injectable } from '@nestjs/common';
import { CurrencyArbitrage } from '../entity/currency-arbitrage.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Column, Repository } from 'typeorm';
import { ArbitrageService } from './arbitrage.service';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class MonitorOpportunityService {
  constructor(
    @InjectRepository(CurrencyArbitrage)
    private currencyArbitrageRepository: Repository<CurrencyArbitrage>,
    private readonly arbitrageService: ArbitrageService,
  ) {}

  snapShotOpportunities() {
    firstValueFrom(
      this.arbitrageService.filteredMarketsSubject.asObservable(),
    ).then((opportunities) => {
      opportunities.map((opportunity) => {
        const currencyArbitrage: CurrencyArbitrage = {
          id: 1,
          ...opportunity,
          actionTimestamp: new Date(),
          isTouchedTarget: false,
          targetTouchTimestamp: null,
        };
        this.currencyArbitrageRepository.save(currencyArbitrage).then();
      });
    });
  }
}
