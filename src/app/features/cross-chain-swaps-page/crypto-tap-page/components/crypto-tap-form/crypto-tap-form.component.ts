import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { List } from 'immutable';
import { Subscription } from 'rxjs';
import { BLOCKCHAINS } from 'src/app/features/cross-chain-swaps-page/common/constants/BLOCKCHAINS';
import { TokensService } from 'src/app/core/services/backend/tokens-service/tokens.service';
import { BLOCKCHAIN_NAME } from 'src/app/shared/models/blockchain/BLOCKCHAIN_NAME';
import { NATIVE_TOKEN_ADDRESS } from 'src/app/shared/constants/blockchain/NATIVE_TOKEN_ADDRESS';
import SwapToken from 'src/app/shared/models/tokens/SwapToken';
import InputToken from 'src/app/shared/models/tokens/InputToken';
import ADDRESS_TYPE from 'src/app/shared/models/blockchain/ADDRESS_TYPE';
import { CryptoTapService } from 'src/app/features/cross-chain-swaps-page/crypto-tap-page/services/crypto-tap-service/crypto-tap.service';
import {
  CRYPTO_TAP_TRADE_STATUS,
  CryptoTapToken,
  CryptoTapTrade
} from 'src/app/features/cross-chain-swaps-page/crypto-tap-page/models/CryptoTapTrade';
import { UseTestingModeService } from 'src/app/core/services/use-testing-mode/use-testing-mode.service';
import { coingeckoTestTokens } from 'src/test/tokens/coingecko-tokens';
import { MatDialog } from '@angular/material/dialog';
import { ErrorsService } from 'src/app/core/services/errors/errors.service';
import BigNumber from 'bignumber.js';
import { Web3PublicService } from 'src/app/core/services/blockchain/web3-public-service/web3-public.service';
import { BridgeBlockchain } from 'src/app/features/cross-chain-swaps-page/bridge-page/models/BridgeBlockchain';
import { ProviderConnectorService } from 'src/app/core/services/blockchain/provider-connector/provider-connector.service';
import { BLOCKCHAINS_DATA } from 'src/app/features/cross-chain-swaps-page/common/constants/BLOCKCHAINS_DATA';
import { QueryParamsService } from 'src/app/core/services/query-params/query-params.service';

interface ToTokens {
  [BLOCKCHAIN_NAME.BINANCE_SMART_CHAIN]: SwapToken;
  [BLOCKCHAIN_NAME.POLYGON]: SwapToken;
}

type CryptoTapBlockchainTokens = {
  [key: string]: CryptoTapToken;
};

type CryptoTapTokens = {
  [BLOCKCHAIN_NAME.BINANCE_SMART_CHAIN]: CryptoTapBlockchainTokens;
  [BLOCKCHAIN_NAME.POLYGON]: CryptoTapBlockchainTokens;
};

@Component({
  selector: 'app-crypto-tap-form',
  templateUrl: './crypto-tap-form.component.html',
  styleUrls: ['./crypto-tap-form.component.scss']
})
export class CryptoTapFormComponent implements OnInit, OnDestroy {
  private readonly RBC_ETHEREUM_ADDRESS = '0xa4eed63db85311e22df4473f87ccfc3dadcfa3e3';

  private readonly RBC_KOVAN_ADDRESS = '0xc5228008c89dfb03937ff5ff9124f0d7bd2028f9';

  public BLOCKCHAIN_NAME = BLOCKCHAIN_NAME;

  public ADDRESS_TYPE = ADDRESS_TYPE;

  public CRYPTO_TAP_TRADE_STATUS = CRYPTO_TAP_TRADE_STATUS;

  public BLOCKCHAINS_DATA = BLOCKCHAINS_DATA;

  public blockchainsList = Object.values(BLOCKCHAINS);

  public fromBlockchain = BLOCKCHAINS[BLOCKCHAIN_NAME.ETHEREUM];

  public toBlockchainsList = [
    BLOCKCHAINS[BLOCKCHAIN_NAME.BINANCE_SMART_CHAIN],
    BLOCKCHAINS[BLOCKCHAIN_NAME.POLYGON]
  ];

