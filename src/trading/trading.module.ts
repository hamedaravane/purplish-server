import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CurrencyArbitrage } from '@trading/entity/currency-arbitrage.entity';
import { MonitorService } from './monitor/monitor.service';

@Module({
  imports: [TypeOrmModule.forFeature([CurrencyArbitrage])],
  providers: [MonitorService],
})
export class TradingModule {}
