import { TestBed } from '@angular/core/testing';

import { CryptoTapService } from 'src/app/features/cross-chain-swaps-page/crypto-tap-page/services/crypto-tap-service/crypto-tap.service';

describe('CryptoTapService', () => {
  let service: CryptoTapService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CryptoTapService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