  public toBlockchain = BLOCKCHAINS[BLOCKCHAIN_NAME.BINANCE_SMART_CHAIN];

  public cryptoTapTrade = {} as CryptoTapTrade;

  public cryptoTapTokens: CryptoTapTokens = {
    [BLOCKCHAIN_NAME.BINANCE_SMART_CHAIN]: {},
    [BLOCKCHAIN_NAME.POLYGON]: {}
  } as CryptoTapTokens;

  public tradeSuccessId: string;

  public fromTokensList: List<SwapToken>;

  public toTokens = {} as ToTokens;

  private _tokensSubscription$: Subscription;

  public walletAddress: string;

  private _walletAddressSubscription$: Subscription;

  private isTestingMode: boolean;

  private isFirstTokensEmit = true;

  constructor(
    private tokensService: TokensService,
    private web3PublicService: Web3PublicService,
    private cryptoTapService: CryptoTapService,
    private dialog: MatDialog,
    private errorsService: ErrorsService,
    private providerConnectorService: ProviderConnectorService,
    useTestingModeService: UseTestingModeService,
    private queryParamsService: QueryParamsService,
    private readonly cdr: ChangeDetectorRef
  ) {
    useTestingModeService.isTestingMode.subscribe(isTestingMode => {
      this.isTestingMode = isTestingMode;
      if (isTestingMode) {
        this.setTokens(List(coingeckoTestTokens));
      }
    });
  }

  ngOnInit() {
    this._tokensSubscription$ = this.tokensService.tokens.subscribe(tokens => {
      this.setTokens(tokens);
      this.initializeForm();
    });

    this._walletAddressSubscription$ = this.providerConnectorService.$addressChange.subscribe(
      address => {
        this.walletAddress = address;
      }
    );
  }

  ngOnDestroy() {
    this._tokensSubscription$.unsubscribe();
    this._walletAddressSubscription$.unsubscribe();
  }

  private initializeForm(): void {
    if (!this.queryParamsService.currentQueryParams) {
      this.queryParamsService.initiateCryptoTapParams({});
    }

    if (!this.queryParamsService.currentQueryParams?.toBlockchain) {
      this.queryParamsService.setQueryParam('toBlockchain', this.toBlockchain.key);
    } else {
      const fromBlockchain = this.toBlockchainsList.find(blockchain => {
        return blockchain.key === this.queryParamsService.currentQueryParams?.toBlockchain;
      });
      this.toBlockchain = fromBlockchain || this.toBlockchainsList[0];
      this.queryParamsService.setQueryParam(
        'toBlockchain',
        fromBlockchain?.key || this.toBlockchainsList[0].key
      );
    }

    if (this.queryParamsService.currentQueryParams?.fromToken && this.fromTokensList.size > 0) {
      const fromToken = this.fromTokensList.find(
        token => token.symbol === this.queryParamsService.currentQueryParams.fromToken
      );
      this.onFromTokenChanges(fromToken);
    }
  }

  private setTokens(tokens: List<SwapToken>): void {
    this.fromTokensList = tokens.filter(
      token =>
        token.blockchain === BLOCKCHAIN_NAME.ETHEREUM &&
        (token.address === NATIVE_TOKEN_ADDRESS ||
          token.address === this.RBC_ETHEREUM_ADDRESS ||
          (this.isTestingMode && token.address === this.RBC_KOVAN_ADDRESS))
    );

    this.toTokens = {
      [BLOCKCHAIN_NAME.BINANCE_SMART_CHAIN]: this.findNativeToken(
        BLOCKCHAIN_NAME.BINANCE_SMART_CHAIN,
        tokens
      ),
      [BLOCKCHAIN_NAME.POLYGON]: this.findNativeToken(BLOCKCHAIN_NAME.POLYGON, tokens)
    };
    this.cryptoTapTrade.toToken = this.toTokens[this.toBlockchain.key];

    this.setCryptoTapTokens();
  }

  private findNativeToken(blockchain: BLOCKCHAIN_NAME, tokens: List<SwapToken>): SwapToken {
    return tokens.find(
      token =>
        token.blockchain === blockchain &&
        this.web3PublicService[blockchain].isNativeAddress(token.address)
    );
  }

