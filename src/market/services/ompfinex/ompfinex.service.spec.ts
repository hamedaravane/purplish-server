import { Test, TestingModule } from '@nestjs/testing';
import { OmpfinexService } from 'src/market/services/ompfinex/ompfinex.service';

describe('OmpfinexService', () => {
  let service: OmpfinexService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OmpfinexService],
    }).compile();

    service = module.get<OmpfinexService>(OmpfinexService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
