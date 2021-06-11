import { TestBed } from '@angular/core/testing';

import { TradeParametersService } from './trade-parameters.service';

describe('TradeParametersService', () => {
  let service: TradeParametersService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [TradeParametersService]
    });
    service = TestBed.inject(TradeParametersService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});