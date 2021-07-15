import { BLOCKCHAIN_NAME } from 'src/app/shared/models/blockchain/BLOCKCHAIN_NAME';
import { TokenAmount } from 'src/app/shared/models/tokens/TokenAmount';

interface BlockchainToken extends TokenAmount {
  minAmount: number;
  maxAmount: number;
}

export type BlockchainsTokens = {
  [blockchain in BLOCKCHAIN_NAME]?: BlockchainToken;
};

export interface BridgeToken {
  symbol: string;
  image: string;
  rank: number;

  blockchainToken: BlockchainsTokens;

  fromEthFee?: number;
  toEthFee?: number;

  used_in_iframe?: boolean;
}
