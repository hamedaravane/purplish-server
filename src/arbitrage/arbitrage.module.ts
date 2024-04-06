import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ArbitrageService } from './services/arbitrage.service';
import { ArbitrageController } from './controllers/arbitrage.controller';
import { MarketModule } from '../market/market.module';
import { CurrencyArbitrage } from './entity/currency-arbitrage.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    HttpModule,
    MarketModule,
    TypeOrmModule.forFeature([CurrencyArbitrage]),
  ],
  providers: [ArbitrageService],
  controllers: [ArbitrageController],
})
export class ArbitrageModule {}
