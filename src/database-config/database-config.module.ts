import { Module } from '@nestjs/common';
import { DatabaseConfigService } from '@database-config/database-config.service';

@Module({
  providers: [DatabaseConfigService],
})
export class DatabaseConfigModule {}
