import { Module } from '@nestjs/common';
import { AppService } from './app.service';
import { AppController } from './app.controller';
import { MarketModule } from '@market/market.module';
import { ArbitrageModule } from '@arbitrage/arbitrage.module';
import { AuthModule } from '@auth/auth.module';
import { TradingModule } from '@trading/trading.module';
import { SharedModule } from '@shared/shared.module';
import { TelegramModule } from './telegram/telegram.module';
import { DatabaseConfigModule } from '@database-config/database-config.module';
import { DatabaseConfigService } from '@database-config/database-config.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';

@Module({
  imports: [
    MarketModule,
    ArbitrageModule,
    AuthModule,
    TradingModule,
    SharedModule,
    TelegramModule,
    DatabaseConfigModule,
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
  providers: [AppService],
})
export class AppModule {}
