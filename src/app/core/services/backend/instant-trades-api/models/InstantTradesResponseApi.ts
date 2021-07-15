import InputToken from 'src/app/shared/models/tokens/InputToken';
import { INSTANT_TRADES_PROVIDER } from 'src/app/shared/models/instant-trade/INSTANT_TRADES_PROVIDER';
import { TRANSACTION_STATUS } from 'src/app/shared/models/blockchain/TRANSACTION_STATUS';

interface InstantTradesBlockchainNetwork {
  title: string;
}

interface InstantTradesContract {
  name: INSTANT_TRADES_PROVIDER;
  address: string;
  blockchain_network: InstantTradesBlockchainNetwork;
}

interface InstantTradesTokenApi extends InputToken {
  blockchain_network: string;
  coingecko_id: string;
  usd_price: number;
}

export interface InstantTradesResponseApi {
  hash: string;
  contract: InstantTradesContract;
  user: { username: string };
  from_token: InstantTradesTokenApi;
  to_token: InstantTradesTokenApi;
  from_amount: string;
  to_amount: string;
  gas_price: string;
  gas_limit: string;
  status: TRANSACTION_STATUS;
  status_updated_at: string;
}
