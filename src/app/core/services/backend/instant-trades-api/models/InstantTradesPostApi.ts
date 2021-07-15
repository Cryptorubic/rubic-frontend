import { INSTANT_TRADES_PROVIDER } from 'src/app/shared/models/instant-trade/INSTANT_TRADES_PROVIDER';

interface InstantTradesUniswapAbstractApi {
  hash: string;
  provider: INSTANT_TRADES_PROVIDER;
  network: string;
}

interface InstantTradesOneInchApi {
  hash: string;
  provider: INSTANT_TRADES_PROVIDER;
  network: string;
  from_token: string;
  to_token: string;
  from_amount: number;
  to_amount: number;
}

export type InstantTradesPostApi = InstantTradesUniswapAbstractApi | InstantTradesOneInchApi;
