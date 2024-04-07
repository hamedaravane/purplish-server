import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ArbitrageService } from './services/arbitrage.service';
import { ArbitrageController } from './controllers/arbitrage.controller';
import { MarketModule } from '../market/market.module';
import { CurrencyArbitrage } from './entity/currency-arbitrage.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MonitorOpportunityService } from 'src/arbitrage/services/monitor-opportunity.service';

@Module({
  imports: [
    HttpModule,
    MarketModule,
    TypeOrmModule.forFeature([CurrencyArbitrage]),
  ],
  providers: [ArbitrageService, MonitorOpportunityService],
  controllers: [ArbitrageController],
})
export class ArbitrageModule {}
