import { Test, TestingModule } from '@nestjs/testing';
import { KucoinService } from 'src/market/services/kucoin/kucoin.service';

describe('KucoinService', () => {
  let service: KucoinService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [KucoinService],
    }).compile();

    service = module.get<KucoinService>(KucoinService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
