import { BLOCKCHAIN_NAME } from './BLOCKCHAIN_NAME';

export default [
  {
    id: 1,
    name: BLOCKCHAIN_NAME.ETHEREUM,
    scannerUrl: 'https://etherscan.io/',
    rpcLink: 'https://mainnet.infura.io/v3/ecf1e6d0427b458b89760012a8500abf',
    imagePath: 'assets/images/icons/coins/eth.png',
    nativeCoin: {
      blockchainName: BLOCKCHAIN_NAME.ETHEREUM,
      address: '0x0000000000000000000000000000000000000000',
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18
    }
  },
  {
    id: 56,
    name: BLOCKCHAIN_NAME.BINANCE_SMART_CHAIN,
    scannerUrl: 'https://bscscan.com/',
    rpcLink: 'https://bsc-dataseed.binance.org',
    imagePath: 'assets/images/icons/coins/bnb.svg',
    nativeCoin: {
      blockchainName: BLOCKCHAIN_NAME.BINANCE_SMART_CHAIN,
      address: '0x0000000000000000000000000000000000000000',
      name: 'Binance Coin',
      symbol: 'BNB',
      decimals: 18
    }
  },
  {
    id: 137,
    name: BLOCKCHAIN_NAME.MATIC,
    scannerUrl: 'https://explorer-mainnet.maticvigil.com/',
    rpcLink: 'https://rpc-mainnet.matic.network',
    imagePath: 'assets/images/icons/coins/matic.svg',
    nativeCoin: {
      blockchainName: BLOCKCHAIN_NAME.MATIC,
      address: '0x0000000000000000000000000000000000000000',
      name: 'Polygon',
      symbol: 'MATIC',
      decimals: 18
    }
  },
  // Testnets
  {
    id: 42,
    name: BLOCKCHAIN_NAME.ETHEREUM_TESTNET,
    scannerUrl: 'https://kovan.etherscan.io/',
    rpcLink: 'https://kovan.infura.io/v3/ecf1e6d0427b458b89760012a8500abf',
    imagePath: 'assets/images/icons/coins/kovan.png',
    nativeCoin: {
      blockchainName: BLOCKCHAIN_NAME.ETHEREUM_TESTNET,
      address: '0x0000000000000000000000000000000000000000',
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18
    }
  }
];