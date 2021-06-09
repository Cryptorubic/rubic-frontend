import { BLOCKCHAIN_NAME } from '../../../../shared/models/blockchain/BLOCKCHAIN_NAME';

export type TopTokens = `topTokens[${keyof Record<BLOCKCHAIN_NAME, string>}]`;

interface AllQueryParams {
  from: string;
  to: string;
  chain: BLOCKCHAIN_NAME;
  fromBlockchain: BLOCKCHAIN_NAME;
  toBlockchain: BLOCKCHAIN_NAME;
  fromToken: string;
  amount: string;
  iframe: string;
  hidden: string;
  hideSelection: string;
  background: string;
  theme: string;
  lang: string;
}
export type QueryParams = {
  [P in TopTokens | keyof AllQueryParams]?: string;
};
