import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MarketModule } from './market/market.module';
import { ArbitrageModule } from './arbitrage/arbitrage.module';
import { AuthModule } from './auth/auth.module';
import { TradingModule } from './trading/trading.module';
import { SharedModule } from './shared/shared.module';
import { ConfigModule } from '@nestjs/config';
import { TelegramModule } from './telegram/telegram.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseConfigService } from 'src/config/database-config.service';
import configuration from './config/configuration';
import * as process from 'process';

@Module({
  imports: [
    MarketModule,
    ArbitrageModule,
    AuthModule,
    TradingModule,
    SharedModule,
    TelegramModule,
    TypeOrmModule.forRootAsync({
      useClass: DatabaseConfigService,
    }),
    ConfigModule.forRoot({
      envFilePath: [`.env.${process.env.NODE_ENV}`],
      isGlobal: true,
      load: [configuration],
    }),
  ],
  controllers: [AppController],
  providers: [AppService, DatabaseConfigService],
})
export class AppModule {}
