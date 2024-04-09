import { Module } from '@nestjs/common';
import { MarketModule } from '@market/market.module';
import { ArbitrageModule } from '@arbitrage/arbitrage.module';
import { AuthModule } from '@auth/auth.module';
import { TradingModule } from '@trading/trading.module';
import { SharedModule } from '@shared/shared.module';
import { TelegramModule } from 'src/telegram/telegram.module';
import { DatabaseConfigModule } from 'src/config/database-config.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseConfigService } from 'src/config/database-config.service';
import { ConfigModule } from '@nestjs/config';
import configuration from 'src/config/configuration';
import { AppController } from '@app/controller';
import { AppService } from '@app/service';

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
