import { BLOCKCHAIN_NAME } from 'src/app/shared/models/blockchain/BLOCKCHAIN_NAME';
import SwapToken from 'src/app/shared/models/tokens/SwapToken';
import { TOKEN_RANK } from 'src/app/shared/models/tokens/token-rank';
import { ETH, WEENUS, WSATT, XEENUS, YEENUS } from './eth-tokens';

const eth: SwapToken = {
  name: 'Ethereum',
  symbol: ETH.symbol,
  blockchain: BLOCKCHAIN_NAME.ETHEREUM,
  address: ETH.address,
  decimals: ETH.decimals,
  image: 'http://dev-api.rubic.exchange/media/token_images/cg_logo_ETH_ethereum_UjtINYs.png',
  rank: TOKEN_RANK.HIGH,
  price: 1705
};

const weenus = {
  name: 'Weenus',
  symbol: WEENUS.symbol,
  blockchain: BLOCKCHAIN_NAME.ETHEREUM,
  address: WEENUS.address,
  decimals: WEENUS.decimals,
  image:
    'https://raw.githubusercontent.com/MyWishPlatform/etherscan_top_tokens_images/master/fa-empire.png',
  rank: TOKEN_RANK.LOW,
  price: 10
};

const yeenus = {
  name: 'Yeenus',
  symbol: YEENUS.symbol,
  blockchain: BLOCKCHAIN_NAME.ETHEREUM,
  address: YEENUS.address,
  decimals: YEENUS.decimals,
  image:
    'https://raw.githubusercontent.com/MyWishPlatform/etherscan_top_tokens_images/master/fa-empire.png',
  rank: TOKEN_RANK.LOW,
  price: 50
};

const xeenus = {
  name: 'Xeenus',
  symbol: XEENUS.symbol,
  blockchain: BLOCKCHAIN_NAME.ETHEREUM,
  address: XEENUS.address,
  decimals: XEENUS.decimals,
  image:
    'https://raw.githubusercontent.com/MyWishPlatform/etherscan_top_tokens_images/master/fa-empire.png',
  rank: TOKEN_RANK.LOW,
  price: 2
};

const wsatt = {
  name: 'Wsatt',
  symbol: WSATT.symbol,
  blockchain: BLOCKCHAIN_NAME.ETHEREUM,
  address: WSATT.address,
  decimals: WSATT.decimals,
  image:
    'https://raw.githubusercontent.com/MyWishPlatform/etherscan_top_tokens_images/master/fa-empire.png',
  rank: TOKEN_RANK.LOW,
  price: 5
};

const rbc = {
  name: 'Rubic',
  symbol: 'RBC',
  blockchain: BLOCKCHAIN_NAME.ETHEREUM,
  address: '0xc5228008c89dfb03937ff5ff9124f0d7bd2028f9',
  decimals: 18,
  image: 'http://dev-api.rubic.exchange/media/token_images/RBC_logo_new_I8eqPBM.png',
  rank: 6,
  price: 6
};

const bnb = {
  name: 'Binance Coin',
  symbol: 'BNB',
  blockchain: BLOCKCHAIN_NAME.BINANCE_SMART_CHAIN,
  address: '0x0000000000000000000000000000000000000000',
  decimals: 18,
  image: 'http://dev-api.rubic.exchange/media/token_images/cg_logo_bnb_binance-coin-logo.png',
  rank: 1,
  price: 1
};

const wrbc = {
  name: 'Wrapped Rubic',
  symbol: 'WRBC',
  blockchain: BLOCKCHAIN_NAME.BINANCE_SMART_CHAIN,
  address: '0xd51bd30a91f88dcf72acd45c8a1e7ae0066263e8',
  decimals: 18,
  image: 'http://dev-api.rubic.exchange/media/token_images/RBC_logo_new_I8eqPBM.png',
  rank: 2,
  price: 2
};

const matic = {
  name: 'Matic Network',
  symbol: 'MATIC',
  blockchain: BLOCKCHAIN_NAME.POLYGON,
  address: '0x0000000000000000000000000000000000000000',
  decimals: 18,
  image: 'http://dev-api.rubic.exchange/media/token_images/MATIC_logo.png',
  rank: 1,
  price: 1
};

export const coingeckoTestTokens = [eth, weenus, yeenus, xeenus, wsatt, rbc, bnb, wrbc, matic];
