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

@Module({
  imports: [
    MarketModule,
    ArbitrageModule,
    AuthModule,
    TradingModule,
    SharedModule,
    ConfigModule.forRoot(),
    TelegramModule,
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      username: 'root',
      password: '11559933',
      database: 'nest_local',
      entities: [],
      synchronize: true,
      autoLoadEntities: true,
      logging: 'all',
      logger: 'debug',
    }),
    ConfigModule.forRoot({
      envFilePath: [
        '.env.development.home',
        '.env.development.work',
        '.env.production',
      ],
      isGlobal: true,
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
