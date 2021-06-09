import { BLOCKCHAIN_NAME } from 'src/app/shared/models/blockchain/BLOCKCHAIN_NAME';

export const BLOCKCHAINS_DATA = {
  [BLOCKCHAIN_NAME.ETHEREUM]: {
    link: 'https://ethereum.org/en/',
    caption: 'Ethereum'
  },
  [BLOCKCHAIN_NAME.BINANCE_SMART_CHAIN]: {
    link: 'https://www.binance.org/',
    caption: 'Binance Smart Chain',
    providerImg: 'Binance'
  },
  [BLOCKCHAIN_NAME.POLYGON]: {
    link: 'https://polygon.technology/',
    caption: 'Polygon',
    providerImg: 'Polygon'
  },
  [BLOCKCHAIN_NAME.TRON]: {
    link: 'https://tron.network/',
    caption: 'TRON',
    providerImg: 'Binance'
  },
  [BLOCKCHAIN_NAME.XDAI]: {
    link: 'https://www.xdaichain.com/',
    caption: 'xDai',
    providerImg: 'XDai'
  }
};
