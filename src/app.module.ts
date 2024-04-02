import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MarketModule } from './market/market.module';
import { ArbitrageModule } from './arbitrage/arbitrage.module';
import { AuthModule } from './auth/auth.module';
import { TradingModule } from './trading/trading.module';
import { SharedModule } from './shared/shared.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    MarketModule,
    ArbitrageModule,
    AuthModule,
    TradingModule,
    SharedModule,
    ConfigModule.forRoot(),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
