import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MarketModule } from '@market/market.module';
import { ArbitrageService } from '@arbitrage/services/arbitrage.service';

@Module({
  imports: [HttpModule, MarketModule],
  providers: [ArbitrageService],
  exports: [ArbitrageService],
})
export class ArbitrageModule {}
