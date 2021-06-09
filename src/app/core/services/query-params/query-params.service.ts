import { AsyncPipe, DOCUMENT } from '@angular/common';
import { ChangeDetectorRef, Inject, Injectable } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { List } from 'immutable';
import { BehaviorSubject, Observable } from 'rxjs';
import { BLOCKCHAIN_NAME } from 'src/app/shared/models/blockchain/BLOCKCHAIN_NAME';
import SwapToken from 'src/app/shared/models/tokens/SwapToken';
import { BridgeToken } from 'src/app/features/cross-chain-swaps-page/bridge-page/models/BridgeToken';
import { skip, take } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';
import { TokensService } from '../backend/tokens-service/tokens.service';
import { Web3PublicService } from '../blockchain/web3-public-service/web3-public.service';
import { Web3Public } from '../blockchain/web3-public-service/Web3Public';
import { TradeParametersService } from '../swaps/trade-parameters-service/trade-parameters.service';
import { TradeTypeService } from '../swaps/trade-type-service/trade-type.service';
import { QueryParams } from './models/query-params';
import { TOKEN_RANK } from '../../../shared/models/tokens/token-rank';
import { languagesList } from '../../header/models/languages-list';

type DefaultQueryParams = {
  [BLOCKCHAIN_NAME.ETHEREUM]: QueryParams;
  [BLOCKCHAIN_NAME.BINANCE_SMART_CHAIN]: QueryParams;
  [BLOCKCHAIN_NAME.POLYGON]: QueryParams;
  bridge: QueryParams;
  cryptoTap: QueryParams;
};

@Injectable({
  providedIn: 'root'
})
export class QueryParamsService {
  private readonly $isIframeSubject: BehaviorSubject<boolean>;

  public currentQueryParams: QueryParams;

  public defaultQueryParams: DefaultQueryParams;

  private readonly $tokens: Observable<List<SwapToken>>;

  private readonly $hiddenNetworksSubject: BehaviorSubject<string[]>;

  private readonly $tokensSelectionDisabledSubject: BehaviorSubject<boolean>;

  private readonly $themeSubject: BehaviorSubject<string>;

  public get $isIframe(): Observable<boolean> {
    return this.$isIframeSubject.asObservable();
  }

  public get $theme(): Observable<string> {
    return this.$themeSubject.asObservable();
  }

  public get $hiddenNetworks(): Observable<string[]> {
    return this.$hiddenNetworksSubject.asObservable();
  }

  public get $tokensSelectionDisabled(): Observable<boolean> {
    return this.$tokensSelectionDisabledSubject.asObservable();
  }

  constructor(
    private readonly tradeParametersService: TradeParametersService,
    private readonly tokensService: TokensService,
    private readonly tradeTypeService: TradeTypeService,
    private readonly web3Public: Web3PublicService,
    @Inject(DOCUMENT) private document: Document,
    private readonly router: Router,
    private readonly aRoute: ActivatedRoute,
    private translateService: TranslateService
  ) {
    this.$themeSubject = new BehaviorSubject<string>('default');
    this.$isIframeSubject = new BehaviorSubject<boolean>(false);
    this.$tokensSelectionDisabledSubject = new BehaviorSubject<boolean>(false);
    this.$hiddenNetworksSubject = new BehaviorSubject<string[]>([]);
    this.$tokens = this.tokensService.tokens.asObservable();
    this.defaultQueryParams = {
      [BLOCKCHAIN_NAME.ETHEREUM]: {
        from: 'ETH',
        to: 'RBC',
        amount: '1'
      },
      [BLOCKCHAIN_NAME.BINANCE_SMART_CHAIN]: {
        from: 'BNB',
        to: 'BRBC',
        amount: '1'
      },
      [BLOCKCHAIN_NAME.POLYGON]: {
        from: 'MATIC',
        to: 'USDT',
        amount: '1'
      },
      bridge: {
        fromBlockchain: BLOCKCHAIN_NAME.ETHEREUM,
        toBlockchain: BLOCKCHAIN_NAME.BINANCE_SMART_CHAIN
      },
      cryptoTap: {
        toBlockchain: BLOCKCHAIN_NAME.BINANCE_SMART_CHAIN,
        fromToken: 'RBC'
      }
    };
  }

  private static isHEXColor(color: string): boolean {
    return /^[A-F0-9]+$/i.test(color);
  }

  public initiateTradesParams(params: QueryParams): void {
    this.currentQueryParams = this.setDefaultParams(params);
  }

