import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { SupportedTokensInfo } from '../../../swaps/models/SupportedTokensInfo';
import { SwapProvider } from '../../../swaps/services/swap-provider';
import { SWAP_PROVIDER_TYPE } from '../../../swaps/models/SwapProviderType';

@Injectable()
export class InstantTradesSwapProviderService extends SwapProvider {
  TYPE: SWAP_PROVIDER_TYPE.INSTANT_TRADE;

  get tokens(): Observable<SupportedTokensInfo> {
    return of(null);
  }

  constructor() {
    super();
  }
}