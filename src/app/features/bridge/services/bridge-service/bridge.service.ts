import { Injectable } from '@angular/core';
import { BehaviorSubject, defer, Observable, of, throwError, zip } from 'rxjs';
import { List } from 'immutable';
import { BLOCKCHAIN_NAME } from 'src/app/shared/models/blockchain/BLOCKCHAIN_NAME';
import { EthereumBinanceBridgeProviderService } from 'src/app/features/bridge/services/bridge-service/blockchains-bridge-provider/ethereum-binance-bridge-provider/ethereum-binance-bridge-provider.service';
import { EthereumBinanceRubicBridgeProviderService } from 'src/app/features/bridge/services/bridge-service/blockchains-bridge-provider/ethereum-binance-bridge-provider/rubic-bridge-provider/ethereum-binance-rubic-bridge-provider.service';
import { EthereumPolygonBridgeProviderService } from 'src/app/features/bridge/services/bridge-service/blockchains-bridge-provider/ethereum-polygon-bridge-provider/ethereum-polygon-bridge-provider.service';
import { EthereumTronBridgeProviderService } from 'src/app/features/bridge/services/bridge-service/blockchains-bridge-provider/ethereum-tron-bridge-provider/ethereum-tron-bridge-provider.service';
import { EthereumXdaiBridgeProviderService } from 'src/app/features/bridge/services/bridge-service/blockchains-bridge-provider/ethereum-xdai-bridge-provider/ethereum-xdai-bridge-provider.service';
import { BinanceTronBridgeProviderService } from 'src/app/features/bridge/services/bridge-service/blockchains-bridge-provider/binance-tron-bridge-provider/binance-tron-bridge-provider.service';
import { BlockchainsBridgeProvider } from 'src/app/features/bridge/services/bridge-service/blockchains-bridge-provider/blockchains-bridge-provider';
import { BlockchainsBridgeTokens } from 'src/app/features/bridge/models/BlockchainsBridgeTokens';
import { catchError, filter, first, map, mergeMap, switchMap } from 'rxjs/operators';
import BigNumber from 'bignumber.js';
import { TransactionReceipt } from 'web3-eth';
import { Web3Public } from 'src/app/core/services/blockchain/web3-public-service/Web3Public';
import { bridgeTestTokens } from 'src/test/tokens/bridge-tokens';
import { AuthService } from 'src/app/core/services/auth/auth.service';
import { Web3PublicService } from 'src/app/core/services/blockchain/web3-public-service/web3-public.service';
import { WalletError } from 'src/app/core/errors/models/provider/WalletError';
import { AccountError } from 'src/app/core/errors/models/provider/AccountError';
import { NetworkError } from 'src/app/core/errors/models/provider/NetworkError';
import { ProviderConnectorService } from 'src/app/core/services/blockchain/provider-connector/provider-connector.service';
import { UseTestingModeService } from 'src/app/core/services/use-testing-mode/use-testing-mode.service';
import { TokenAmount } from 'src/app/shared/models/tokens/TokenAmount';
import { BridgeApiService } from 'src/app/core/services/backend/bridge-api/bridge-api.service';
import { BridgeTrade } from 'src/app/features/bridge/models/BridgeTrade';
import { TokensService } from 'src/app/core/services/tokens/tokens.service';
import { UndefinedError } from 'src/app/core/errors/models/undefined.error';
import { RubicError } from 'src/app/core/errors/models/RubicError';
import { BinancePolygonBridgeProviderService } from 'src/app/features/bridge/services/bridge-service/blockchains-bridge-provider/binance-polygon-bridge-provider/binance-polygon-bridge-provider.service';
import { SwapFormService } from '../../../swaps/services/swaps-form-service/swap-form.service';
import { BridgeToken } from '../../models/BridgeToken';
import { BridgeTradeRequest } from '../../models/BridgeTradeRequest';
import InsufficientFundsError from '../../../../core/errors/models/instant-trade/InsufficientFundsError';

@Injectable()
export class BridgeService {
  private blockchainsProviders;

  private tokens$ = new BehaviorSubject<BlockchainsBridgeTokens[]>([]);

  public get tokens(): Observable<BlockchainsBridgeTokens[]> {
    return this.tokens$.asObservable();
  }

  private bridgeProvider: BlockchainsBridgeProvider;

  private _backendTokens: List<TokenAmount>;