  public async setupTradeForm(cdr: ChangeDetectorRef): Promise<void> {
    const queryChain = this.currentQueryParams?.chain as BLOCKCHAIN_NAME;
    const chain = Object.values(BLOCKCHAIN_NAME).includes(queryChain)
      ? queryChain
      : BLOCKCHAIN_NAME.ETHEREUM;

    const tradeParams = {
      fromToken: (this.currentQueryParams.from && (await this.getToken('from', cdr))) || undefined,
      toToken: (this.currentQueryParams.to && (await this.getToken('to', cdr))) || undefined,
      fromAmount:
        this.currentQueryParams.amount ||
        this.tradeParametersService.getTradeParameters(chain).fromAmount,
      toAmount: this.tradeParametersService.getTradeParameters(chain).toAmount,
      isCustomFromTokenFormOpened: false,
      isCustomToTokenFormOpened: false,
      customFromTokenAddress:
        this.currentQueryParams.from && this.isAddress(this.currentQueryParams.from)
          ? this.currentQueryParams.from
          : undefined,
      customToTokenAddress:
        this.currentQueryParams.to && this.isAddress(this.currentQueryParams.to)
          ? this.currentQueryParams.to
          : undefined
    };
    this.tradeParametersService.setTradeParameters(chain, tradeParams);
    this.tradeTypeService.setBlockchain(chain);
  }

  public initiateBridgeParams(params: QueryParams): void {
    this.currentQueryParams = {
      fromBlockchain: params.fromBlockchain || this.defaultQueryParams.bridge.fromBlockchain,
      toBlockchain: params.toBlockchain || this.defaultQueryParams.bridge.toBlockchain
    };
  }

  public initiateCryptoTapParams(params: QueryParams): void {
    this.currentQueryParams = {
      toBlockchain: params.toBlockchain || this.defaultQueryParams.cryptoTap.fromBlockchain,
      fromToken: params.fromToken || this.defaultQueryParams.cryptoTap.fromToken
    };
  }

  private async getToken(
    tokenType: 'from' | 'to' | 'fromToken',
    cdr: ChangeDetectorRef
  ): Promise<SwapToken | undefined> {
    const tokenInfo = this.currentQueryParams[tokenType];
    return !this.isAddress(tokenInfo)
      ? this.searchTokenBySymbol(tokenInfo, cdr)
      : this.searchTokenByAddress(tokenInfo, cdr);
  }

  public setupQueryParams(queryParams: QueryParams): void {
    if (queryParams) {
      if (queryParams.iframe === 'true') {
        this.$isIframeSubject.next(true);
        this.document.body.classList.add('iframe');
        if (queryParams.hidden) {
          this.$hiddenNetworksSubject.next(queryParams.hidden.split(','));
        }
        const hasTopTokens = Object.values(BLOCKCHAIN_NAME).some(
          blockchain => `topTokens[${blockchain}]` in queryParams
        );
        if (hasTopTokens) {
          const topTokens = Object.entries(queryParams).reduce(
            (
              acc: { [k in keyof Record<BLOCKCHAIN_NAME, string>]?: string[] },
              curr: [string, string]
            ) => {
              const [key, value] = curr;
              const newKey = key.substring('keyTokens'.length + 1, key.length - 1);
              return key.includes('topTokens') ? { ...acc, [newKey]: value.split(',') } : acc;
            },
            {}
          );
          this.tokensService.tokens.pipe(skip(1), take(1)).subscribe(tokens => {
            const rankedTokens = tokens.map((token: SwapToken) => {
              const currentBlockchainTop = topTokens[token.blockchain];
              const isTop =
                currentBlockchainTop?.length > 0 &&
                currentBlockchainTop.some(topToken => {
                  return topToken === token.symbol;
                });
              return isTop
                ? {
                    ...token,
                    rank: TOKEN_RANK.TOP
                  }
                : token;
            });
            this.tokensService.tokens.next(rankedTokens);
          });
        }
        if (queryParams.background) {
          const color = queryParams.background;
          this.document.body.style.background = QueryParamsService.isHEXColor(color)
            ? `#${color}`
            : color;
        }
        if (queryParams.hideSelection) {
          this.$tokensSelectionDisabledSubject.next(queryParams.hideSelection === 'true');
        }
        if (queryParams.theme && queryParams.theme === 'dark') {
          this.$themeSubject.next('dark');
          this.document.body.classList.add('dark');
        }
      } else {
        this.$isIframeSubject.next(false);
      }
      const route = this.router.url.split('?')[0].substr(1);
      const hasParams = Object.keys(queryParams).length !== 0;
      if (hasParams && route === '') {
        this.initiateTradesParams(queryParams);
      } else if (hasParams && route === 'cross-chain/bridge') {
        this.initiateBridgeParams(queryParams);
      } else if (hasParams && route === 'cross-chain/crypto-tap') {
        this.initiateCryptoTapParams(queryParams);
      }
    }
  }

