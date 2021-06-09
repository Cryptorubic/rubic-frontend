import { TestBed } from '@angular/core/testing';

import { CryptoTapApiService } from 'src/app/core/services/backend/crypto-tap-api/crypto-tap-api.service';

describe('CryptoTapApiService', () => {
  let service: CryptoTapApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CryptoTapApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
