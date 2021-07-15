import { BLOCKCHAIN_NAME } from 'src/app/shared/models/blockchain/BLOCKCHAIN_NAME';

export interface CryptoTapBotRequest {
  txHash: string;
  walletAddress: string;
  fromAmount: number;
  toAmount: number;
  blockchain: BLOCKCHAIN_NAME;
  symbol: string;
  price: number;
}
