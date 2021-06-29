import { FormGroup } from '@ngneat/reactive-forms';
import { BLOCKCHAIN_NAME } from 'src/app/shared/models/blockchain/BLOCKCHAIN_NAME';
import { TokenAmount } from 'src/app/shared/models/tokens/TokenAmount';

export interface FormService {
  commonTrade: FormGroup<ISwapForm>;
}

export interface ISwapForm {
  input: {
    fromBlockchain: BLOCKCHAIN_NAME;
    toBlockchain: BLOCKCHAIN_NAME;
    fromToken: TokenAmount;
    toToken: TokenAmount;
    [key: string]: any;
  };
  output: {
    [key: string]: any;
  };
}