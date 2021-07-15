import { Injectable } from '@angular/core';
import { BlockchainsBridgeProvider } from 'src/app/features/bridge/services/bridge-service/blockchains-bridge-provider/blockchains-bridge-provider';
import { Web3PublicService } from 'src/app/core/services/blockchain/web3-public-service/web3-public.service';
import { TranslateService } from '@ngx-translate/core';
import { TokensService } from 'src/app/core/services/tokens/tokens.service';
import { BridgeTrade } from 'src/app/features/bridge/models/BridgeTrade';
import { forkJoin, from, Observable, of, throwError } from 'rxjs';
import { TransactionReceipt } from 'web3-eth';
import { BridgeToken } from 'src/app/features/bridge/models/BridgeToken';
import { BLOCKCHAIN_NAME } from 'src/app/shared/models/blockchain/BLOCKCHAIN_NAME';
import { List } from 'immutable';
import { map, mergeMap, switchMap, tap, withLatestFrom } from 'rxjs/operators';
import {
  EVO_ABI,
  EVO_ADDRESSES
} from 'src/app/features/bridge/services/bridge-service/blockchains-bridge-provider/binance-polygon-bridge-provider/constants/contract';
import BigNumber from 'bignumber.js';
import {
  EvoContractToken,
  EvoContractTokenInBlockchains
} from 'src/app/features/bridge/services/bridge-service/blockchains-bridge-provider/binance-polygon-bridge-provider/models/EvoContractToken';
import { EvoBridgeToken } from 'src/app/features/bridge/services/bridge-service/blockchains-bridge-provider/binance-polygon-bridge-provider/models/EvoBridgeToken';
import { TokenAmount } from 'src/app/shared/models/tokens/TokenAmount';
import { UndefinedError } from 'src/app/core/errors/models/undefined.error';
import { BRIDGE_PROVIDER } from 'src/app/shared/models/bridge/BRIDGE_PROVIDER';
import { Web3Public } from 'src/app/core/services/blockchain/web3-public-service/Web3Public';
import { AbiItem } from 'web3-utils';
import { EvoResponseToken } from 'src/app/features/bridge/services/bridge-service/blockchains-bridge-provider/binance-polygon-bridge-provider/models/EvoResponseToken';
import { AuthService } from 'src/app/core/services/auth/auth.service';
import { Web3PrivateService } from 'src/app/core/services/blockchain/web3-private-service/web3-private.service';
import { BridgeApiService } from 'src/app/core/services/backend/bridge-api/bridge-api.service';

// Exclude MATIC token because it is not supported by EVO relayer
const EXCLUDED_TOKENS = {
  [BLOCKCHAIN_NAME.BINANCE_SMART_CHAIN]: ['0xcc42724c6683b7e57334c4e856f4c9965ed682bd'],
  [BLOCKCHAIN_NAME.POLYGON]: ['0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270']
};

@Injectable()
export class BinancePolygonBridgeProviderService extends BlockchainsBridgeProvider {
  private evoTokens: EvoContractTokenInBlockchains[];

  constructor(
    private web3PublicService: Web3PublicService,
    private web3PrivateService: Web3PrivateService,
    private readonly translateService: TranslateService,
    private tokensService: TokensService,
    private authService: AuthService,
    private bridgeApiService: BridgeApiService
  ) {
    super();
    this.loadTokens().subscribe(tokens => this.tokens$.next(tokens));
  }

  approve(bridgeTrade: BridgeTrade): Observable<TransactionReceipt> {
    const { token } = bridgeTrade;
    const tokenFrom = token.blockchainToken[bridgeTrade.fromBlockchain];

    return this.needApprove(bridgeTrade).pipe(
      switchMap(needApprove => {
        if (!needApprove) {
          console.error('You should check bridge trade allowance before approve');
          return throwError(new UndefinedError());
        }
        return this.web3PrivateService.approveTokens(
          tokenFrom.address,
          EVO_ADDRESSES[bridgeTrade.fromBlockchain],
          'infinity',
          {
            onTransactionHash: bridgeTrade.onTransactionHash
          }
        );
      })
    );
  }

  getProviderType(): BRIDGE_PROVIDER {
    return BRIDGE_PROVIDER.EVO;
  }

  needApprove(bridgeTrade: BridgeTrade): Observable<boolean> {
    const { token } = bridgeTrade;
    const web3Public: Web3Public = this.web3PublicService[bridgeTrade.fromBlockchain];
    const tokenFrom = token.blockchainToken[bridgeTrade.fromBlockchain];

    if (!this.authService?.user?.address) {
      console.error('Should login before approve');
      return throwError(new UndefinedError());
    }

    return from(
      web3Public.getAllowance(
        tokenFrom.address,
        this.authService.user.address,
        EVO_ADDRESSES[bridgeTrade.fromBlockchain]
      )
    ).pipe(
      map(allowance => bridgeTrade.amount.multipliedBy(10 ** tokenFrom.decimals).gt(allowance))
    );
  }