  constructor(
    private readonly ethereumBinanceBridgeProviderService: EthereumBinanceBridgeProviderService,
    private readonly rubicBridgeProviderService: EthereumBinanceRubicBridgeProviderService,
    private readonly ethereumPolygonBridgeProviderService: EthereumPolygonBridgeProviderService,
    private readonly ethereumTronBridgeProviderService: EthereumTronBridgeProviderService,
    private readonly ethereumXdaiBridgeProviderService: EthereumXdaiBridgeProviderService,
    private readonly binanceTronBridgeProviderService: BinanceTronBridgeProviderService,
    private readonly binancePolygonProviderService: BinancePolygonBridgeProviderService,
    private readonly authService: AuthService,
    private readonly web3PublicService: Web3PublicService,
    private readonly providerConnectorService: ProviderConnectorService,
    private readonly useTestingModeService: UseTestingModeService,
    private readonly bridgeApiService: BridgeApiService,
    private readonly tokensService: TokensService,
    private readonly swapFormService: SwapFormService
  ) {
    this.setupBlockchainsProviders();
    this.setTokens();
    tokensService.tokens.subscribe(tokens => {
      this._backendTokens = tokens;
    });

    this.subscribeToFormChanges();

    this.useTestingModeService.isTestingMode.subscribe(isTestingMode => {
      if (isTestingMode) {
        this.tokens$.next(bridgeTestTokens);
      }
    });
  }

  private setupBlockchainsProviders(): void {
    this.blockchainsProviders = {
      [BLOCKCHAIN_NAME.ETHEREUM]: {
        [BLOCKCHAIN_NAME.BINANCE_SMART_CHAIN]: this.ethereumBinanceBridgeProviderService,
        [BLOCKCHAIN_NAME.POLYGON]: this.ethereumPolygonBridgeProviderService,
        [BLOCKCHAIN_NAME.TRON]: this.ethereumTronBridgeProviderService,
        [BLOCKCHAIN_NAME.XDAI]: this.ethereumXdaiBridgeProviderService
      },
      [BLOCKCHAIN_NAME.BINANCE_SMART_CHAIN]: {
        [BLOCKCHAIN_NAME.ETHEREUM]: this.ethereumBinanceBridgeProviderService,
        [BLOCKCHAIN_NAME.POLYGON]: this.binancePolygonProviderService,
        [BLOCKCHAIN_NAME.TRON]: this.binanceTronBridgeProviderService
      },
      [BLOCKCHAIN_NAME.POLYGON]: {
        [BLOCKCHAIN_NAME.ETHEREUM]: this.ethereumPolygonBridgeProviderService,
        [BLOCKCHAIN_NAME.BINANCE_SMART_CHAIN]: this.binancePolygonProviderService
      }
    };
  }

  private subscribeToFormChanges(): void {
    this.swapFormService.commonTrade.controls.input.valueChanges.subscribe(formData => {
      this.bridgeProvider =
        this.blockchainsProviders[formData.fromBlockchain]?.[formData.toBlockchain];
    });
  }

  private setTokens(): void {
    const tokensObservables: Observable<BlockchainsBridgeTokens>[] = [];

    Object.values(BLOCKCHAIN_NAME).forEach(fromBlockchain => {
      Object.values(BLOCKCHAIN_NAME).forEach(toBlockchain => {
        if (fromBlockchain.includes('_TESTNET') || toBlockchain.includes('_TESTNET')) {
          return;
        }

        const provider: BlockchainsBridgeProvider =
          this.blockchainsProviders[fromBlockchain]?.[toBlockchain];

        if (provider) {
          tokensObservables.push(
            provider.tokens.pipe(
              map(bridgeTokens => ({
                fromBlockchain,
                toBlockchain,
                bridgeTokens
              }))
            )
          );
        }
      });
    });

    zip(...tokensObservables)
      .pipe(first())
      .subscribe(tokens => this.tokens$.next(tokens));
  }

  public isBridgeSupported(): boolean {
    return !!this.bridgeProvider;
  }

  public getFee(): Observable<number | null> {
    if (!this.bridgeProvider) {
      return of(null);
    }

    return this.getCurrentBridgeToken().pipe(
      mergeMap(bridgeToken => {
        const { toBlockchain, fromAmount } = this.swapFormService.commonTrade.controls.input.value;

        if (!bridgeToken || !fromAmount) {
          return of(null);
        }

        return this.bridgeProvider.getFee(bridgeToken, toBlockchain, fromAmount);
      }),
      first()
    );
  }

  public getCurrentBridgeToken(): Observable<BridgeToken> {
    return this.tokens.pipe(
      filter(tokens => !!tokens.length),
      map(tokens => {
        const { fromBlockchain, toBlockchain, fromToken, toToken } =
          this.swapFormService.commonTrade.controls.input.value;
        const bridgeTokensList = tokens.find(
          item => item.fromBlockchain === fromBlockchain && item.toBlockchain === toBlockchain
        );

        const bridgeToken = bridgeTokensList.bridgeTokens?.find(
          item =>
            item.blockchainToken[fromBlockchain].address.toLowerCase() ===
              fromToken.address.toLowerCase() &&
            item.blockchainToken[toBlockchain].address.toLowerCase() ===
              toToken.address.toLowerCase()
        );

        if (!bridgeToken) {
          return null;
        }

        return bridgeToken;
      })
    );
  }

