import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ArbitrageModule } from '@arbitrage/arbitrage.module';
import { CurrencyArbitrage } from './entity/currency-arbitrage.entity';
import { MonitorService } from './monitor/monitor.service';

@Module({
  imports: [ArbitrageModule, TypeOrmModule.forFeature([CurrencyArbitrage])],
  providers: [MonitorService],
})
export class TradingModule {}
