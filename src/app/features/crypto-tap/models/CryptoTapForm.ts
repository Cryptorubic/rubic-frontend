import BigNumber from 'bignumber.js';
import { BLOCKCHAIN_NAME } from 'src/app/shared/models/blockchain/BLOCKCHAIN_NAME';
import { TokenAmount } from 'src/app/shared/models/tokens/TokenAmount';
import { ISwapForm } from 'src/app/shared/models/swaps/FormService';

export interface CryptoTapForm extends ISwapForm {
  input: {
    fromBlockchain: BLOCKCHAIN_NAME;
    toBlockchain: BLOCKCHAIN_NAME;
    fromToken: TokenAmount;
    toToken: TokenAmount;
  };
  output: {
    fromAmount: BigNumber;
    toAmount: BigNumber;
    fee: {
      token: TokenAmount;
      amount: BigNumber;
    };
  };
}