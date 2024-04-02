import { Module } from '@nestjs/common';
import { KucoinService } from 'src/market/services/kucoin/kucoin.service';
import { HttpModule } from '@nestjs/axios';
import { OmpfinexService } from 'src/market/services/ompfinex/ompfinex.service';
import { BinanceService } from 'src/market/services/binance/binance.service';
import { MarketController } from './controllers/market/market.controller';
import { MarketService } from './services/market/market.service';

@Module({
  imports: [HttpModule],
  providers: [KucoinService, OmpfinexService, BinanceService, MarketService],
  controllers: [MarketController],
})
export class MarketModule {}