  createTrade(bridgeTrade: BridgeTrade): Observable<TransactionReceipt> {
    const onTransactionHash = hash => {
      if (typeof bridgeTrade.onTransactionHash === 'function') {
        bridgeTrade.onTransactionHash(hash);
      }
      this.bridgeApiService.postEvoTransaction(hash, bridgeTrade.fromBlockchain);
    };
    const tokenFrom = bridgeTrade.token.blockchainToken[bridgeTrade.fromBlockchain];
    const destination = bridgeTrade.fromBlockchain === BLOCKCHAIN_NAME.BINANCE_SMART_CHAIN ? 1 : 0;

    const evoToken = this.evoTokens.find(
      token => token[bridgeTrade.fromBlockchain].address === tokenFrom.address
    )[bridgeTrade.fromBlockchain];

    return this.checkDailyLimit(bridgeTrade, evoToken).pipe(
      map(notExceeded => {
        if (!notExceeded) {
          return throwError(new UndefinedError());
        }
        return undefined;
      }),
      mergeMap(() =>
        this.web3PrivateService.executeContractMethod(
          EVO_ADDRESSES[bridgeTrade.fromBlockchain],
          EVO_ABI as AbiItem[],
          'create',
          [
            evoToken.index,
            bridgeTrade.amount.multipliedBy(10 ** tokenFrom.decimals),
            destination,
            this.authService.user.address
          ],
          {
            onTransactionHash
          }
        )
      ),
      tap(async receipt => {
        try {
          await this.bridgeApiService.notifyBridgeBot(
            bridgeTrade,
            receipt.transactionHash,
            this.authService.user.address
          );
        } catch (e) {
          console.error(e);
        }
      })
    );
  }

  getFee(
    bridgeToken: BridgeToken,
    toBlockchain: BLOCKCHAIN_NAME,
    amount: BigNumber
  ): Observable<number> {
    const fromBlockchain =
      toBlockchain === BLOCKCHAIN_NAME.BINANCE_SMART_CHAIN
        ? BLOCKCHAIN_NAME.POLYGON
        : BLOCKCHAIN_NAME.BINANCE_SMART_CHAIN;
    const evoToken = this.evoTokens.find(
      token => token[toBlockchain].address === bridgeToken.blockchainToken[toBlockchain].address
    )[fromBlockchain];
    return of(evoToken.feeBase.plus(amount.multipliedBy(evoToken.fee).dividedBy(10000)).toNumber());
  }

  private loadTokens(): Observable<List<EvoBridgeToken>> {
    return from(this.tokensService.tokens).pipe(
      withLatestFrom(this.fetchSupportedTokens()),
      map(([swapTokens, contractTokens]) =>
        List(this.buildBridgeTokens(contractTokens, swapTokens.toArray()))
      )
    );
  }

  private async fetchSupportedTokens(): Promise<EvoContractTokenInBlockchains[]> {
    const blockchains = [BLOCKCHAIN_NAME.BINANCE_SMART_CHAIN, BLOCKCHAIN_NAME.POLYGON];
    const tokensListPromises = blockchains.map(blockchain =>
      this.web3PublicService[blockchain].callContractMethod(
        EVO_ADDRESSES[blockchain],
        EVO_ABI as AbiItem[],
        'listTokensNames'
      )
    );

    const tokensInBlockchains: string[][] = await Promise.all(tokensListPromises);
    if (
      tokensInBlockchains.length !== 2 ||
      tokensInBlockchains[0].length !== tokensInBlockchains[1].length
    ) {
      console.error('Error while loading evo tokens');
      throw new UndefinedError();
    }

    const tokensInfoPromises = blockchains.map(blockchain =>
      (this.web3PublicService[blockchain] as Web3Public).multicallContractMethod<EvoResponseToken>(
        EVO_ADDRESSES[blockchain],
        EVO_ABI as AbiItem[],
        'tokens',
        [...Array(tokensInBlockchains[0].length).keys()].map(number => [number])
      )
    );

    const tokens = await Promise.all(tokensInfoPromises);
    const bscTokens = tokens[0].filter(
      token =>
        !EXCLUDED_TOKENS[BLOCKCHAIN_NAME.BINANCE_SMART_CHAIN].includes(token.token.toLowerCase())
    );
    const polygonTokens = tokens[1].filter(
      token => !EXCLUDED_TOKENS[BLOCKCHAIN_NAME.POLYGON].includes(token.token.toLowerCase())
    );

    this.evoTokens = bscTokens.map((token, index) => ({
      [BLOCKCHAIN_NAME.BINANCE_SMART_CHAIN]: {
        symbol: tokensInBlockchains[0][index],
        address: token.token,
        fee: new BigNumber(token.fee),
        feeBase: new BigNumber(token.feeBase),
        feeTarget: token.feeTarget,
        minAmount: Number(token.minAmount),
        dailyLimit: new BigNumber(token.dailyLimit),
        bonus: Number(token.bonus),
        index
      },
      [BLOCKCHAIN_NAME.POLYGON]: {
        symbol: tokensInBlockchains[1][index],
        address: polygonTokens[index].token,
        fee: new BigNumber(polygonTokens[index].fee),
        feeBase: new BigNumber(polygonTokens[index].feeBase),
        feeTarget: polygonTokens[index].feeTarget,
        minAmount: Number(polygonTokens[index].minAmount),
        dailyLimit: new BigNumber(polygonTokens[index].dailyLimit),
        bonus: Number(polygonTokens[index].bonus),
        index
      }
    }));

    return this.evoTokens;
  }