  private getBridgeTrade(bridgeTradeRequest?: BridgeTradeRequest): Observable<BridgeTrade> {
    const { fromBlockchain, toBlockchain, fromAmount } =
      this.swapFormService.commonTrade.controls.input.value;

    return this.getCurrentBridgeToken().pipe(
      map(bridgeToken => ({
        fromBlockchain,
        toBlockchain,
        token: bridgeToken,
        amount: fromAmount,
        toAddress: bridgeTradeRequest?.toAddress || this.authService.user.address,
        onTransactionHash: bridgeTradeRequest?.onTransactionHash || (() => {})
      }))
    );
  }

  public createTrade(bridgeTradeRequest: BridgeTradeRequest): Observable<TransactionReceipt> {
    return defer(() =>
      this.getBridgeTrade(bridgeTradeRequest).pipe(
        mergeMap(async (bridgeTrade: BridgeTrade) => {
          this.checkSettings(bridgeTrade.fromBlockchain);
          const token = bridgeTrade.token.blockchainToken[bridgeTrade.fromBlockchain];
          await this.checkBalance(
            bridgeTrade.fromBlockchain,
            token.address,
            token.symbol,
            token.decimals,
            bridgeTrade.amount
          );
          return bridgeTrade;
        }),
        mergeMap((bridgeTrade: BridgeTrade) => {
          return this.bridgeProvider.createTrade(bridgeTrade).pipe(
            catchError(err => {
              console.debug(err);
              const error = err instanceof RubicError ? err : new UndefinedError();
              return throwError(error);
            })
          );
        })
      )
    );
  }

  public needApprove(): Observable<boolean> {
    return this.getBridgeTrade().pipe(
      switchMap(bridgeTrade =>
        this.bridgeProvider.needApprove(bridgeTrade).pipe(
          catchError(err => {
            console.error(err);
            const error = err instanceof RubicError ? err : new UndefinedError();
            return throwError(error);
          })
        )
      ),
      first()
    );
  }

  public approve(bridgeTradeRequest: BridgeTradeRequest): Observable<TransactionReceipt> {
    return this.getBridgeTrade(bridgeTradeRequest).pipe(
      mergeMap(async (bridgeTrade: BridgeTrade) => {
        this.checkSettings(bridgeTrade.fromBlockchain);
        const token = bridgeTrade.token.blockchainToken[bridgeTrade.fromBlockchain];
        await this.checkBalance(
          bridgeTrade.fromBlockchain,
          token.address,
          token.symbol,
          token.decimals,
          bridgeTrade.amount
        );
        return bridgeTrade;
      }),
      mergeMap((bridgeTrade: BridgeTrade) => {
        return this.bridgeProvider.approve(bridgeTrade).pipe(
          catchError(err => {
            console.debug(err);
            const error = err instanceof RubicError ? err : new UndefinedError();
            return throwError(error);
          })
        );
      })
    );
  }

  private async checkBalance(
    fromBlockchain: BLOCKCHAIN_NAME,
    tokenAddress: string,
    symbol: string,
    decimals: number,
    amount: BigNumber
  ): Promise<void> {
    const web3Public: Web3Public = this.web3PublicService[fromBlockchain];

    let balance;
    if (web3Public.isNativeAddress(tokenAddress)) {
      balance = await web3Public.getBalance(this.authService.user.address, {
        inWei: true
      });
    } else {
      balance = await web3Public.getTokenBalance(this.authService.user.address, tokenAddress);
    }

    const amountInWei = amount.multipliedBy(10 ** decimals);
    if (balance.lt(amountInWei)) {
      const formattedTokensBalance = balance.div(10 ** decimals).toString();
      throw new InsufficientFundsError(symbol, formattedTokensBalance, amount.toFixed());
    }
  }

  private checkSettings(blockchain: BLOCKCHAIN_NAME): void {
    if (!this.providerConnectorService.isProviderActive) {
      throw new WalletError();
    }

    if (!this.providerConnectorService.address) {
      throw new AccountError();
    }

    if (
      this.providerConnectorService.network?.name !== blockchain &&
      (!this.useTestingModeService.isTestingMode.getValue() ||
        this.providerConnectorService.network?.name !== `${blockchain}_TESTNET`)
    ) {
      throw new NetworkError(blockchain);
    }
  }
}
