import SwapToken from 'src/app/shared/models/tokens/SwapToken';

export enum CRYPTO_TAP_TRADE_STATUS {
  WAITING = 'WAITING',
  CALCULATION = 'CALCULATION',
  TX_IN_PROGRESS = 'TX_IN_PROGRESS',
  COMPLETED = 'COMPLETED'
}

export interface CryptoTapToken extends SwapToken {
  fromAmount: string;
  toAmount: string;
  fee: string;
}

export interface CryptoTapTrade {
  status: CRYPTO_TAP_TRADE_STATUS;
  fromToken: CryptoTapToken;
  toToken: SwapToken;
}