  private buildBridgeTokens(
    contractTokens: EvoContractTokenInBlockchains[],
    swapTokens: TokenAmount[]
  ): EvoBridgeToken[] {
    const bscSwapTokens = swapTokens.filter(
      token => token.blockchain === BLOCKCHAIN_NAME.BINANCE_SMART_CHAIN
    );
    const polygonSwapTokens = swapTokens.filter(
      token => token.blockchain === BLOCKCHAIN_NAME.POLYGON
    );

    return contractTokens
      .map(contractToken => {
        const bscSwapToken = bscSwapTokens.find(
          item =>
            item.address.toLowerCase() ===
            contractToken[BLOCKCHAIN_NAME.BINANCE_SMART_CHAIN].address.toLowerCase()
        );
        const polygonSwapToken = polygonSwapTokens.find(
          item =>
            item.address.toLowerCase() ===
            contractToken[BLOCKCHAIN_NAME.POLYGON].address.toLowerCase()
        );

        if (!bscSwapToken || !polygonSwapToken) {
          return null;
        }

        return {
          evoInfo: {
            [BLOCKCHAIN_NAME.BINANCE_SMART_CHAIN]: {
              fee: contractToken[BLOCKCHAIN_NAME.BINANCE_SMART_CHAIN].fee,
              feeBase: contractToken[BLOCKCHAIN_NAME.BINANCE_SMART_CHAIN].feeBase,
              dailyLimit: contractToken[BLOCKCHAIN_NAME.BINANCE_SMART_CHAIN].dailyLimit
            },
            [BLOCKCHAIN_NAME.POLYGON]: {
              fee: contractToken[BLOCKCHAIN_NAME.POLYGON].fee,
              feeBase: contractToken[BLOCKCHAIN_NAME.POLYGON].feeBase,
              dailyLimit: contractToken[BLOCKCHAIN_NAME.POLYGON].dailyLimit
            }
          },
          symbol: bscSwapToken.symbol,
          image: bscSwapToken.image,
          rank: bscSwapToken.rank,
          blockchainToken: {
            [BLOCKCHAIN_NAME.BINANCE_SMART_CHAIN]: {
              ...bscSwapToken,
              address: contractToken[BLOCKCHAIN_NAME.BINANCE_SMART_CHAIN].address,
              minAmount:
                contractToken[BLOCKCHAIN_NAME.BINANCE_SMART_CHAIN].minAmount /
                10 ** bscSwapToken.decimals,
              maxAmount: Number(
                contractToken[BLOCKCHAIN_NAME.BINANCE_SMART_CHAIN].dailyLimit
                  .div(10 ** bscSwapToken.decimals)
                  .toFixed(2)
              )
            },
            [BLOCKCHAIN_NAME.POLYGON]: {
              ...polygonSwapToken,
              address: contractToken[BLOCKCHAIN_NAME.POLYGON].address,
              minAmount:
                contractToken[BLOCKCHAIN_NAME.POLYGON].minAmount / 10 ** polygonSwapToken.decimals,
              maxAmount: Number(
                contractToken[BLOCKCHAIN_NAME.POLYGON].dailyLimit
                  .div(10 ** polygonSwapToken.decimals)
                  .toFixed(2)
              )
            }
          }
        };
      })
      .filter(elem => elem);
  }

  private checkDailyLimit(
    bridgeTrade: BridgeTrade,
    evoToken: EvoContractToken
  ): Observable<boolean> {
    const weiAmount = bridgeTrade.amount.multipliedBy(
      10 ** bridgeTrade.token.blockchainToken[bridgeTrade.fromBlockchain].decimals
    );
    const web3Public = this.web3PublicService[bridgeTrade.fromBlockchain] as Web3Public;
    return forkJoin([
      web3Public.callContractMethod(
        EVO_ADDRESSES[bridgeTrade.fromBlockchain],
        EVO_ABI as AbiItem[],
        'stats',
        { methodArguments: [evoToken.index, this.authService.user.address] }
      ),
      web3Public.getBlock()
    ]).pipe(
      map(([[transferred, limitFrom], block]) => {
        const msInDay = new BigNumber(86400000);
        if (new BigNumber(block.timestamp).gte(msInDay.plus(limitFrom))) {
          return true;
        }

        const totalTransferred = weiAmount.plus(transferred);
        return totalTransferred.lte(evoToken.dailyLimit);
      })
    );
  }
}
