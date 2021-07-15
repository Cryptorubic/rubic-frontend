import BigNumber from 'bignumber.js';
import { BLOCKCHAIN_NAME } from 'src/app/shared/models/blockchain/BLOCKCHAIN_NAME';
import { BridgeToken } from 'src/app/features/bridge/models/BridgeToken';

export interface EvoBridgeToken extends BridgeToken {
  evoInfo: {
    [BLOCKCHAIN_NAME.BINANCE_SMART_CHAIN]: EvoToken;
    [BLOCKCHAIN_NAME.POLYGON]: EvoToken;
  };
}

interface EvoToken {
  fee: BigNumber;
  feeBase: BigNumber;
  dailyLimit: BigNumber;
}