  private setCryptoTapTokens() {
    if (!this.fromTokensList.size) {
      return;
    }

    const { toToken } = this.cryptoTapTrade;
    const toBlockchain = this.toBlockchain.key;
    this.cryptoTapTrade.status = CRYPTO_TAP_TRADE_STATUS.CALCULATION;
    this.fromTokensList.forEach((fromToken, index) => {
      this.cryptoTapTokens[toBlockchain][fromToken.symbol] = {
        ...fromToken,
        fromAmount: '',
        toAmount: '',
        fee: ''
      };
      if (this.cryptoTapTrade.fromToken?.symbol === fromToken.symbol) {
        this.cryptoTapTrade.fromToken = this.cryptoTapTokens[toBlockchain][fromToken.symbol];
      }

      this.cryptoTapService.getEstimatedAmount(fromToken, toToken).subscribe(
        cryptoTapToken => {
          if (this.toBlockchain.key === toBlockchain) {
            this.cryptoTapTokens[toBlockchain][fromToken.symbol] = cryptoTapToken;
            if (this.cryptoTapTrade.fromToken?.symbol === fromToken.symbol) {
              this.cryptoTapTrade.fromToken = cryptoTapToken;
            }
          }
        },
        err => {
          this.errorsService.showErrorDialog(err);
        },
        () => {
          if (index === this.fromTokensList.size - 1 && this.toBlockchain.key === toBlockchain) {
            this.cryptoTapTrade.status = CRYPTO_TAP_TRADE_STATUS.WAITING;
          }
        }
      );
    });
  }

  public onFromTokenChanges(inputToken: InputToken | null): void {
    if (inputToken) {
      this.cryptoTapTrade.fromToken =
        this.cryptoTapTokens[this.toBlockchain.key][inputToken.symbol];
      this.queryParamsService.setQueryParam('fromToken', inputToken?.symbol);
    } else {
      this.cryptoTapTrade = {
        ...this.cryptoTapTrade,
        fromToken: this.cryptoTapTokens[this.toBlockchain.key]['RBC']
      };
      this.queryParamsService.setQueryParam('fromToken', 'RBC');
    }
  }

  public onToBlockchainChanges(blockchain: BridgeBlockchain): void {
    this.toBlockchain = blockchain;
    this.cryptoTapTrade.toToken = this.toTokens[this.toBlockchain.key];
    this.setCryptoTapTokens();
    this.queryParamsService.setQueryParam('toBlockchain', blockchain.key);
  }

  public getFeePrice(amount: string, price: number): BigNumber {
    return new BigNumber(amount).multipliedBy(price);
  }

  public getFeesDifferencePercent(): BigNumber {
    const ethToken = this.cryptoTapTokens[this.toBlockchain.key].ETH;
    const rbcToken = this.cryptoTapTokens[this.toBlockchain.key].RBC;
    if (ethToken?.fee && rbcToken?.fee) {
      const ethFee = this.getFeePrice(ethToken.fee, ethToken.price);
      const rbcFee = this.getFeePrice(rbcToken.fee, rbcToken.price);
      return ethFee.minus(rbcFee).div(ethFee).multipliedBy(100);
    }
    return undefined;
  }

  public switchToRbc(): void {
    this.cryptoTapTrade.fromToken = this.cryptoTapTokens[this.toBlockchain.key].RBC;
  }

  public createTrade(): void {
    this.cryptoTapTrade.status = CRYPTO_TAP_TRADE_STATUS.CALCULATION;
    this.cryptoTapService
      .createTrade(this.cryptoTapTrade, () => {
        this.cryptoTapTrade.status = CRYPTO_TAP_TRADE_STATUS.TX_IN_PROGRESS;
      })
      .then(receipt => {
        this.cryptoTapTrade.status = CRYPTO_TAP_TRADE_STATUS.COMPLETED;
        this.tradeSuccessId = receipt.transactionHash;
      })
      .catch(err => {
        this.cryptoTapTrade.status = CRYPTO_TAP_TRADE_STATUS.WAITING;
        this.errorsService.showErrorDialog(err);
      });
  }
}