  public isAddress(token: string): boolean {
    const chain = this.currentQueryParams.chain || this.currentQueryParams.fromBlockchain;
    const web3Public: Web3Public = this.web3Public[chain];
    return web3Public.isAddressCorrect(token);
  }

  public setQueryParam(key: keyof QueryParams, value: any): void {
    if (this.currentQueryParams && value) {
      this.currentQueryParams[key] = value;
      this.navigate();
    }
  }

  public removeQueryParam(key: keyof QueryParams): void {
    this.currentQueryParams[key] = undefined;
    this.navigate();
  }

  public searchTokenBySymbol(
    queryParam: string,
    cdr: ChangeDetectorRef,
    tokensList?: List<any>,
    isBridge?: boolean
  ): SwapToken {
    const tokens = tokensList || new AsyncPipe(cdr).transform(this.$tokens);
    const similarTokens = tokens.filter(token => {
      return isBridge
        ? (token as BridgeToken).blockchainToken[this.currentQueryParams.fromBlockchain].symbol ===
            queryParam
        : (token as SwapToken).symbol === queryParam &&
            token.blockchain === this.currentQueryParams.chain;
    });

    return similarTokens.size > 1
      ? similarTokens.find(token => token.used_in_iframe)
      : similarTokens.first();
  }

  public searchTokenByAddress(
    queryParam: string,
    cdr: ChangeDetectorRef,
    tokensList?: List<any>,
    isBridge?: boolean
  ): SwapToken {
    const tokens = tokensList || new AsyncPipe(cdr).transform(this.$tokens);
    const searchingToken = tokens.find(token =>
      isBridge
        ? (token as BridgeToken).blockchainToken[this.currentQueryParams.fromBlockchain].address ===
          queryParam
        : token.address === queryParam && token.blockchain === this.currentQueryParams.chain
    );

    return searchingToken;
  }

  public async getCustomToken(address: string): Promise<SwapToken> {
    let customToken = null;
    try {
      customToken = await this.web3Public[this.currentQueryParams.chain].getTokenInfo(address);
      customToken = {
        blockchain: undefined,
        image: undefined,
        rank: undefined,
        price: undefined,
        used_in_iframe: undefined,
        ...customToken
      };
    } catch (e) {
      console.error(e);
    }
    return customToken;
  }

  private navigate(): void {
    this.router.navigate([], {
      queryParams: this.currentQueryParams,
      queryParamsHandling: 'merge',
      relativeTo: this.aRoute
    });
  }

  private setDefaultParams(queryParams: QueryParams): QueryParams {
    const chain = Object.values(BLOCKCHAIN_NAME).includes(queryParams?.chain as BLOCKCHAIN_NAME)
      ? queryParams.chain
      : BLOCKCHAIN_NAME.ETHEREUM;
    return queryParams.from || queryParams.to
      ? {
          ...queryParams,
          from: queryParams.from || this.defaultQueryParams[chain].from,
          to: queryParams.to || this.defaultQueryParams[chain].to,
          amount: queryParams.amount || this.defaultQueryParams[chain].amount,
          chain
        }
      : {
          ...queryParams,
          chain
        };
  }

  public clearTradesParams() {
    this.currentQueryParams = {
      ...this.currentQueryParams,
      from: null,
      to: null,
      amount: null,
      chain: null
    };
    this.navigate();
  }

  public clearBridgeParams() {
    this.currentQueryParams = {
      ...this.currentQueryParams,
      fromBlockchain: null,
      toBlockchain: null,
      fromToken: null,
      amount: null
    };
    this.navigate();
  }

  public swapDefaultParams() {
    [
      this.defaultQueryParams[BLOCKCHAIN_NAME.BINANCE_SMART_CHAIN].from,
      this.defaultQueryParams[BLOCKCHAIN_NAME.BINANCE_SMART_CHAIN].to
    ] = [
      this.defaultQueryParams[BLOCKCHAIN_NAME.BINANCE_SMART_CHAIN].to,
      this.defaultQueryParams[BLOCKCHAIN_NAME.BINANCE_SMART_CHAIN].from
    ];
    [
      this.defaultQueryParams[BLOCKCHAIN_NAME.ETHEREUM].from,
      this.defaultQueryParams[BLOCKCHAIN_NAME.ETHEREUM].to
    ] = [
      this.defaultQueryParams[BLOCKCHAIN_NAME.ETHEREUM].to,
      this.defaultQueryParams[BLOCKCHAIN_NAME.ETHEREUM].from
    ];
  }
}
