import { Module } from '@nestjs/common';
import { DatabaseConfigService } from 'src/config/database-config.service';

@Module({
  providers: [DatabaseConfigService],
})
export class DatabaseConfigModule {}
